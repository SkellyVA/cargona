import { MongoClient } from 'mongodb';
import { store } from '../store.js';
import { Customer, Package, Trip } from '@cargona/types';
import { analyzeCollection, CollectionAnalysis } from './schemaDetector.js';
import {
  normalizeStatus,
  normalizeDate,
  normalizePhone,
  normalizeCargoCode,
  normalizeTrackingNumber,
} from './smartNormalizer.js';

export interface MigrationSource {
  type: 'mongo' | 'json';
  mongoUri?: string;
  dbName?: string;
  jsonCollections?: Record<string, Record<string, any>[]>;
}

export interface MigrationOptions {
  tenantSlug: string;
  dryRun?: boolean;
  defaultBranchId?: string;
  defaultWeightKg?: number;
  costPerKgUSD?: number;
}

export interface MigrationResult {
  success: boolean;
  tenantSlug: string;
  isDryRun: boolean;
  analyzedCollections: CollectionAnalysis[];
  stats: {
    totalUsersFound: number;
    totalTracksFound: number;
    totalOrdersFound: number;
    importedCustomersCount: number;
    importedPackagesCount: number;
    unassignedPackagesCount: number;
    importedTripsCount: number;
    statusBreakdown: Record<string, number>;
  };
  sampleCustomers: Partial<Customer>[];
  samplePackages: Partial<Package>[];
  warnings: string[];
}

export async function runSmartMigration(
  source: MigrationSource,
  options: MigrationOptions
): Promise<MigrationResult> {
  const warnings: string[] = [];
  const rawCollections: Record<string, Record<string, any>[]> = {};

  // 1. Fetch raw collections from MongoDB or JSON
  if (source.type === 'mongo') {
    if (!source.mongoUri) {
      throw new Error('Mongo URI is required for MongoDB migration');
    }

    const client = new MongoClient(source.mongoUri);
    try {
      await client.connect();
      const db = client.db(source.dbName || undefined);
      const collections = await db.listCollections().toArray();

      for (const colInfo of collections) {
        const col = db.collection(colInfo.name);
        const docs = await col.find({}).toArray();
        rawCollections[colInfo.name] = docs as Record<string, any>[];
      }
    } finally {
      await client.close();
    }
  } else if (source.type === 'json') {
    if (!source.jsonCollections || Object.keys(source.jsonCollections).length === 0) {
      throw new Error('No JSON collections provided for migration');
    }
    Object.assign(rawCollections, source.jsonCollections);
  }

  // 2. Identify Tenant
  const tenant = store.tenants.find(
    (t) => t.slug === options.tenantSlug || t.id === options.tenantSlug
  );
  if (!tenant && !options.dryRun) {
    throw new Error(`Tenant '${options.tenantSlug}' not found in CargonaOS`);
  }
  const tenantId = tenant ? tenant.id : `tenant-${options.tenantSlug}`;
  const tenantSlug = tenant ? tenant.slug : options.tenantSlug;

  // 3. Analyze all collections
  const analyses: CollectionAnalysis[] = [];
  for (const [name, docs] of Object.entries(rawCollections)) {
    const analysis = analyzeCollection(name, docs.slice(0, 100));
    analyses.push(analysis);
  }

  // Group collections by detected type
  const userCollections = analyses.filter((a) => a.type === 'USERS');
  const trackCollections = analyses.filter((a) => a.type === 'TRACKS');
  const orderCollections = analyses.filter((a) => a.type === 'ORDERS_JUNCTION');

  if (userCollections.length === 0 && trackCollections.length === 0) {
    warnings.push('No user or track collections could be automatically detected. Please check document structures.');
  }

  // 4. Process Users -> Customers
  const customerMapByCargoCode = new Map<string, Customer>();
  const customerMapByChatId = new Map<string, Customer>();
  const importedCustomers: Customer[] = [];

  let userCounter = 1;
  for (const uCol of userCollections) {
    const docs = rawCollections[uCol.name] || [];
    const m = uCol.mapping;

    for (const doc of docs) {
      let rawCode = m.cargoCode ? doc[m.cargoCode] : null;
      let rawChatId = m.chatId ? doc[m.chatId] : null;
      let rawName = m.fullName ? doc[m.fullName] : null;
      let rawPhone = m.phone ? doc[m.phone] : null;
      let rawBalance = m.balance ? doc[m.balance] : 0;
      let rawCreated = m.createdAt ? doc[m.createdAt] : null;

      // Clean Chat ID
      const chatIdStr = rawChatId !== null && rawChatId !== undefined ? String(rawChatId).trim() : '';
      const telegramId = chatIdStr && /^\d+$/.test(chatIdStr) ? parseInt(chatIdStr, 10) : undefined;

      // Clean Cargo Code
      let cargoCode = normalizeCargoCode(rawCode);
      if (!cargoCode) {
        if (chatIdStr) {
          cargoCode = `CLI-${chatIdStr.slice(-4)}`;
        } else {
          cargoCode = `CLI-${String(userCounter).padStart(3, '0')}`;
        }
      }

      // Clean Name
      let fullName = rawName && typeof rawName === 'string' ? rawName.trim() : '';
      if (!fullName || /^пользователь/i.test(fullName)) {
        fullName = `Клиент ${cargoCode}`;
      }

      // Clean Phone
      const phone = normalizePhone(rawPhone);

      // Clean Balance
      const balance = typeof rawBalance === 'number' ? rawBalance : 0;

      const customer: Customer = {
        id: `cust-mig-${tenantSlug}-${userCounter}`,
        tenantId,
        cargoCode,
        fullName,
        phone: phone || `+99200000${String(userCounter).padStart(4, '0')}`,
        telegramId,
        telegramUsername: doc.username || doc.telegramUsername || undefined,
        balance,
        isBlocked: doc.isBlocked || false,
        createdAt: normalizeDate(rawCreated),
        updatedAt: normalizeDate(doc.updatedAt || rawCreated),
      };

      importedCustomers.push(customer);
      customerMapByCargoCode.set(cargoCode.toUpperCase(), customer);
      if (chatIdStr) {
        customerMapByChatId.set(chatIdStr, customer);
      }
      userCounter++;
    }
  }

  // 5. Build lookup map from Order Junction Collections (e.g. cargo_orders)
  // Map: trackCode -> customer
  const trackToCustomerMap = new Map<string, Customer>();
  let totalOrdersFound = 0;

  for (const oCol of orderCollections) {
    const docs = rawCollections[oCol.name] || [];
    const m = oCol.mapping;
    totalOrdersFound += docs.length;

    for (const doc of docs) {
      const rawTrack = m.orderTrackCode ? doc[m.orderTrackCode] : null;
      const rawChatId = m.orderChatId ? doc[m.orderChatId] : null;
      const rawUserId = m.orderUserId ? doc[m.orderUserId] : null;

      const trackNumber = normalizeTrackingNumber(rawTrack);
      if (!trackNumber) continue;

      let foundCustomer: Customer | undefined;

      // Try finding by userId / cargoCode
      if (rawUserId) {
        const codeNorm = normalizeCargoCode(rawUserId);
        foundCustomer = customerMapByCargoCode.get(codeNorm);
      }

      // Try finding by chatId
      if (!foundCustomer && rawChatId !== null && rawChatId !== undefined) {
        const chatIdStr = String(rawChatId).trim();
        foundCustomer = customerMapByChatId.get(chatIdStr);
      }

      if (foundCustomer) {
        trackToCustomerMap.set(trackNumber, foundCustomer);
      }
    }
  }

  // 6. Process Tracks -> Packages
  const importedPackages: Package[] = [];
  const tripBatchesMap = new Map<string, { batchDate: string; tracks: string[] }>();
  const statusBreakdown: Record<string, number> = {
    RECEIVED_AT_ORIGIN: 0,
    IN_TRANSIT: 0,
    CUSTOMS: 0,
    READY_FOR_PICKUP: 0,
    RELEASED: 0,
    RETURNED: 0,
  };

  let packageCounter = 1;
  let unassignedCount = 0;

  for (const tCol of trackCollections) {
    const docs = rawCollections[tCol.name] || [];
    const m = tCol.mapping;

    for (const doc of docs) {
      const rawTrack = m.trackingNumber ? doc[m.trackingNumber] : null;
      const trackingNumber = normalizeTrackingNumber(rawTrack);
      if (!trackingNumber) continue;

      // Determine customer
      let assignedCustomer = trackToCustomerMap.get(trackingNumber);

      // Try direct customer link in track doc
      if (!assignedCustomer && m.directCargoCode && doc[m.directCargoCode]) {
        assignedCustomer = customerMapByCargoCode.get(normalizeCargoCode(doc[m.directCargoCode]));
      }
      if (!assignedCustomer && m.directChatId && doc[m.directChatId]) {
        assignedCustomer = customerMapByChatId.get(String(doc[m.directChatId]).trim());
      }
      if (!assignedCustomer && Array.isArray(doc.subscribers) && doc.subscribers.length > 0) {
        const firstSub = doc.subscribers[0];
        const subChatId = typeof firstSub === 'object' ? (firstSub.chatId || firstSub.id) : firstSub;
        if (subChatId) {
          assignedCustomer = customerMapByChatId.get(String(subChatId).trim());
        }
      }

      const customerCargoCode = assignedCustomer ? assignedCustomer.cargoCode : '';
      if (!customerCargoCode) {
        unassignedCount++;
      }

      // Normalize status & dates
      const status = normalizeStatus(m.status ? doc[m.status] : null);
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      const createdAt = normalizeDate(m.createdAt ? doc[m.createdAt] : null);

      // Weight & Cost calculation
      const weightKg = m.weight && typeof doc[m.weight] === 'number' ? doc[m.weight] : (options.defaultWeightKg || 0.5);
      const rate = options.costPerKgUSD || 3.0;
      const costUSD = m.cost && typeof doc[m.cost] === 'number' ? doc[m.cost] : Math.max(1.5, Math.round(weightKg * rate * 100) / 100);

      // Batch / Trip tracking
      const batchDate = m.batchDate && doc[m.batchDate] ? String(doc[m.batchDate]).trim() : '';
      if (batchDate) {
        if (!tripBatchesMap.has(batchDate)) {
          tripBatchesMap.set(batchDate, { batchDate, tracks: [] });
        }
        tripBatchesMap.get(batchDate)!.tracks.push(trackingNumber);
      }

      const pkg: Package = {
        id: `pkg-mig-${tenantSlug}-${packageCounter}`,
        tenantId,
        trackingNumber,
        customerCargoCode,
        description: doc.description || doc.name || 'Товары из Китая',
        weightKg,
        costUSD,
        shelfLocation: doc.shelfLocation || doc.shelf || 'Стеллаж 1 - Полка А-1',
        branchId: options.defaultBranchId || (store.branches.find((b) => b.tenantId === tenantId)?.id || 'branch-default'),
        status,
        createdAt,
      };

      importedPackages.push(pkg);
      packageCounter++;
    }
  }

  // 7. Auto-generate Trips for batches
  const importedTrips: Trip[] = [];
  let tripCounter = 1;
  for (const [batchName, data] of tripBatchesMap.entries()) {
    const trip: Trip = {
      id: `trip-mig-${tenantSlug}-${tripCounter}`,
      tenantId,
      code: `TRIP-${batchName.replace(/[^\w]/g, '-')}`,
      originWarehouseId: 'wh-china-yiwu',
      destinationBranchId: options.defaultBranchId || (store.branches.find((b) => b.tenantId === tenantId)?.id || 'branch-default'),
      status: 'ARRIVED',
      transportType: 'AUTO',
      vehiclePlate: 'MIG-TRUCK',
      driverName: 'Экспедитор рейса',
      departureDate: normalizeDate(batchName),
      estimatedArrivalDate: normalizeDate(batchName),
      packageCount: data.tracks.length,
      totalWeightKg: Math.round(data.tracks.length * 0.7 * 10) / 10,
      createdAt: new Date().toISOString(),
    };
    importedTrips.push(trip);
    tripCounter++;
  }

  // 8. Commit to CargonaOS persistent store if NOT dry-run
  if (!options.dryRun) {
    // 8.1 Upsert Customers (deduplicating by cargoCode)
    for (const c of importedCustomers) {
      const existIdx = store.customers.findIndex(
        (existing) => existing.tenantId === tenantId && existing.cargoCode.toUpperCase() === c.cargoCode.toUpperCase()
      );
      if (existIdx !== -1) {
        store.customers[existIdx] = { ...store.customers[existIdx], ...c, id: store.customers[existIdx].id };
      } else {
        store.customers.push(c);
      }
    }

    // 8.2 Upsert Packages (deduplicating by trackingNumber)
    for (const p of importedPackages) {
      const existIdx = store.packages.findIndex(
        (existing) => existing.tenantId === tenantId && existing.trackingNumber === p.trackingNumber
      );
      if (existIdx !== -1) {
        store.packages[existIdx] = { ...store.packages[existIdx], ...p, id: store.packages[existIdx].id };
      } else {
        store.packages.push(p);
      }
    }

    // 8.3 Save Trips
    for (const tr of importedTrips) {
      const existIdx = store.trips.findIndex(
        (existing) => existing.tenantId === tenantId && existing.code === tr.code
      );
      if (existIdx === -1) {
        store.trips.push(tr);
      }
    }

    // 8.4 Save store to file
    store.saveToFile();
  }

  return {
    success: true,
    tenantSlug,
    isDryRun: !!options.dryRun,
    analyzedCollections: analyses,
    stats: {
      totalUsersFound: importedCustomers.length,
      totalTracksFound: importedPackages.length,
      totalOrdersFound,
      importedCustomersCount: importedCustomers.length,
      importedPackagesCount: importedPackages.length,
      unassignedPackagesCount: unassignedCount,
      importedTripsCount: importedTrips.length,
      statusBreakdown,
    },
    sampleCustomers: importedCustomers.slice(0, 5),
    samplePackages: importedPackages.slice(0, 5),
    warnings,
  };
}
