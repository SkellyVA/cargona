import { defineStore } from 'pinia';
import { ref, shallowRef, triggerRef, computed, watch } from 'vue';

export interface CurrencyRate {
  [code: string]: number; // курс к USD (1 USD = rate units)
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  role: 'OPERATOR' | 'CASHIER' | 'SORTER' | 'MANAGER';
  phone: string;
  branchId: string;
  branchName: string;
  isActive: boolean;
  tenantSlug?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  codePrefix: string;
  ownerEmail: string;
  ownerPassword?: string;
  planName: string;
  baseCurrency: string;
  isActive: boolean;
}

export interface StorageCell {
  id: string;
  rack: string;
  shelf: string;
  barcode: string;
  packageCount: number;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  cashBalanceUSD: number;
  cells: StorageCell[];
  tenantSlug?: string;
}

export interface TripManifestItem {
  id: string;
  sackNumber: string;
  category: string;
  description?: string;
  weightKg: number;
  volumeM3: number;
  packageCount: number;
  sealNumber: string;
}

export interface Trip {
  id: string;
  tripCode: string;
  type?: 'AUTO' | 'AIR' | 'TRAIN' | 'SEA';
  route: string;
  driverName: string;
  vehiclePlate: string;
  status: 'LOADING' | 'IN_TRANSIT' | 'CUSTOMS' | 'ARRIVED' | 'COMPLETED';
  totalWeightKg: number;
  totalVolumeM3: number;
  sackCount: number;
  departureDate: string;
  estimatedArrival: string;
  manifestItems: TripManifestItem[];
  tenantSlug?: string;
}

export interface OriginWarehouse {
  id: string;
  name?: string;
  country: string;
  countryCode: string;
  city: string;
  address: string;
  receiverName: string;
  phone: string;
  zipCode: string;
  instructions: string;
  isActive: boolean;
  cells?: StorageCell[];
  tenantSlug?: string;
}

export interface TariffPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  currency: string;
  maxPackagesPerMonth: number;
  maxBranches: number;
  features: {
    customBotBYOB: boolean;
    whiteLabel: boolean;
    wmsShelfBarcodes: boolean;
  };
}

export interface CashAccount {
  id: string;
  name: string;
  type: 'CASH_PVZ' | 'BANK' | 'SAFE';
  branchId?: string | null;
  currency: string;
  balanceUSD: number;
  isActive: boolean;
  tenantSlug?: string;
}

export interface FinancialTransaction {
  id: string;
  accountId: string;
  accountName?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'COLLECTION' | 'CUSTOMER_PAYMENT' | 'CUSTOMER_REFUND';
  category: string;
  amountUSD: number;
  amountLocal?: number;
  currency?: string;
  relatedPackageId?: string | null;
  relatedTripId?: string | null;
  relatedCustomerId?: string | null;
  relatedBranchId?: string | null;
  targetAccountId?: string | null;
  comment?: string | null;
  receiptUrl?: string | null;
  createdBy: string;
  createdAt: string;
  tenantSlug?: string;
}

export interface CashCollection {
  id: string;
  receiptNumber: string;
  sourceBranchId: string;
  sourceBranchName?: string;
  sourceAccountId: string;
  targetAccountId: string;
  amountUSD: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'REJECTED';
  requestedBy: string;
  confirmedBy?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  tenantSlug?: string;
}

export interface TripExpense {
  id: string;
  tripId: string;
  category: string;
  amountUSD: number;
  comment?: string | null;
  createdAt: string;
  tenantSlug?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  isDirectCost: boolean;
  isActive: boolean;
}


export interface Customer {
  id: string;
  cargoCode: string;
  fullName: string;
  phone: string;
  telegramUsername?: string;
  balanceUSD: number; // положительный = депозит, отрицательный = долг
  isBlocked: boolean;
  notes?: string;
  preferredBranchId?: string;
  tenantSlug?: string;
}

export interface PackageItem {
  id: string;
  trackingNumber: string;
  customerCargoCode: string;
  description: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  volumeM3?: number;
  areaM2?: number;
  densityKgM3?: number;
  volumetricWeightKg?: number;
  costUSD: number;
  shelfLocation: string; // "Стеллаж 1 - Полка Б-14"
  branchId: string;
  targetBranchId?: string;
  tripId?: string;
  status: 'RECEIVED_AT_ORIGIN' | 'IN_TRANSIT' | 'CUSTOMS' | 'READY_FOR_PICKUP' | 'RELEASED' | 'RETURNED';
  returnReason?: string;
  refundAmountUSD?: number;
  returnTrackingNumber?: string;
  photos?: string[];
  handoverPhoto?: string;
  releasedAt?: string;
  notifiedReady?: boolean;
  reviewRating?: number;
  reviewComment?: string;
  storagePaidUntil?: string;
  isPaidOnline?: boolean;
  createdAt: string;
  tenantSlug?: string;
}

export interface AuditEntry {
  id: string;
  time: string;
  action: string;
  actionLabel: string;
  target: string;
  user: string;
  details: string;
  branchId?: string;
  branchName?: string;
  tenantSlug?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'SUPER_ADMIN' | 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'CASHIER' | 'SORTER' | 'WAREHOUSE';
  organizationSlug: string;
  organizationName: string;
}

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || raw === 'undefined' || raw === 'null') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const useCargoStore = defineStore('cargo', () => {
  // 0. Авторизованный пользователь панели
  const savedUserJson = typeof window !== 'undefined' ? localStorage.getItem('cargona_auth_user') : null;
  const currentUser = ref<CurrentUser>(
    safeParse<CurrentUser>(savedUserJson, {
      id: '',
      name: '',
      email: '',
      role: 'OWNER',
      organizationSlug: '',
      organizationName: '',
    })
  );

  function login(user: CurrentUser) {
    currentUser.value = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_auth_user', JSON.stringify(user));
    }
    addAudit('AUTH', 'Вход в систему', user.email, `Вход выполнен с ролью ${user.role}`, user.email);
  }

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cargona_auth_user');
    }
    currentUser.value = {
      id: '',
      name: '',
      email: '',
      role: 'OPERATOR',
      organizationSlug: '',
      organizationName: '',
    };
  }
  // 1. Мультивалютность
  const currencies = ref(['TJS', 'USD', 'RUB', 'CNY']);
  const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('cargona_active_currency') : null;
  const activeCurrency = ref(savedCurrency || 'TJS');

  const savedRates = typeof window !== 'undefined' ? localStorage.getItem('cargona_rates') : null;
  const ratesToUSD = ref<CurrencyRate>(
    safeParse<CurrencyRate>(savedRates, {
      USD: 1.0,
      TJS: 10.95,
      RUB: 92.5,
      CNY: 7.25,
    })
  );

  function setActiveCurrency(currency: string) {
    activeCurrency.value = currency;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_active_currency', currency);
    }
  }

  function convertFromUSD(amountUSD: number, targetCurrency: string = activeCurrency.value): number {
    const rate = ratesToUSD.value[targetCurrency] || 1.0;
    return Math.round(amountUSD * rate * 100) / 100;
  }

  function formatMoney(amountUSD: number, targetCurrency: string = activeCurrency.value): string {
    const converted = convertFromUSD(amountUSD, targetCurrency);
    return `${converted.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${targetCurrency}`;
  }

  // 2. Настройки карго-компании
  const settings = ref({
    companyName: '',
    codePrefix: '',
    ownerEmail: '',
    ownerPassword: '',
    baseCurrency: 'USD',
    chinaWarehouseAddress: '',
    chinaContactPhone: '',
    chinaContactName: '',
    botToken: '',
    botUsername: '',
    autoChannelPosting: false,
    channelId: '',
    managerUsername: '',
    autoDeliveryRatePerKgUSD: 2.80,
    airDeliveryRatePerKgUSD: 5.50,
    minPackageCostUSD: 1.50,
    freeStorageDays: 3,
    storageOverdueRatePerDayUSD: 0.50,
  });

  // 2.0 Тарифы доставки и хранения в выбранной валюте (<выбранная валюта>/кг, /день)
  const deliveryRates = computed(() => {
    const rate = ratesToUSD.value[activeCurrency.value] || 1;
    return {
      autoRatePerKg: Math.round(settings.value.autoDeliveryRatePerKgUSD * rate * 100) / 100,
      airRatePerKg: Math.round(settings.value.airDeliveryRatePerKgUSD * rate * 100) / 100,
      minPackageCost: Math.round(settings.value.minPackageCostUSD * rate * 100) / 100,
      freeStorageDays: settings.value.freeStorageDays || 3,
      storageOverdueRatePerDay: Math.round((settings.value.storageOverdueRatePerDayUSD || 0.50) * rate * 100) / 100,
      formattedAuto: `${(settings.value.autoDeliveryRatePerKgUSD * rate).toFixed(2)} ${activeCurrency.value}/кг`,
      formattedAir: `${(settings.value.airDeliveryRatePerKgUSD * rate).toFixed(2)} ${activeCurrency.value}/кг`,
      formattedMinCost: `${(settings.value.minPackageCostUSD * rate).toFixed(2)} ${activeCurrency.value}`,
      formattedStorageOverdue: `${((settings.value.storageOverdueRatePerDayUSD || 0.50) * rate).toFixed(2)} ${activeCurrency.value}/день`,
    };
  });

  function updateDeliveryRates(rates: { autoRatePerKg: number; airRatePerKg: number; minPackageCost: number }) {
    const rate = ratesToUSD.value[activeCurrency.value] || 1;
    settings.value.autoDeliveryRatePerKgUSD = Math.round((rates.autoRatePerKg / rate) * 1000) / 1000;
    settings.value.airDeliveryRatePerKgUSD = Math.round((rates.airRatePerKg / rate) * 1000) / 1000;
    settings.value.minPackageCostUSD = Math.round((rates.minPackageCost / rate) * 1000) / 1000;
    addAudit('UPDATE', 'Тарифы доставки', 'Логистика', `Обновлены тарифные ставки: Авто ${rates.autoRatePerKg} ${activeCurrency.value}/кг, Авиа ${rates.airRatePerKg} ${activeCurrency.value}/кг`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings.value),
        });
      }
    } catch {}
  }

  function updateStorageSettings(data: { freeStorageDays: number; storageOverdueRatePerDay: number }) {
    const rate = ratesToUSD.value[activeCurrency.value] || 1;
    settings.value.freeStorageDays = Math.max(0, Math.floor(data.freeStorageDays));
    settings.value.storageOverdueRatePerDayUSD = Math.round((data.storageOverdueRatePerDay / rate) * 1000) / 1000;
    addAudit('UPDATE', 'Условия хранения', 'Склад & ПВЗ', `Бесплатное хранение: ${settings.value.freeStorageDays} дн., просрочка: ${data.storageOverdueRatePerDay} ${activeCurrency.value}/день`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings.value),
        });
      }
    } catch {}
  }

  // --- Хелперы для последовательной генерации ID (001, 002, 003...) ---
  function nextSeqId(prefix: string, list: { id: string }[]): string {
    let max = 0;
    for (const item of list) {
      if (!item?.id) continue;
      const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        max = Math.max(max, parseInt(match[1], 10));
      }
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  function nextCargoCode(customPrefix?: string): string {
    const p = (customPrefix || tenant.value?.codePrefix || settings.value.codePrefix || activeTenantSlug.value.substring(0, 3) || 'CRG').toUpperCase().trim();
    let max = 0;
    for (const c of rawCustomers.value) {
      if (!c.cargoCode) continue;
      const match = c.cargoCode.match(/(\d+)$/);
      if (match) {
        max = Math.max(max, parseInt(match[1], 10));
      }
    }
    return `${p}-${String(max + 1).padStart(3, '0')}`;
  }

  // 2.1 Подключенные тенанты (Multi-tenant SaaS)
  const savedTenants = typeof window !== 'undefined' ? localStorage.getItem('cargona_tenants') : null;
  const tenants = ref<Tenant[]>(safeParse<Tenant[]>(savedTenants, []));
  const maxTenantsLimit = ref<number | null>(null);
  const isLimitReached = computed(() => maxTenantsLimit.value !== null && maxTenantsLimit.value > 0 && tenants.value.length >= maxTenantsLimit.value);

  function upsertTenant(tenantData: Tenant) {
    const cleanEmail = tenantData.ownerEmail?.toLowerCase().trim();
    const existingIndex = tenants.value.findIndex(
      (t) => t.id === tenantData.id || t.slug === tenantData.slug || (cleanEmail && t.ownerEmail?.toLowerCase().trim() === cleanEmail)
    );
    if (existingIndex !== -1) {
      tenants.value[existingIndex] = { ...tenants.value[existingIndex], ...tenantData };
    } else {
      tenants.value.push(tenantData);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_tenants', JSON.stringify(tenants.value));
    }

    // Ensure staff list has the owner
    if (cleanEmail) {
      const existingStaff = rawStaff.value.find((s) => s.email?.toLowerCase().trim() === cleanEmail);
      if (!existingStaff) {
        rawStaff.value.push({
          id: nextSeqId('emp', rawStaff.value),
          fullName: `${tenantData.name} (Владелец)`,
          email: tenantData.ownerEmail,
          password: tenantData.ownerPassword,
          role: 'OWNER',
          phone: '+992 90 000 0000',
          branchId: '',
          branchName: 'Главный офис',
          isActive: tenantData.isActive ?? true,
          tenantSlug: tenantData.slug,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('cargona_staff', JSON.stringify(rawStaff.value));
        }
      } else {
        if (tenantData.ownerPassword) existingStaff.password = tenantData.ownerPassword;
        existingStaff.tenantSlug = tenantData.slug;
      }
    }
  }

  async function fetchTenantsFromBackend() {
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.maxTenantsLimit !== undefined) {
          maxTenantsLimit.value = data.maxTenantsLimit;
        }
        if (Array.isArray(data.tenants)) {
          for (const t of data.tenants) {
            upsertTenant(t);
          }
        }
      }
    } catch (e) {
      // Backend might be offline or local mode
    }
  }

  function addTenant(tenantData: Omit<Tenant, 'id'>) {
    const id = nextSeqId('t', tenants.value);
    const newT: Tenant = { id, ...tenantData };
    tenants.value.push(newT);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_tenants', JSON.stringify(tenants.value));
    }

    // Создаем единственного сотрудника: Владелец
    rawStaff.value.push({
      id: nextSeqId('emp', rawStaff.value),
      fullName: `${newT.name} (Владелец)`,
      email: newT.ownerEmail,
      password: newT.ownerPassword,
      role: 'OWNER',
      phone: '+992 90 000 0000',
      branchId: '',
      branchName: 'Главный офис',
      isActive: true,
      tenantSlug: newT.slug,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_staff', JSON.stringify(rawStaff.value));
    }

    rawAuditLogs.value.unshift({
      id: nextSeqId('log', rawAuditLogs.value),
      time: new Date().toLocaleTimeString('ru-RU'),
      action: 'CREATE',
      actionLabel: 'Создание организации',
      target: tenantData.name,
      user: currentUser.value?.name || 'admin',
      details: `Организация ${tenantData.name} (${tenantData.codePrefix}) успешно создана в CargonaOS`,
      tenantSlug: newT.slug,
    });

    return newT;
  }

  function updateTenant(tenantId: string, data: Partial<Tenant>) {
    const t = tenants.value.find((item) => item.id === tenantId);
    if (!t) return;
    Object.assign(t, data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_tenants', JSON.stringify(tenants.value));
    }
    if (activeTenantSlug.value === t.slug) {
      setTenantSlug(t.slug);
    }
    addAudit('UPDATE', 'Параметры карго', t.name, `Обновлены параметры компании ${t.name}`);
  }

  function deleteTenant(tenantIdOrSlug: string) {
    const index = tenants.value.findIndex((t) => t.id === tenantIdOrSlug || t.slug === tenantIdOrSlug);
    if (index === -1) return;
    const removed = tenants.value.splice(index, 1)[0];
    const slug = removed.slug;

    // Очищаем все изолированные данные этого тенанта
    rawBranches.value = rawBranches.value.filter((b) => b.tenantSlug !== slug);
    rawStaff.value = rawStaff.value.filter((s) => s.tenantSlug !== slug);
    rawCustomers.value = rawCustomers.value.filter((c) => c.tenantSlug !== slug);
    rawTrips.value = rawTrips.value.filter((t) => t.tenantSlug !== slug);
    rawPackages.value = rawPackages.value.filter((p) => p.tenantSlug !== slug);
    rawAuditLogs.value = rawAuditLogs.value.filter((a) => a.tenantSlug !== slug);
    rawOriginWarehouses.value = rawOriginWarehouses.value.filter((w) => w.tenantSlug !== slug);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_tenants', JSON.stringify(tenants.value));
      localStorage.setItem('cargona_branches', JSON.stringify(rawBranches.value));
      localStorage.setItem('cargona_staff', JSON.stringify(rawStaff.value));
      localStorage.setItem('cargona_customers', JSON.stringify(rawCustomers.value));
      localStorage.setItem('cargona_trips', JSON.stringify(rawTrips.value));
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
      localStorage.setItem('cargona_audit_logs', JSON.stringify(rawAuditLogs.value));
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }

    if (activeTenantSlug.value === slug) {
      activeTenantSlug.value = tenants.value[0]?.slug || '';
      setTenantSlug(activeTenantSlug.value);
    }

    addAudit('DELETE', 'Удаление организации', removed.name, `Организация ${removed.name} (${removed.slug}) удалена со всеми данными`);
  }

  function toggleTenantStatus(id: string) {
    const t = tenants.value.find((item) => item.id === id);
    if (!t) return;
    t.isActive = !t.isActive;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_tenants', JSON.stringify(tenants.value));
    }
    addAudit('UPDATE', 'Статус карго', t.name, t.isActive ? 'Активирован' : 'Приостановлен');
  }

  // Активный тенант текущего пользователя (с сохранением выбранной организации)
  const savedLastTenantSlug = typeof window !== 'undefined' ? localStorage.getItem('cargona_active_tenant_slug') : null;
  const initialSlug = savedLastTenantSlug || (tenants.value.length > 0 ? tenants.value[0].slug : '');
  const activeTenantSlug = ref<string>(initialSlug);

  function setTenantSlug(slug: string) {
    if (!slug) return;
    activeTenantSlug.value = slug;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_active_tenant_slug', slug);
    }

    let found = tenants.value.find((t) => t.slug === slug);
    if (!found) {
      // If organization not found in store, but we have existing tenants, choose the first one
      if (tenants.value.length > 0) {
        found = tenants.value[0];
        activeTenantSlug.value = found.slug;
        if (typeof window !== 'undefined') {
          localStorage.setItem('cargona_active_tenant_slug', found.slug);
        }
      }
    }

    if (found) {
      settings.value.companyName = found.name;
      settings.value.codePrefix = found.codePrefix;
      settings.value.ownerEmail = found.ownerEmail;
      settings.value.baseCurrency = found.baseCurrency || 'USD';
      settings.value.chinaWarehouseAddress = `浙江省金华市义乌市国际商贸区4区12号门 (${found.name})`;
      settings.value.chinaContactName = `${found.codePrefix} Warehouse Yiwu`;
      settings.value.channelId = `@${found.slug}_news`;
      syncTenantData(found.slug);
    }
  }

  let isSyncing = false;
  let lastSyncTime = 0;
  let lastSyncedSlug = '';

  async function syncTenantData(slug: string, force = false) {
    if (!slug) return;
    const now = Date.now();
    if (!force && isSyncing) return;
    if (!force && lastSyncedSlug === slug && now - lastSyncTime < 8000) return;
    isSyncing = true;
    try {
      const res = await fetch(`/api/o/${slug}/all`);
      if (!res.ok) return;
      const data = (await res.json()) as any;
      if (!data) return;

      lastSyncTime = Date.now();
      lastSyncedSlug = slug;

      if (data.tenant) {
        upsertTenant(data.tenant);
      }
      if (data.settings) {
        settings.value = { ...settings.value, ...data.settings };
      }
      if (Array.isArray(data.branches)) {
        const tenantBranches: Branch[] = data.branches.map((b: any) => ({
          id: b.id,
          name: b.name,
          city: b.city,
          address: b.address,
          phone: b.phone || '',
          cashBalanceUSD: typeof b.cashBalance === 'number' ? b.cashBalance : (b.cashBalanceUSD || 0),
          cells: b.cells || [],
          tenantSlug: slug,
        }));
        const otherBranches = rawBranches.value.filter((b) => b.tenantSlug && b.tenantSlug !== slug);
        rawBranches.value = [...otherBranches, ...tenantBranches];
      }

      if (Array.isArray(data.customers)) {
        const tenantCustomers: Customer[] = data.customers.map((c: any) => ({
          id: c.id,
          cargoCode: c.cargoCode,
          fullName: c.fullName,
          phone: c.phone || '',
          telegramUsername: c.telegramUsername || '',
          balanceUSD: typeof c.balance === 'number' ? c.balance : (c.balanceUSD || 0),
          isBlocked: c.isBlocked || false,
          preferredBranchId: c.preferredBranchId || '',
          notes: c.notes || '',
          tenantSlug: slug,
        }));
        const otherCustomers = rawCustomers.value.filter((c) => c.tenantSlug && c.tenantSlug !== slug);
        rawCustomers.value = [...otherCustomers, ...tenantCustomers];
        triggerRef(rawCustomers);
      }

      if (Array.isArray(data.packages)) {
        const tenantPackages: PackageItem[] = data.packages.map((p: any) => ({
          id: p.id,
          trackingNumber: p.trackingNumber,
          customerCargoCode: p.customerCargoCode || '',
          description: p.description || '',
          weightKg: p.weightKg || 0,
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          volumeM3: p.volumeM3,
          costUSD: typeof p.cost === 'number' ? p.cost : (p.costUSD || 0),
          shelfLocation: p.shelfLocation || '',
          branchId: p.currentBranchId || p.branchId || '',
          tripId: p.tripId || undefined,
          status: p.status || 'RECEIVED_AT_ORIGIN',
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '01.01.2026',
          tenantSlug: slug,
        }));
        const otherPackages = rawPackages.value.filter((p) => p.tenantSlug && p.tenantSlug !== slug);
        rawPackages.value = [...otherPackages, ...tenantPackages];
        triggerRef(rawPackages);
      }

      if (Array.isArray(data.staff)) {
        const tenantStaff: Employee[] = data.staff.map((u: any) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          password: u.password,
          role: u.role === 'TENANT_OWNER' ? 'OWNER' : u.role,
          phone: u.phone || '+992 90 000 0000',
          branchId: u.assignedBranchId || '',
          branchName: u.branchName || 'Главный офис',
          isActive: u.isActive !== false,
          tenantSlug: slug,
        }));
        const otherStaff = rawStaff.value.filter((s) => s.tenantSlug && s.tenantSlug !== slug);
        rawStaff.value = [...otherStaff, ...tenantStaff];
      }

      if (Array.isArray(data.trips)) {
        const tenantTrips: Trip[] = data.trips.map((t: any) => ({
          id: t.id,
          tripCode: t.code || t.tripCode,
          type: t.transportType || t.type || 'AUTO',
          route: t.route || 'Китай → Таджикистан',
          driverName: t.driverName || '',
          vehiclePlate: t.vehiclePlate || '',
          status: t.status || 'LOADING',
          totalWeightKg: t.totalWeightKg || 0,
          totalVolumeM3: t.totalVolumeM3 || 0,
          sackCount: t.sackCount || 0,
          departureDate: t.departureDate || '',
          estimatedArrival: t.estimatedArrivalDate || '',
          manifestItems: t.manifestItems || [],
          tenantSlug: slug,
        }));
        const otherTrips = rawTrips.value.filter((t) => t.tenantSlug && t.tenantSlug !== slug);
        rawTrips.value = [...otherTrips, ...tenantTrips];
        triggerRef(rawTrips);
      }
    } catch {
      // Backend offline fallback
    } finally {
      isSyncing = false;
    }
  }

  const tenant = computed(() => {
    const slug = activeTenantSlug.value || currentUser.value?.organizationSlug;
    return (
      tenants.value.find((t) => t.slug === slug) ||
      tenants.value.find((t) => t.slug === currentUser.value?.organizationSlug) ||
      tenants.value[0] ||
      null
    );
  });

  // Проверка прав доступа сотрудника к модулям (RBAC)
  function hasPermission(module: string): boolean {
    const role = currentUser.value?.role;
    if (!role) return false;
    if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') return true;
    if (role === 'OWNER') return module !== 'superadmin';
    if (role === 'ADMIN' || role === 'MANAGER') return module !== 'superadmin';
    if (role === 'OPERATOR') return ['dashboard', 'packages', 'wms', 'branches', 'customers'].includes(module);
    if (role === 'CASHIER') return ['dashboard', 'packages', 'branches', 'customers', 'finance'].includes(module);
    if (role === 'SORTER' || role === 'WAREHOUSE') return ['dashboard', 'packages', 'wms', 'trips', 'branches'].includes(module);
    return false;
  }

  // 2.2 Международные склады отправления (Мульти-страны: Китай, Турция, ОАЭ, США)
  const defaultOriginWarehouses: OriginWarehouse[] = [];

  const savedWarehouses = typeof window !== 'undefined' ? localStorage.getItem('cargona_warehouses') : null;
  const rawOriginWarehouses = ref<OriginWarehouse[]>(
    safeParse<OriginWarehouse[]>(savedWarehouses, defaultOriginWarehouses)
  );

  const originWarehouses = computed<OriginWarehouse[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawOriginWarehouses.value;
    return rawOriginWarehouses.value.filter((w) => (w.tenantSlug ? w.tenantSlug === slug : true));
  });

  function addOriginWarehouse(wh: Omit<OriginWarehouse, 'id'>) {
    const code = (wh.countryCode || 'CN').toUpperCase().trim();
    const city = wh.city?.trim() || 'Центральный хаб';
    const country = wh.country?.trim() || 'Китай';
    const name = wh.name?.trim() || `Склад ${city} (${country})`;

    const allWhCells = rawOriginWarehouses.value.flatMap((w) => w.cells || []);
    const newWh: OriginWarehouse = {
      id: nextSeqId('wh', rawOriginWarehouses.value),
      name,
      country,
      countryCode: code,
      city,
      address: wh.address?.trim() || '',
      receiverName: wh.receiverName?.trim() || 'Cargona Warehouse',
      phone: wh.phone?.trim() || '',
      zipCode: wh.zipCode?.trim() || '',
      instructions: wh.instructions?.trim() || 'Для интернет-заказов',
      isActive: true,
      tenantSlug: activeTenantSlug.value,
      cells: wh.cells && wh.cells.length > 0 ? wh.cells : [
        { id: nextSeqId('whc', allWhCells), rack: 'Сектор A', shelf: `Паллет ${code}-01`, barcode: `CELL-${code}-A01`, packageCount: 0 },
        { id: nextSeqId('whc', [...allWhCells, { id: 'whc-001' }]), rack: 'Сектор A', shelf: `Паллет ${code}-02`, barcode: `CELL-${code}-A02`, packageCount: 0 },
        { id: nextSeqId('whc', [...allWhCells, { id: 'whc-001' }, { id: 'whc-002' }]), rack: 'Сектор B', shelf: `Зона B-1 (Крупногабарит)`, barcode: `CELL-${code}-B01`, packageCount: 0 },
      ],
    };
    rawOriginWarehouses.value.push(newWh);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }
    addAudit('CREATE', 'Новый склад отправки', newWh.name, `Добавлен склад ${newWh.name} (Код: ${newWh.countryCode})`);
    return newWh;
  }

  function updateOriginWarehouse(id: string, data: Partial<OriginWarehouse>) {
    const wh = rawOriginWarehouses.value.find((w) => w.id === id);
    if (!wh) return;
    Object.assign(wh, data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }
    addAudit('UPDATE', 'Обновление склада', wh.name || wh.country, `Обновлены данные склада ${wh.city}`);
  }

  function deleteOriginWarehouse(id: string) {
    const idx = rawOriginWarehouses.value.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const removed = rawOriginWarehouses.value.splice(idx, 1)[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }
    addAudit('DELETE', 'Удаление склада', removed.name || removed.country, `Удален склад ${removed.city} (${removed.country})`);
  }

  function toggleOriginWarehouse(id: string) {
    const wh = rawOriginWarehouses.value.find((w) => w.id === id);
    if (!wh) return;
    wh.isActive = !wh.isActive;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }
    addAudit('UPDATE', 'Статус склада', wh.name || wh.country, wh.isActive ? 'Склад активирован' : 'Склад временно приостановлен');
  }

  function addWarehouseCell(warehouseId: string, rack: string, shelf: string) {
    const wh = rawOriginWarehouses.value.find((w) => w.id === warehouseId || (w.id === 'wh-cn' && warehouseId === 'b-origin'));
    if (!wh) return;
    if (!wh.cells) wh.cells = [];
    const allWhCells = rawOriginWarehouses.value.flatMap((w) => w.cells || []);
    const cellId = nextSeqId('whc', allWhCells);
    const barcode = `CELL-${wh.countryCode}-${rack.replace(/\s+/g, '')}-${shelf.replace(/\s+/g, '')}`;
    wh.cells.push({
      id: cellId,
      rack,
      shelf,
      barcode,
      packageCount: 0,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_warehouses', JSON.stringify(rawOriginWarehouses.value));
    }
    addAudit('CREATE', 'Новая ячейка склада', `${wh.city} / ${shelf}`, `Создана складская ячейка/паллет ${rack}, ${shelf}`);
  }

  // 2.3 Тарифные планы платформы Cargona (редактируемые)
  const defaultSaasPlans: TariffPlan[] = [
    {
      id: 'plan-1',
      slug: 'starter',
      name: 'Старт',
      priceMonthly: 49,
      currency: 'USD',
      maxPackagesPerMonth: 1500,
      maxBranches: 2,
      features: {
        customBotBYOB: false,
        whiteLabel: false,
        wmsShelfBarcodes: true,
      },
    },
    {
      id: 'plan-2',
      slug: 'pro',
      name: 'PRO',
      priceMonthly: 149,
      currency: 'USD',
      maxPackagesPerMonth: 10000,
      maxBranches: 10,
      features: {
        customBotBYOB: true,
        whiteLabel: false,
        wmsShelfBarcodes: true,
      },
    },
    {
      id: 'plan-3',
      slug: 'enterprise',
      name: 'Бизнес / Enterprise',
      priceMonthly: 399,
      currency: 'USD',
      maxPackagesPerMonth: -1,
      maxBranches: -1,
      features: {
        customBotBYOB: true,
        whiteLabel: true,
        wmsShelfBarcodes: true,
      },
    },
  ];

  const savedPlans = typeof window !== 'undefined' ? localStorage.getItem('cargona_saas_plans') : null;
  const saasPlans = ref<TariffPlan[]>(safeParse<TariffPlan[]>(savedPlans, defaultSaasPlans));

  function updateSaasPlan(planId: string, data: Partial<TariffPlan>) {
    const plan = saasPlans.value.find((p) => p.id === planId);
    if (!plan) return;
    Object.assign(plan, data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_saas_plans', JSON.stringify(saasPlans.value));
    }
    addAudit('UPDATE', 'Тарифный план SaaS', plan.name, `Обновлены условия тарифа ${plan.name}`);
  }

  // 3. ПВЗ и Ячейки (Стеллажи/Полки)
  const defaultBranches: Branch[] = [];
  const savedBranches = typeof window !== 'undefined' ? localStorage.getItem('cargona_branches') : null;
  const rawBranches = ref<Branch[]>(safeParse<Branch[]>(savedBranches, defaultBranches));

  // 4. Сотрудники (По умолчанию только Владелец)
  const defaultStaff: Employee[] = [];
  const savedStaff = typeof window !== 'undefined' ? localStorage.getItem('cargona_staff') : null;
  const rawStaff = ref<Employee[]>(safeParse<Employee[]>(savedStaff, defaultStaff));

  // 5. Клиенты (shallowRef для мгновенной работы с 10,000+ записями)
  const defaultCustomers: Customer[] = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cargona_customers');
    localStorage.removeItem('cargona_packages');
  }
  const rawCustomers = shallowRef<Customer[]>(defaultCustomers);

  // 6. Рейсы
  const defaultTrips: Trip[] = [];
  const savedTrips = typeof window !== 'undefined' ? localStorage.getItem('cargona_trips') : null;
  const rawTrips = shallowRef<Trip[]>(safeParse<Trip[]>(savedTrips, defaultTrips));

  // 7. Посылки (shallowRef для мгновенной работы с 10,000+ записями)
  const defaultPackages: PackageItem[] = [];
  const rawPackages = shallowRef<PackageItem[]>(defaultPackages);

  // 8. Аудит (Неизменяемый журнал с привязкой к ПВЗ)
  const defaultAuditLogs: AuditEntry[] = [];
  const savedAuditLogs = typeof window !== 'undefined' ? localStorage.getItem('cargona_audit_logs') : null;
  const rawAuditLogs = shallowRef<AuditEntry[]>(safeParse<AuditEntry[]>(savedAuditLogs, defaultAuditLogs));

  // 9. Бухгалтерия и Финансы (Кассы, Счета, Транзакции, Инкассация)
  const defaultExpenseCategories: ExpenseCategory[] = [
    { id: 'cat-rent', name: 'Аренда складов и ПВЗ', code: 'RENT', isDirectCost: false, isActive: true },
    { id: 'cat-salaries', name: 'Зарплаты персонала', code: 'SALARIES', isDirectCost: false, isActive: true },
    { id: 'cat-freight', name: 'Магистральный фрахт (фура/авиа)', code: 'FREIGHT', isDirectCost: true, isActive: true },
    { id: 'cat-customs', name: 'Таможенные сборы и очистка', code: 'CUSTOMS', isDirectCost: true, isActive: true },
    { id: 'cat-warehouse', name: 'Складские расходы (Иу/Гуанчжоу)', code: 'WAREHOUSE', isDirectCost: true, isActive: true },
    { id: 'cat-supplies', name: 'Расходные материалы (термолента/скотч)', code: 'SUPPLIES', isDirectCost: false, isActive: true },
    { id: 'cat-marketing', name: 'Маркетинг и реклама', code: 'MARKETING', isDirectCost: false, isActive: true },
    { id: 'cat-utilities', name: 'Коммунальные и хоз. нужды', code: 'UTILITIES', isDirectCost: false, isActive: true },
    { id: 'cat-taxes', name: 'Налоги и банковские комиссии', code: 'TAXES', isDirectCost: false, isActive: true },
    { id: 'cat-other', name: 'Прочие операционные расходы', code: 'OTHER', isDirectCost: false, isActive: true },
  ];

  const savedCashAccounts = typeof window !== 'undefined' ? localStorage.getItem('cargona_cash_accounts') : null;
  const rawCashAccounts = ref<CashAccount[]>(safeParse<CashAccount[]>(savedCashAccounts, []));

  const savedTransactions = typeof window !== 'undefined' ? localStorage.getItem('cargona_fin_transactions') : null;
  const rawFinancialTransactions = ref<FinancialTransaction[]>(safeParse<FinancialTransaction[]>(savedTransactions, []));

  const savedCollections = typeof window !== 'undefined' ? localStorage.getItem('cargona_cash_collections') : null;
  const rawCashCollections = ref<CashCollection[]>(safeParse<CashCollection[]>(savedCollections, []));

  const savedTripExpenses = typeof window !== 'undefined' ? localStorage.getItem('cargona_trip_expenses') : null;
  const rawTripExpenses = ref<TripExpense[]>(safeParse<TripExpense[]>(savedTripExpenses, []));

  const rawExpenseCategories = ref<ExpenseCategory[]>(defaultExpenseCategories);

  // Реактивная синхронизация с LocalStorage
  if (typeof window !== 'undefined') {
    watch(rawBranches, (val) => {
      localStorage.setItem('cargona_branches', JSON.stringify(val));
    }, { deep: true });

    watch(rawTrips, (val) => {
      localStorage.setItem('cargona_trips', JSON.stringify(val));
    }, { deep: true });

    watch(rawAuditLogs, (val) => {
      localStorage.setItem('cargona_audit_logs', JSON.stringify(val));
    }, { deep: true });

    watch(rawStaff, (val) => {
      localStorage.setItem('cargona_staff', JSON.stringify(val));
    }, { deep: true });

    watch(rawCashAccounts, (val) => {
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(val));
    }, { deep: true });

    watch(rawFinancialTransactions, (val) => {
      localStorage.setItem('cargona_fin_transactions', JSON.stringify(val));
    }, { deep: true });

    watch(rawCashCollections, (val) => {
      localStorage.setItem('cargona_cash_collections', JSON.stringify(val));
    }, { deep: true });

    watch(rawTripExpenses, (val) => {
      localStorage.setItem('cargona_trip_expenses', JSON.stringify(val));
    }, { deep: true });

    watch(settings, (val) => {
      localStorage.setItem(`cargona_settings_${activeTenantSlug.value || 'cargona'}`, JSON.stringify(val));
      localStorage.setItem('cargona_settings', JSON.stringify(val));
    }, { deep: true });

    watch(ratesToUSD, (val) => {
      localStorage.setItem('cargona_rates', JSON.stringify(val));
    }, { deep: true });
  }

  // --- ИЗОЛЯЦИЯ ДАННЫХ ТЕНАНТА (MULTI-TENANT FILTERED GETTERS) ---
  const branches = computed<Branch[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawBranches.value;
    return rawBranches.value.filter((b) => (b.tenantSlug ? b.tenantSlug === slug : false));
  });

  const staff = computed<Employee[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawStaff.value;
    return rawStaff.value.filter((s) => (s.tenantSlug ? s.tenantSlug === slug : false));
  });

  const customers = computed<Customer[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawCustomers.value;
    return rawCustomers.value.filter((c) => (c.tenantSlug ? c.tenantSlug === slug : false));
  });

  const trips = computed<Trip[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawTrips.value;
    return rawTrips.value.filter((t) => (t.tenantSlug ? t.tenantSlug === slug : false));
  });

  const packages = computed<PackageItem[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawPackages.value;
    return rawPackages.value.filter((p) => (p.tenantSlug ? p.tenantSlug === slug : false));
  });

  const auditLogs = computed<AuditEntry[]>(() => {
    const slug = activeTenantSlug.value;
    if (!slug) return rawAuditLogs.value;
    return rawAuditLogs.value.filter((a) => (a.tenantSlug ? a.tenantSlug === slug : false));
  });

  const cashAccounts = computed<CashAccount[]>(() => {
    const slug = activeTenantSlug.value;
    const baseList = slug ? rawCashAccounts.value.filter((a) => !a.tenantSlug || a.tenantSlug === slug) : rawCashAccounts.value;
    const list = [...baseList];

    // Ensure Safe account exists
    if (!list.some((a) => a.type === 'SAFE')) {
      list.unshift({
        id: `acc-safe-${slug || 'cargona'}`,
        name: 'Главный сейф (Офис)',
        type: 'SAFE',
        currency: activeCurrency.value,
        balanceUSD: 0,
        isActive: true,
        tenantSlug: slug,
      });
    }

    // Ensure Bank account exists
    if (!list.some((a) => a.type === 'BANK')) {
      list.unshift({
        id: `acc-bank-${slug || 'cargona'}`,
        name: 'Расчетный счет / Эквайринг',
        type: 'BANK',
        currency: activeCurrency.value,
        balanceUSD: 0,
        isActive: true,
        tenantSlug: slug,
      });
    }

    // Ensure account for each PVZ branch
    for (const b of branches.value) {
      if (!list.some((a) => a.branchId === b.id || a.id === `acc-pvz-${b.id}`)) {
        list.push({
          id: `acc-pvz-${b.id}`,
          name: `Касса: ${b.name}`,
          type: 'CASH_PVZ',
          branchId: b.id,
          currency: activeCurrency.value,
          balanceUSD: b.cashBalanceUSD || 0,
          isActive: true,
          tenantSlug: slug,
        });
      }
    }

    return list;
  });

  const financialTransactions = computed<FinancialTransaction[]>(() => {
    const slug = activeTenantSlug.value;
    const list = slug ? rawFinancialTransactions.value.filter((t) => !t.tenantSlug || t.tenantSlug === slug) : rawFinancialTransactions.value;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const cashCollections = computed<CashCollection[]>(() => {
    const slug = activeTenantSlug.value;
    const list = slug ? rawCashCollections.value.filter((c) => !c.tenantSlug || c.tenantSlug === slug) : rawCashCollections.value;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const tripExpenses = computed<TripExpense[]>(() => {
    const slug = activeTenantSlug.value;
    return slug ? rawTripExpenses.value.filter((e) => !e.tenantSlug || e.tenantSlug === slug) : rawTripExpenses.value;
  });

  const expenseCategories = computed<ExpenseCategory[]>(() => rawExpenseCategories.value);

  // P&L and Financial Summary
  const financialSummary = computed(() => {
    let pvzUSD = 0;
    for (const b of branches.value) {
      pvzUSD += (b.cashBalanceUSD || 0);
    }
    const safeAccount = cashAccounts.value.find((a) => a.type === 'SAFE');
    const bankAccount = cashAccounts.value.find((a) => a.type === 'BANK');
    const safeUSD = safeAccount ? (safeAccount.balanceUSD || 0) : 0;
    const bankUSD = bankAccount ? (bankAccount.balanceUSD || 0) : 0;
    const totalCashUSD = pvzUSD + safeUSD + bankUSD;

    const deliveredPkgs = packages.value.filter((p) => p.status === 'RELEASED' || p.status === 'READY_FOR_PICKUP');
    const deliveredRevenueUSD = deliveredPkgs.reduce((acc, p) => acc + (p.costUSD || 0), 0);

    const directFreightCostsUSD = tripExpenses.value.reduce((acc, e) => acc + (e.amountUSD || 0), 0);

    const opexUSD = financialTransactions.value
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + (t.amountUSD || 0), 0);

    const netProfitUSD = deliveredRevenueUSD - directFreightCostsUSD - opexUSD;
    const marginPercent = deliveredRevenueUSD > 0 ? ((netProfitUSD / deliveredRevenueUSD) * 100).toFixed(1) : '0';

    const debtors = customers.value.filter((c) => (c.balanceUSD || 0) < 0);
    const totalDebtUSD = Math.abs(debtors.reduce((acc, c) => acc + (c.balanceUSD || 0), 0));

    return {
      totalCashUSD,
      pvzUSD,
      safeUSD,
      bankUSD,
      deliveredRevenueUSD,
      directFreightCostsUSD,
      opexUSD,
      netProfitUSD,
      marginPercent: Number(marginPercent),
      totalDebtUSD,
      debtorsCount: debtors.length,
      debtors,
    };
  });

  // Trip Unit Economics & Margins
  const tripFinancials = computed(() => {
    return trips.value.map((t) => {
      const tripPkgs = packages.value.filter((p) => p.tripId === t.id);
      const totalWeight = tripPkgs.reduce((acc, p) => acc + (p.weightKg || 0), 0) || t.totalWeightKg || 0;
      const revenueUSD = tripPkgs.reduce((acc, p) => acc + (p.costUSD || 0), 0);
      
      const directExpenses = tripExpenses.value.filter((e) => e.tripId === t.id);
      const directCostUSD = directExpenses.reduce((acc, e) => acc + (e.amountUSD || 0), 0);

      const marginUSD = revenueUSD - directCostUSD;
      const marginPercent = revenueUSD > 0 ? ((marginUSD / revenueUSD) * 100).toFixed(1) : '0';
      const costPerKg = totalWeight > 0 ? (directCostUSD / totalWeight).toFixed(2) : '0.00';
      const revenuePerKg = totalWeight > 0 ? (revenueUSD / totalWeight).toFixed(2) : '0.00';

      return {
        ...t,
        packageCount: tripPkgs.length,
        actualWeightKg: totalWeight,
        revenueUSD,
        directCostUSD,
        marginUSD,
        marginPercent: Number(marginPercent),
        costPerKg: Number(costPerKg),
        revenuePerKg: Number(revenuePerKg),
        expenses: directExpenses,
      };
    });
  });

  function addAudit(
    action: string,
    actionLabel: string,
    target: string,
    details: string,
    user: string = currentUser.value?.name || 'operator',
    branchId: string = 'b-1',
    branchName?: string
  ) {
    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const branch = branches.value.find((b) => b.id === branchId);
    const originWh = originWarehouses.value.find((w) => w.id === branchId || (w.id === 'wh-cn' && branchId === 'b-origin'));
    const resolvedBranchName = branchName || (branch ? branch.name : originWh ? `Склад ${originWh.city} (${originWh.country})` : branchId === 'b-origin' ? 'Склад Иу (Китай)' : 'ПВЗ Душанбе Центр');

    rawAuditLogs.value.unshift({
      id: nextSeqId('log', rawAuditLogs.value),
      time: timeStr,
      action,
      actionLabel,
      target,
      user,
      details,
      branchId,
      branchName: resolvedBranchName,
      tenantSlug: activeTenantSlug.value,
    });
  }

  // --- ACTIONS ---

  // Создание нового филиала ПВЗ
  function addBranch(data: Omit<Branch, 'id'>) {
    const id = nextSeqId('b', rawBranches.value);
    const newB: Branch = {
      id,
      tenantSlug: activeTenantSlug.value,
      cashBalanceUSD: 0,
      cells: [],
      ...data,
    };
    rawBranches.value.push(newB);
    addAudit('CREATE', 'Новый филиал', newB.name, `Создан филиал ${newB.name} (${newB.city})`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch {}

    return newB;
  }

  // Создание нового рейса
  function addTrip(data: Omit<Trip, 'id'>) {
    const id = nextSeqId('trip', rawTrips.value);
    const newT: Trip = {
      id,
      tenantSlug: activeTenantSlug.value,
      manifestItems: [],
      ...data,
    };
    rawTrips.value.unshift(newT);
    addAudit('CREATE', 'Создан рейс', newT.tripCode, `Рейс ${newT.tripCode} (${newT.route}) добавлен`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/trips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newT),
        });
      }
    } catch {}

    return newT;
  }

  // Манифест рейса: Добавление груза / тарного места
  function addTripManifestItem(tripId: string, item: Omit<TripManifestItem, 'id'>) {
    const trip = rawTrips.value.find((t) => t.id === tripId);
    if (!trip) return;
    const allManifestItems = rawTrips.value.flatMap((t) => t.manifestItems || []);
    const newItem: TripManifestItem = {
      id: nextSeqId('m', allManifestItems),
      ...item,
    };
    if (!trip.manifestItems) trip.manifestItems = [];
    trip.manifestItems.push(newItem);
    trip.totalWeightKg = trip.manifestItems.reduce((acc, i) => acc + i.weightKg, 0);
    trip.totalVolumeM3 = Math.round(trip.manifestItems.reduce((acc, i) => acc + i.volumeM3, 0) * 10) / 10;
    trip.sackCount = trip.manifestItems.length;
    addAudit('MANIFEST', 'Груз в манифест', trip.tripCode, `Добавлено: ${item.sackNumber} (${item.category}), вес ${item.weightKg} кг, ${item.volumeM3} м³`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/trips/${tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestItems: trip.manifestItems, totalWeightKg: trip.totalWeightKg, totalVolumeM3: trip.totalVolumeM3 }),
        });
      }
    } catch {}
  }

  // Манифест рейса: Удаление позиции
  function removeTripManifestItem(tripId: string, itemId: string) {
    const trip = rawTrips.value.find((t) => t.id === tripId);
    if (!trip || !trip.manifestItems) return;
    const index = trip.manifestItems.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      const removed = trip.manifestItems.splice(index, 1)[0];
      trip.totalWeightKg = trip.manifestItems.reduce((acc, i) => acc + i.weightKg, 0);
      trip.totalVolumeM3 = Math.round(trip.manifestItems.reduce((acc, i) => acc + i.volumeM3, 0) * 10) / 10;
      trip.sackCount = trip.manifestItems.length;
      addAudit('MANIFEST', 'Удален из манифеста', trip.tripCode, `Удалена позиция ${removed.sackNumber}`);

      try {
        const slug = activeTenantSlug.value;
        if (slug) {
          fetch(`/api/o/${slug}/trips/${tripId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manifestItems: trip.manifestItems, totalWeightKg: trip.totalWeightKg, totalVolumeM3: trip.totalVolumeM3 }),
          });
        }
      } catch {}
    }
  }

  // Изменение статуса рейса с реальным обновлением привязанных посылок!
  function updateTripStatus(tripId: string, newStatus: Trip['status']) {
    const trip = rawTrips.value.find((t) => t.id === tripId);
    if (!trip) return;
    const oldStatus = trip.status;
    trip.status = newStatus;

    let packageTargetStatus: PackageItem['status'] | null = null;
    if (newStatus === 'IN_TRANSIT') packageTargetStatus = 'IN_TRANSIT';
    if (newStatus === 'CUSTOMS') packageTargetStatus = 'CUSTOMS';
    if (newStatus === 'ARRIVED') packageTargetStatus = 'READY_FOR_PICKUP';

    if (packageTargetStatus) {
      rawPackages.value.forEach((p) => {
        if (p.tripId === tripId && p.status !== 'RELEASED' && p.status !== 'RETURNED') {
          p.status = packageTargetStatus!;
        }
      });
    }

    addAudit('STATUS_CHANGE', 'Рейс обновлен', trip.tripCode, `Статус изменен с ${oldStatus} на ${newStatus}. Посылки синхронизированы.`, 'dispatcher', 'b-1', 'Главный логистический хаб');

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/trips/${tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch {}
  }

  // Оформление возврата товара (Return of goods)
  function processPackageReturn(pkgId: string, reason: string, refundAmountUSD: number = 0, returnTrackingNumber: string = '') {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    const oldStatus = pkg.status;
    pkg.status = 'RETURNED';
    pkg.returnReason = reason;
    pkg.refundAmountUSD = refundAmountUSD;
    pkg.returnTrackingNumber = returnTrackingNumber;

    if (refundAmountUSD > 0 && pkg.customerCargoCode) {
      const cust = rawCustomers.value.find((c) => c.cargoCode === pkg.customerCargoCode);
      if (cust) {
        cust.balanceUSD += refundAmountUSD;
      }
    }

    addAudit('RETURN', 'Возврат товара', pkg.trackingNumber, `Причина: ${reason}. Возврат средств клиенту: ${formatMoney(refundAmountUSD)}`, currentUser.value?.name || 'operator', pkg.branchId);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages/${pkgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RETURNED', returnReason: reason, refundAmountUSD, returnTrackingNumber }),
        });
      }
    } catch {}
  }

  // Изменение статуса посылки
  function updatePackageStatus(pkgId: string, newStatus: PackageItem['status']) {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    const oldStatus = pkg.status;
    pkg.status = newStatus;
    const branch = rawBranches.value.find((b) => b.id === pkg.branchId);
    addAudit('STATUS_CHANGE', 'Статус посылки', pkg.trackingNumber, `Статус изменен с ${oldStatus} на ${newStatus}`, currentUser.value?.name || 'operator', pkg.branchId || 'b-1', branch?.name);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages/${pkgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch {}
  }

  // Назначение полки хранения в ПВЗ (с выбором филиала и полки!)
  function assignShelf(pkgId: string, shelf: string, branchId: string = 'b-1') {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    pkg.shelfLocation = shelf;
    pkg.branchId = branchId;
    const branch = rawBranches.value.find((b) => b.id === branchId);
    const branchName = branch ? branch.name : 'ПВЗ Душанбе Центр';
    addAudit('CELL_ASSIGN', 'Назначение полки', pkg.trackingNumber, `Привязана ${shelf} (${branchName})`, currentUser.value?.name || 'operator', branchId, branchName);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages/${pkgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shelfLocation: shelf, branchId }),
        });
      }
    } catch {}
  }

  // Инкассация ПВЗ
  function collectBranchCash(branchId: string): number {
    const branch = rawBranches.value.find((b) => b.id === branchId);
    if (!branch) return 0;
    const collectedUSD = branch.cashBalanceUSD;
    branch.cashBalanceUSD = 0;
    addAudit('CASH_COLLECT', 'Инкассация', branch.name, `Изъято ${formatMoney(collectedUSD)}. Касса обнулена`, currentUser.value?.name || 'Владелец', branch.id, branch.name);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/branches/${branchId}/collection`, {
          method: 'POST',
        });
      }
    } catch {}

    return collectedUSD;
  }

  // Добавление ячейки на ПВЗ или склад
  function addBranchCell(branchId: string, rack: string, shelf: string) {
    if (branchId.startsWith('wh-') || branchId === 'b-origin') {
      return addWarehouseCell(branchId, rack, shelf);
    }
    const branch = rawBranches.value.find((b) => b.id === branchId);
    if (!branch) return;
    const allBranchCells = rawBranches.value.flatMap((b) => b.cells || []);
    const cellId = nextSeqId('c', allBranchCells);
    const barcode = `CELL-${rack.replace(/\s+/g, '')}-${shelf.replace(/\s+/g, '')}`;
    branch.cells.push({
      id: cellId,
      rack,
      shelf,
      barcode,
      packageCount: 0,
    });
    addAudit('CREATE', 'Новая ячейка', `${branch.name} / ${shelf}`, `Создана ячейка ${rack}, ${shelf}`);
  }

  // Добавление сотрудника
  function addEmployee(data: Omit<Employee, 'id'>) {
    const id = nextSeqId('emp', rawStaff.value);
    rawStaff.value.push({ id, tenantSlug: activeTenantSlug.value, ...data });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_staff', JSON.stringify(rawStaff.value));
    }
    addAudit('CREATE', 'Сотрудник создан', data.fullName, `Роль: ${data.role}, филиал: ${data.branchName}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch {}
  }

  // Переключение блокировки сотрудника
  function toggleEmployeeStatus(id: string) {
    const emp = rawStaff.value.find((e) => e.id === id);
    if (!emp) return;
    emp.isActive = !emp.isActive;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_staff', JSON.stringify(rawStaff.value));
    }
    addAudit('UPDATE', 'Статус сотрудника', emp.fullName, emp.isActive ? 'Активирован' : 'Деактивирован');

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/staff/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: emp.isActive }),
        });
      }
    } catch {}
  }

  // Создание клиента
  function addCustomer(data: Omit<Customer, 'id' | 'balanceUSD' | 'isBlocked'>) {
    const id = nextSeqId('c', rawCustomers.value);
    rawCustomers.value.unshift({
      id,
      tenantSlug: activeTenantSlug.value,
      ...data,
      balanceUSD: 0,
      isBlocked: false,
      preferredBranchId: data.preferredBranchId || branches.value[0]?.id || 'b-1',
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_customers', JSON.stringify(rawCustomers.value));
    }
    addAudit('CREATE', 'Новый клиент', data.cargoCode, `Зарегистрирован ${data.fullName}, тел: ${data.phone}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch {}
  }

  // Привязка и смена предпочитаемого ПВЗ клиента
  function setCustomerPreferredBranch(cargoCode: string, branchId: string) {
    const c = rawCustomers.value.find((cust) => cust.cargoCode.toUpperCase() === cargoCode.toUpperCase());
    if (c) {
      c.preferredBranchId = branchId;
      rawPackages.value.forEach((p) => {
        if (p.customerCargoCode.toUpperCase() === cargoCode.toUpperCase() && p.status !== 'RELEASED' && p.status !== 'RETURNED') {
          p.branchId = branchId;
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('cargona_customers', JSON.stringify(rawCustomers.value));
        localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
      }
      const branch = rawBranches.value.find((b) => b.id === branchId);
      addAudit('UPDATE', 'Смена ПВЗ клиента', cargoCode, `Назначен пункт выдачи: ${branch?.name || branchId}`);

      try {
        const slug = activeTenantSlug.value;
        if (slug && c.id) {
          fetch(`/api/o/${slug}/customers/${c.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredBranchId: branchId }),
          });
        }
      } catch {}
    }
  }

  // Корректировка баланса клиента (пополнение или списание)
  function adjustCustomerBalance(customerId: string, deltaUSD: number, reason: string) {
    const c = rawCustomers.value.find((cust) => cust.id === customerId);
    if (!c) return;
    c.balanceUSD += deltaUSD;
    addAudit('PAYMENT', 'Баланс клиента', c.cargoCode, `${deltaUSD >= 0 ? '+' : ''}${formatMoney(deltaUSD)} (${reason})`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/customers/${customerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ balanceUSD: c.balanceUSD }),
        });
      }
    } catch {}
  }

  // Подтверждение выдачи и оплаты клиенту (с поддержкой выбора конкретных посылок и фото-фиксации)
  function handoverClientPackages(cargoCode: string, branchId: string = 'b-1', packageIds?: string[], handoverPhoto?: string): number {
    const clientPkgs = rawPackages.value.filter((p) => {
      const isClient = p.customerCargoCode.toUpperCase() === cargoCode.toUpperCase();
      const isReady = p.status === 'READY_FOR_PICKUP';
      const isMatch = packageIds && packageIds.length > 0 ? packageIds.includes(p.id) : true;
      return isClient && isReady && isMatch;
    });
    if (clientPkgs.length === 0) return 0;

    let totalSumUSD = 0;
    const nowIso = new Date().toISOString();
    const pkgIdList: string[] = [];
    clientPkgs.forEach((p) => {
      p.status = 'RELEASED';
      p.shelfLocation = '';
      p.releasedAt = nowIso;
      if (handoverPhoto) {
        p.handoverPhoto = handoverPhoto;
        if (!p.photos) p.photos = [];
        p.photos.push(handoverPhoto);
      }
      totalSumUSD += p.costUSD;
      pkgIdList.push(p.id);
    });

    const branch = rawBranches.value.find((b) => b.id === branchId) || rawBranches.value[0];
    if (branch) {
      branch.cashBalanceUSD = Math.round(((branch.cashBalanceUSD || 0) + totalSumUSD) * 100) / 100;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
      localStorage.setItem('cargona_branches', JSON.stringify(rawBranches.value));
    }

    addAudit(
      'HANDOVER',
      'Выдача по QR',
      cargoCode,
      `Выдано ${clientPkgs.length} посылок на сумму ${formatMoney(totalSumUSD)}. Внесено в кассу «${branch?.name || ''}»${handoverPhoto ? ' (с фото-фиксацией)' : ''}`,
      currentUser.value?.name || 'operator',
      branch?.id || branchId,
      branch?.name
    );

    try {
      const cust = rawCustomers.value.find((c) => c.cargoCode.toUpperCase() === cargoCode.toUpperCase());
      const slug = activeTenantSlug.value;
      fetch('/api/wms/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cust?.id || 'cust-direct',
          packageIds: pkgIdList,
          amountPaid: totalSumUSD,
          paymentMethod: 'CASH',
          branchId: branch?.id || branchId,
          handoverPhoto: handoverPhoto || undefined,
          tenantSlug: slug || undefined,
        }),
      });
    } catch {}

    return totalSumUSD;
  }

  // Массовая приемка списком трек-номеров
  function bulkIntakePackages(data: {
    trackingNumbers: string[];
    targetBranchId?: string;
    customerCargoCode?: string;
    status?: 'RECEIVED_AT_ORIGIN' | 'READY_FOR_PICKUP';
    weightKg?: number;
    description?: string;
  }): { count: number; packages: PackageItem[] } {
    const results: PackageItem[] = [];
    const requestedBranchId = data.targetBranchId || 'b-1';
    const isOrigin = requestedBranchId.startsWith('wh-') || requestedBranchId === 'b-origin';
    const originWh = isOrigin
      ? originWarehouses.value.find((w) => w.id === requestedBranchId || (w.id === 'wh-cn' && requestedBranchId === 'b-origin'))
      : null;
    const branch = !isOrigin ? rawBranches.value.find((b) => b.id === requestedBranchId) : null;
    const targetBranchId = originWh ? (requestedBranchId === 'b-origin' ? 'b-origin' : originWh.id) : branch?.id || 'b-1';
    const targetStatus = data.status || (isOrigin ? 'RECEIVED_AT_ORIGIN' : 'READY_FOR_PICKUP');

    const defaultWeight = data.weightKg || 1.0;
    const activeRate = ratesToUSD.value[activeCurrency.value] || 1;
    const defaultCostUSD = Math.max(
      Math.round(settings.value.autoDeliveryRatePerKgUSD * defaultWeight * 100) / 100,
      settings.value.minPackageCostUSD
    );

    for (const trackRaw of data.trackingNumbers) {
      const track = trackRaw.trim().toUpperCase();
      if (!track) continue;

      let existing = rawPackages.value.find((p) => p.trackingNumber.toUpperCase() === track);
      if (existing) {
        if (data.customerCargoCode) existing.customerCargoCode = data.customerCargoCode.toUpperCase();
        existing.branchId = targetBranchId;
        existing.status = targetStatus;
        results.push(existing);
      } else {
        const now = new Date();
        const createdAt = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
        const newPkg: PackageItem = {
          id: nextSeqId('pkg', rawPackages.value),
          tenantSlug: activeTenantSlug.value,
          trackingNumber: track,
          customerCargoCode: (data.customerCargoCode || 'БЕЗ КОДА').toUpperCase(),
          description: data.description || 'Товары народного потребления',
          weightKg: defaultWeight,
          costUSD: defaultCostUSD,
          shelfLocation: isOrigin ? (originWh?.cells?.[0]?.shelf || 'Паллет CN-01') : '',
          branchId: targetBranchId,
          status: targetStatus,
          createdAt,
        };
        rawPackages.value.unshift(newPkg);
        results.push(newPkg);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
    }

    const branchName = originWh ? `Склад ${originWh.city} (${originWh.country})` : branch?.name || 'ПВЗ';
    addAudit(
      'BULK_INTAKE',
      'Массовая приемка',
      `${results.length} трек-номеров`,
      `Массово оприходовано ${results.length} посылок в «${branchName}», статус: ${targetStatus}`,
      currentUser.value?.name || 'operator',
      targetBranchId,
      branchName
    );

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingNumbers: data.trackingNumbers,
            targetBranchId,
            customerCargoCode: data.customerCargoCode,
            status: targetStatus,
            weightKg: defaultWeight,
          }),
        });
      }
    } catch {}

    return { count: results.length, packages: results };
  }

  // Оставить отзыв о посылке / сервисе
  function submitPackageReview(pkgId: string, rating: number, comment: string = '') {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    pkg.reviewRating = rating;
    pkg.reviewComment = comment;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
    }
    addAudit('REVIEW', 'Отзыв клиента', pkg.trackingNumber, `Оценка: ${rating}/5${comment ? `. Комментарий: ${comment}` : ''}`, pkg.customerCargoCode, pkg.branchId);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages/${pkgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewRating: rating, reviewComment: comment }),
        });
      }
    } catch {}
  }

  // Включение/отключение уведомления о готовности
  function toggleNotifyWhenReady(pkgId: string, enabled: boolean = true) {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    pkg.notifiedReady = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
    }
  }

  // Онлайн оплата посылки
  function payPackageOnline(pkgId: string) {
    const pkg = rawPackages.value.find((p) => p.id === pkgId);
    if (!pkg) return;
    pkg.isPaidOnline = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_packages', JSON.stringify(rawPackages.value));
    }
    addAudit('PAYMENT', 'Онлайн оплата', pkg.trackingNumber, `Оплачено картой: ${formatMoney(pkg.costUSD)}`, pkg.customerCargoCode, pkg.branchId);
  }

  // Приемка товара на склад или ПВЗ (Intake со сканером ШК)
  function intakePackage(data: {
    trackingNumber: string;
    customerCargoCode?: string;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    description?: string;
    costUSD?: number;
    branchId?: string;
    shelfLocation?: string;
    status?: 'RECEIVED_AT_ORIGIN' | 'READY_FOR_PICKUP';
  }): PackageItem {
    const track = data.trackingNumber.trim().toUpperCase();
    let existing = rawPackages.value.find((p) => p.trackingNumber.toUpperCase() === track);

    const length = data.lengthCm || (existing ? existing.lengthCm || 0 : 0);
    const width = data.widthCm || (existing ? existing.widthCm || 0 : 0);
    const height = data.heightCm || (existing ? existing.heightCm || 0 : 0);
    const weight = data.weightKg !== undefined ? data.weightKg : (existing ? existing.weightKg : 1.0);
    const volumeM3 = length && width && height ? Math.round(((length * width * height) / 1000000) * 10000) / 10000 : existing?.volumeM3 || 0;
    const areaM2 = length && width ? Math.round(((length * width) / 10000) * 1000) / 1000 : existing?.areaM2 || 0;
    const densityKgM3 = volumeM3 > 0 ? Math.round(weight / volumeM3) : existing?.densityKgM3 || 0;
    const volumetricWeightKg = length && width && height ? Math.round(((length * width * height) / 5000) * 100) / 100 : existing?.volumetricWeightKg || 0;

    const requestedBranchId = data.branchId || (existing ? existing.branchId : 'b-1');
    const isOrigin = requestedBranchId?.startsWith('wh-') || requestedBranchId === 'b-origin';
    const originWh = isOrigin
      ? originWarehouses.value.find((w) => w.id === requestedBranchId || (w.id === 'wh-cn' && requestedBranchId === 'b-origin'))
      : null;
    const branch = !isOrigin ? rawBranches.value.find((b) => b.id === (requestedBranchId || 'b-1')) : null;

    const targetBranchId = originWh ? (requestedBranchId === 'b-origin' ? 'b-origin' : originWh.id) : branch?.id || 'b-1';
    const targetBranchName = originWh ? `Склад ${originWh.city} (${originWh.country})` : branch?.name || 'ПВЗ Душанбе Центр';
    const targetStatus = data.status || (originWh ? 'RECEIVED_AT_ORIGIN' : data.shelfLocation ? 'READY_FOR_PICKUP' : 'RECEIVED_AT_ORIGIN');
    const auditActionLabel = originWh ? 'Приемка на складе' : 'Приемка в ПВЗ';
    const operatorUser = currentUser.value?.name || (originWh ? 'farhod_china' : 'operator');

    if (existing) {
      if (data.customerCargoCode) existing.customerCargoCode = data.customerCargoCode.toUpperCase();
      if (data.description) existing.description = data.description;
      if (data.weightKg !== undefined) existing.weightKg = data.weightKg;
      if (data.costUSD !== undefined) existing.costUSD = data.costUSD;
      if (data.shelfLocation !== undefined) existing.shelfLocation = data.shelfLocation;
      existing.branchId = targetBranchId;
      existing.lengthCm = length;
      existing.widthCm = width;
      existing.heightCm = height;
      existing.volumeM3 = volumeM3;
      existing.areaM2 = areaM2;
      existing.densityKgM3 = densityKgM3;
      existing.volumetricWeightKg = volumetricWeightKg;
      existing.status = targetStatus;

      addAudit(
        'INTAKE',
        auditActionLabel,
        existing.trackingNumber,
        `Принято в ${targetBranchName}. Вес: ${weight} кг, габариты: ${length}x${width}x${height} см, ${originWh ? 'паллет/зона' : 'ячейка'}: ${existing.shelfLocation || 'не назначена'}`,
        operatorUser,
        targetBranchId,
        targetBranchName
      );

      try {
        const slug = activeTenantSlug.value;
        if (slug) {
          fetch(`/api/o/${slug}/packages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existing),
          });
        }
      } catch {}

      return existing;
    }

    const now = new Date();
    const createdAt = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

    const newPkg: PackageItem = {
      id: nextSeqId('pkg', rawPackages.value),
      tenantSlug: activeTenantSlug.value,
      trackingNumber: track,
      customerCargoCode: (data.customerCargoCode || 'БЕЗ КОДА').toUpperCase(),
      description: data.description || 'Товары народного потребления',
      weightKg: weight,
      costUSD: data.costUSD || 3.5,
      lengthCm: length,
      widthCm: width,
      heightCm: height,
      volumeM3,
      areaM2,
      densityKgM3,
      volumetricWeightKg,
      shelfLocation: data.shelfLocation || (originWh ? originWh.cells?.[0]?.shelf || 'Паллет CN-01' : ''),
      branchId: targetBranchId,
      status: targetStatus,
      createdAt,
    };

    rawPackages.value.unshift(newPkg);
    addAudit(
      'INTAKE',
      auditActionLabel,
      newPkg.trackingNumber,
      `Оприходовано в ${targetBranchName}. Клиент: ${newPkg.customerCargoCode}, вес: ${newPkg.weightKg} кг, ${originWh ? 'паллет/зона' : 'ячейка'}: ${newPkg.shelfLocation || 'склад'}`,
      operatorUser,
      targetBranchId,
      targetBranchName
    );

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPkg),
        });
      }
    } catch {}

    return newPkg;
  }

  // Погрузка товара в рейс по ШК или ID
  function addPackageToTrip(tripId: string, packageIdOrTrack: string): boolean {
    const trip = rawTrips.value.find((t) => t.id === tripId);
    if (!trip) return false;

    const query = packageIdOrTrack.trim().toUpperCase();
    const pkg = rawPackages.value.find((p) => p.id === packageIdOrTrack || p.trackingNumber.toUpperCase() === query);
    if (!pkg) return false;

    pkg.tripId = trip.id;
    pkg.status = 'IN_TRANSIT';

    trip.totalWeightKg = Math.round((trip.totalWeightKg + (pkg.weightKg || 0)) * 100) / 100;
    const pkgVol = pkg.volumeM3 || 0.04;
    trip.totalVolumeM3 = Math.round((trip.totalVolumeM3 + pkgVol) * 100) / 100;

    if (!trip.manifestItems) trip.manifestItems = [];
    const allManifestItems = rawTrips.value.flatMap((t) => t.manifestItems || []);
    trip.manifestItems.push({
      id: nextSeqId('m', allManifestItems),
      sackNumber: `PKG-${pkg.trackingNumber.slice(-6)}`,
      category: pkg.description || 'Сборный груз',
      description: `Посылка ${pkg.trackingNumber} (${pkg.customerCargoCode})`,
      weightKg: pkg.weightKg || 1,
      volumeM3: pkgVol,
      packageCount: 1,
      sealNumber: `PL-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    trip.sackCount = trip.manifestItems.length;

    addAudit('UPDATE', 'Погрузка в рейс', trip.tripCode, `Посылка ${pkg.trackingNumber} (${pkg.customerCargoCode}) погружена в рейс ${trip.tripCode}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/trips/${tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestItems: trip.manifestItems, totalWeightKg: trip.totalWeightKg, totalVolumeM3: trip.totalVolumeM3 }),
        });
        fetch(`/api/o/${slug}/packages/${pkg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_TRANSIT', tripId: trip.id }),
        });
      }
    } catch {}

    return true;
  }

  // Снятие товара с рейса
  function removePackageFromTrip(tripId: string, packageId: string): boolean {
    const trip = rawTrips.value.find((t) => t.id === tripId);
    if (!trip) return false;

    const pkg = rawPackages.value.find((p) => p.id === packageId);
    if (!pkg) return false;

    pkg.tripId = undefined;
    pkg.status = 'RECEIVED_AT_ORIGIN';

    trip.totalWeightKg = Math.max(0, Math.round((trip.totalWeightKg - (pkg.weightKg || 0)) * 100) / 100);
    const pkgVol = pkg.volumeM3 || 0.04;
    trip.totalVolumeM3 = Math.max(0, Math.round((trip.totalVolumeM3 - pkgVol) * 100) / 100);

    if (trip.manifestItems) {
      const idx = trip.manifestItems.findIndex((m) => m.description.includes(pkg.trackingNumber));
      if (idx !== -1) trip.manifestItems.splice(idx, 1);
      trip.sackCount = trip.manifestItems.length;
    }

    addAudit('UPDATE', 'Снятие с рейса', trip.tripCode, `Посылка ${pkg.trackingNumber} снята с рейса ${trip.tripCode}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/trips/${tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestItems: trip.manifestItems, totalWeightKg: trip.totalWeightKg, totalVolumeM3: trip.totalVolumeM3 }),
        });
        fetch(`/api/o/${slug}/packages/${pkg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RECEIVED_AT_ORIGIN', tripId: null }),
        });
      }
    } catch {}

    return true;
  }

  // Добавление новой посылки (с автоматическим расчетом кубатуры, площади и плотности)
  function addPackage(pkgData: Omit<PackageItem, 'id' | 'createdAt'>) {
    const id = nextSeqId('pkg', rawPackages.value);
    const now = new Date();
    const createdAt = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

    const length = pkgData.lengthCm || 0;
    const width = pkgData.widthCm || 0;
    const height = pkgData.heightCm || 0;
    const volumeM3 = pkgData.volumeM3 || (length && width && height ? Math.round(((length * width * height) / 1000000) * 10000) / 10000 : 0);
    const areaM2 = pkgData.areaM2 || (length && width ? Math.round(((length * width) / 10000) * 1000) / 1000 : 0);
    const densityKgM3 = volumeM3 > 0 ? Math.round(pkgData.weightKg / volumeM3) : 0;
    const volumetricWeightKg = length && width && height ? Math.round(((length * width * height) / 5000) * 100) / 100 : 0;

    const newPkg: PackageItem = {
      id,
      tenantSlug: activeTenantSlug.value,
      createdAt,
      ...pkgData,
      volumeM3,
      areaM2,
      densityKgM3,
      volumetricWeightKg,
    };
    rawPackages.value.unshift(newPkg);
    addAudit('CREATE', 'Новая посылка', pkgData.trackingNumber, `Клиент: ${pkgData.customerCargoCode}, вес: ${pkgData.weightKg} кг, объем: ${volumeM3} м³`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPkg),
        });
      }
    } catch {}
  }

  // Обновление курсов валют
  function updateRates(newRates: CurrencyRate) {
    ratesToUSD.value = { ...ratesToUSD.value, ...newRates };
    addAudit('TARIFF_CHANGE', 'Курсы валют', 'Мультивалютность', 'Обновлены курсы конвертации');
  }

  // ==========================================
  // 10. Financial Actions & Accounting Logic
  // ==========================================

  // Внесение расхода (OPEX)
  function addExpense(data: {
    accountId?: string;
    category: string;
    amount: number;
    currency?: string;
    branchId?: string;
    comment?: string;
    receiptUrl?: string;
  }) {
    const curr = data.currency || activeCurrency.value;
    const rate = ratesToUSD.value[curr] || 1;
    const amountUSD = Math.round((data.amount / rate) * 100) / 100;

    const safeAcc = cashAccounts.value.find((a) => a.type === 'SAFE');
    const targetAccountId = data.accountId || safeAcc?.id || 'acc-safe';

    const account = rawCashAccounts.value.find((a) => a.id === targetAccountId);
    if (account) {
      account.balanceUSD = Number(((account.balanceUSD || 0) - amountUSD).toFixed(2));
    }
    if (data.branchId) {
      const branch = rawBranches.value.find((b) => b.id === data.branchId);
      if (branch && targetAccountId.includes(data.branchId)) {
        branch.cashBalanceUSD = Math.max(0, Number(((branch.cashBalanceUSD || 0) - amountUSD).toFixed(2)));
      }
    }

    const tx: FinancialTransaction = {
      id: nextSeqId('tx', rawFinancialTransactions.value),
      accountId: targetAccountId,
      type: 'EXPENSE',
      category: data.category || 'Прочие расходы',
      amountUSD,
      amountLocal: data.amount,
      currency: curr,
      relatedBranchId: data.branchId || null,
      comment: data.comment || null,
      receiptUrl: data.receiptUrl || null,
      createdBy: currentUser.value?.name || 'Бухгалтер',
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    };

    rawFinancialTransactions.value.unshift(tx);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_fin_transactions', JSON.stringify(rawFinancialTransactions.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
      localStorage.setItem('cargona_branches', JSON.stringify(rawBranches.value));
    }

    addAudit('PAYMENT', 'Расход компании', data.category, `Списано ${formatMoney(amountUSD)} (${data.category})${data.comment ? `: ${data.comment}` : ''}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: targetAccountId,
            type: 'EXPENSE',
            category: data.category,
            amount: data.amount,
            currency: curr,
            amountUSD,
            relatedBranchId: data.branchId,
            comment: data.comment,
            receiptUrl: data.receiptUrl,
            createdBy: currentUser.value?.name || 'Бухгалтер',
          }),
        });
      }
    } catch {}

    return tx;
  }

  // Внесение прочего дохода (Доп. услуги, выкуп, аренда)
  function addIncome(data: {
    accountId?: string;
    category: string;
    amount: number;
    currency?: string;
    branchId?: string;
    comment?: string;
  }) {
    const curr = data.currency || activeCurrency.value;
    const rate = ratesToUSD.value[curr] || 1;
    const amountUSD = Math.round((data.amount / rate) * 100) / 100;

    const safeAcc = cashAccounts.value.find((a) => a.type === 'SAFE');
    const targetAccountId = data.accountId || safeAcc?.id || 'acc-safe';

    const account = rawCashAccounts.value.find((a) => a.id === targetAccountId);
    if (account) {
      account.balanceUSD = Number(((account.balanceUSD || 0) + amountUSD).toFixed(2));
    }

    const tx: FinancialTransaction = {
      id: nextSeqId('tx', rawFinancialTransactions.value),
      accountId: targetAccountId,
      type: 'INCOME',
      category: data.category || 'Прочий доход',
      amountUSD,
      amountLocal: data.amount,
      currency: curr,
      relatedBranchId: data.branchId || null,
      comment: data.comment || null,
      createdBy: currentUser.value?.name || 'Бухгалтер',
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    };

    rawFinancialTransactions.value.unshift(tx);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_fin_transactions', JSON.stringify(rawFinancialTransactions.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
    }

    addAudit('PAYMENT', 'Доход компании', data.category, `Поступило ${formatMoney(amountUSD)} (${data.category})${data.comment ? `: ${data.comment}` : ''}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: targetAccountId,
            type: 'INCOME',
            category: data.category,
            amount: data.amount,
            currency: curr,
            amountUSD,
            relatedBranchId: data.branchId,
            comment: data.comment,
            createdBy: currentUser.value?.name || 'Бухгалтер',
          }),
        });
      }
    } catch {}

    return tx;
  }

  // Перемещение денег между счетами / кассами
  function transferFunds(data: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    currency?: string;
    comment?: string;
  }) {
    const curr = data.currency || activeCurrency.value;
    const rate = ratesToUSD.value[curr] || 1;
    const amountUSD = Math.round((data.amount / rate) * 100) / 100;

    const source = rawCashAccounts.value.find((a) => a.id === data.sourceAccountId);
    const target = rawCashAccounts.value.find((a) => a.id === data.targetAccountId);

    if (source) source.balanceUSD = Number(((source.balanceUSD || 0) - amountUSD).toFixed(2));
    if (target) target.balanceUSD = Number(((target.balanceUSD || 0) + amountUSD).toFixed(2));

    const tx: FinancialTransaction = {
      id: nextSeqId('tx', rawFinancialTransactions.value),
      accountId: data.sourceAccountId,
      targetAccountId: data.targetAccountId,
      type: 'TRANSFER',
      category: 'Перемещение средств',
      amountUSD,
      amountLocal: data.amount,
      currency: curr,
      comment: data.comment || null,
      createdBy: currentUser.value?.name || 'Бухгалтер',
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    };

    rawFinancialTransactions.value.unshift(tx);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_fin_transactions', JSON.stringify(rawFinancialTransactions.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
    }

    addAudit('PAYMENT', 'Перемещение средств', `${source?.name || 'Счет 1'} → ${target?.name || 'Счет 2'}`, `Переведено ${formatMoney(amountUSD)}`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: data.sourceAccountId,
            targetAccountId: data.targetAccountId,
            type: 'TRANSFER',
            category: 'Перемещение средств',
            amount: data.amount,
            currency: curr,
            amountUSD,
            comment: data.comment,
            createdBy: currentUser.value?.name || 'Бухгалтер',
          }),
        });
      }
    } catch {}

    return tx;
  }

  // Создание заявки на инкассацию из ПВЗ в Главный сейф
  function requestCashCollection(data: {
    branchId: string;
    amount?: number;
    notes?: string;
  }) {
    const branch = rawBranches.value.find((b) => b.id === data.branchId);
    if (!branch) return null;

    const amountUSD = data.amount !== undefined ? data.amount : (branch.cashBalanceUSD || 0);
    if (amountUSD <= 0) return null;

    // Списываем баланс с кассы ПВЗ
    branch.cashBalanceUSD = Math.max(0, Number(((branch.cashBalanceUSD || 0) - amountUSD).toFixed(2)));

    const pvzAccount = rawCashAccounts.value.find((a) => a.branchId === data.branchId && a.type === 'CASH_PVZ');
    if (pvzAccount) {
      pvzAccount.balanceUSD = Math.max(0, Number(((pvzAccount.balanceUSD || 0) - amountUSD).toFixed(2)));
    }

    const safeAcc = cashAccounts.value.find((a) => a.type === 'SAFE');
    const receiptNumber = `COL-${new Date().getFullYear()}-${String(rawCashCollections.value.length + 1).padStart(4, '0')}`;

    const collection: CashCollection = {
      id: nextSeqId('col', rawCashCollections.value),
      receiptNumber,
      sourceBranchId: branch.id,
      sourceBranchName: branch.name,
      sourceAccountId: pvzAccount?.id || `acc-pvz-${branch.id}`,
      targetAccountId: safeAcc?.id || 'acc-safe',
      amountUSD,
      status: 'REQUESTED',
      requestedBy: currentUser.value?.name || 'Оператор ПВЗ',
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    };

    rawCashCollections.value.unshift(collection);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_cash_collections', JSON.stringify(rawCashCollections.value));
      localStorage.setItem('cargona_branches', JSON.stringify(rawBranches.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
    }

    addAudit('CASH_COLLECT', 'Заявка на инкассацию', branch.name, `Создана заявка №${receiptNumber} на сумму ${formatMoney(amountUSD)}. Деньги переданы курьеру-инкассатору.`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceBranchId: branch.id,
            amount: amountUSD,
            notes: data.notes,
            requestedBy: currentUser.value?.name || 'Оператор ПВЗ',
          }),
        });
      }
    } catch {}

    return collection;
  }

  // Подтверждение приемки инкассации в Главный сейф
  function confirmCashCollection(collectionId: string) {
    const col = rawCashCollections.value.find((c) => c.id === collectionId);
    if (!col || col.status !== 'REQUESTED') return;

    col.status = 'CONFIRMED';
    col.confirmedBy = currentUser.value?.name || 'Главный кассир / Владелец';
    col.confirmedAt = new Date().toISOString();

    // Зачисляем в Главный сейф
    const safeAccount = rawCashAccounts.value.find((a) => a.type === 'SAFE' || a.id === col.targetAccountId);
    if (safeAccount) {
      safeAccount.balanceUSD = Number(((safeAccount.balanceUSD || 0) + col.amountUSD).toFixed(2));
    }

    // Записываем проводку в журнал
    rawFinancialTransactions.value.unshift({
      id: nextSeqId('tx', rawFinancialTransactions.value),
      accountId: col.targetAccountId,
      type: 'COLLECTION',
      category: 'Инкассация в сейф',
      amountUSD: col.amountUSD,
      comment: `Приемка инкассации №${col.receiptNumber} (${col.sourceBranchName || 'ПВЗ'})`,
      createdBy: col.confirmedBy,
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_cash_collections', JSON.stringify(rawCashCollections.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
      localStorage.setItem('cargona_fin_transactions', JSON.stringify(rawFinancialTransactions.value));
    }

    addAudit('PAYMENT', 'Приемка инкассации', col.receiptNumber, `Сумма ${formatMoney(col.amountUSD)} успешно оприходована в Главный сейф.`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/collections/${collectionId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmedBy: col.confirmedBy }),
        });
      }
    } catch {}
  }

  // Отклонение инкассации (возврат средств на баланс кассы ПВЗ)
  function rejectCashCollection(collectionId: string, reason: string = 'Отклонено кассиром') {
    const col = rawCashCollections.value.find((c) => c.id === collectionId);
    if (!col || col.status !== 'REQUESTED') return;

    col.status = 'REJECTED';
    col.rejectionReason = reason;

    // Возвращаем баланс в ПВЗ
    const branch = rawBranches.value.find((b) => b.id === col.sourceBranchId);
    if (branch) {
      branch.cashBalanceUSD = Number(((branch.cashBalanceUSD || 0) + col.amountUSD).toFixed(2));
    }
    const pvzAccount = rawCashAccounts.value.find((a) => a.id === col.sourceAccountId);
    if (pvzAccount) {
      pvzAccount.balanceUSD = Number(((pvzAccount.balanceUSD || 0) + col.amountUSD).toFixed(2));
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_cash_collections', JSON.stringify(rawCashCollections.value));
      localStorage.setItem('cargona_branches', JSON.stringify(rawBranches.value));
      localStorage.setItem('cargona_cash_accounts', JSON.stringify(rawCashAccounts.value));
    }

    addAudit('PAYMENT', 'Инкассация отклонена', col.receiptNumber, `Инкассация на сумму ${formatMoney(col.amountUSD)} отклонена: ${reason}. Средства возвращены в кассу ПВЗ.`);
  }

  // Внесение прямого расхода на рейс (Себестоимость перевозки / COGS)
  function addTripExpense(data: {
    tripId: string;
    category: string;
    amount: number;
    currency?: string;
    comment?: string;
  }) {
    const curr = data.currency || 'USD';
    const rate = ratesToUSD.value[curr] || 1;
    const amountUSD = Math.round((data.amount / rate) * 100) / 100;

    const te: TripExpense = {
      id: nextSeqId('te', rawTripExpenses.value),
      tripId: data.tripId,
      category: data.category,
      amountUSD,
      comment: data.comment || null,
      createdAt: new Date().toISOString(),
      tenantSlug: activeTenantSlug.value,
    };

    rawTripExpenses.value.unshift(te);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cargona_trip_expenses', JSON.stringify(rawTripExpenses.value));
    }

    const trip = trips.value.find((t) => t.id === data.tripId);
    addAudit('PAYMENT', 'Расход на рейс', trip?.tripCode || data.tripId, `Внесен расход: ${formatMoney(amountUSD)} (${data.category})`);

    try {
      const slug = activeTenantSlug.value;
      if (slug) {
        fetch(`/api/o/${slug}/finance/trip-expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: data.tripId,
            category: data.category,
            amount: data.amount,
            currency: curr,
            comment: data.comment,
          }),
        });
      }
    } catch {}

    return te;
  }

  // Экспорт финансового отчета в CSV (Excel-ready)
  function exportFinancialReportToCsv(reportType: 'TRANSACTIONS' | 'PL' | 'COLLECTIONS' | 'TRIPS' | 'DEBTORS') {
    let rows: string[][] = [];
    let filename = `cargona_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === 'TRANSACTIONS') {
      rows.push(['ID', 'Дата', 'Тип', 'Категория', 'Сумма (USD)', 'Валюта', 'Счет', 'Филиал', 'Комментарий', 'Создал']);
      for (const t of financialTransactions.value) {
        const acc = cashAccounts.value.find((a) => a.id === t.accountId);
        const br = branches.value.find((b) => b.id === t.relatedBranchId);
        rows.push([
          t.id,
          new Date(t.createdAt).toLocaleString('ru-RU'),
          t.type,
          t.category,
          t.amountUSD.toFixed(2),
          t.currency || 'USD',
          acc?.name || t.accountId,
          br?.name || '-',
          t.comment || '',
          t.createdBy,
        ]);
      }
    } else if (reportType === 'COLLECTIONS') {
      rows.push(['№ Квитанции', 'Дата заявки', 'Филиал', 'Сумма (USD)', 'Статус', 'Запросил', 'Принял', 'Дата подтверждения', 'Примечания']);
      for (const c of cashCollections.value) {
        rows.push([
          c.receiptNumber,
          new Date(c.createdAt).toLocaleString('ru-RU'),
          c.sourceBranchName || c.sourceBranchId,
          c.amountUSD.toFixed(2),
          c.status,
          c.requestedBy,
          c.confirmedBy || '-',
          c.confirmedAt ? new Date(c.confirmedAt).toLocaleString('ru-RU') : '-',
          c.notes || '',
        ]);
      }
    } else if (reportType === 'TRIPS') {
      rows.push(['Код рейса', 'Маршрут', 'Статус', 'Вес (кг)', 'Посылок', 'Выручка (USD)', 'Себестоимость (USD)', 'Прибыль (USD)', 'Рентабельность (%)', 'Себестоимость/кг']);
      for (const tf of tripFinancials.value) {
        rows.push([
          tf.tripCode,
          tf.route,
          tf.status,
          tf.actualWeightKg.toFixed(2),
          String(tf.packageCount),
          tf.revenueUSD.toFixed(2),
          tf.directCostUSD.toFixed(2),
          tf.marginUSD.toFixed(2),
          `${tf.marginPercent}%`,
          `$${tf.costPerKg}`,
        ]);
      }
    } else if (reportType === 'DEBTORS') {
      rows.push(['Карго-код', 'ФИО клиента', 'Телефон', 'Задолженность (USD)', 'ПВЗ']);
      for (const d of financialSummary.value.debtors) {
        const br = branches.value.find((b) => b.id === d.preferredBranchId);
        rows.push([
          d.cargoCode,
          d.fullName,
          d.phone,
          Math.abs(d.balanceUSD).toFixed(2),
          br?.name || '-',
        ]);
      }
    }

    if (rows.length === 0) return;

    // Build CSV string with UTF-8 BOM
    const csvContent = '\uFEFF' + rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    currentUser,
    login,
    logout,
    hasPermission,
    currencies,
    activeCurrency,
    setActiveCurrency,
    ratesToUSD,
    convertFromUSD,
    formatMoney,
    settings,
    activeTenantSlug,
    setTenantSlug,
    deliveryRates,
    updateDeliveryRates,
    updateStorageSettings,
    tenant,
    tenants,
    maxTenantsLimit,
    isLimitReached,
    addTenant,
    upsertTenant,
    fetchTenantsFromBackend,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    saasPlans,
    updateSaasPlan,
    originWarehouses,
    addOriginWarehouse,
    updateOriginWarehouse,
    toggleOriginWarehouse,
    deleteOriginWarehouse,
    branches,
    addBranch,
    staff,
    customers,
    trips,
    addTrip,
    addTripManifestItem,
    removeTripManifestItem,
    packages,
    processPackageReturn,
    auditLogs,
    addAudit,
    updateTripStatus,
    updatePackageStatus,
    assignShelf,
    collectBranchCash,
    addBranchCell,
    addWarehouseCell,
    addEmployee,
    toggleEmployeeStatus,
    addCustomer,
    setCustomerPreferredBranch,
    adjustCustomerBalance,
    handoverClientPackages,
    bulkIntakePackages,
    submitPackageReview,
    toggleNotifyWhenReady,
    payPackageOnline,
    intakePackage,
    addPackageToTrip,
    removePackageFromTrip,
    addPackage,
    updateRates,
    nextSeqId,
    nextCargoCode,
    // Finance & Accounting
    cashAccounts,
    financialTransactions,
    cashCollections,
    tripExpenses,
    expenseCategories,
    financialSummary,
    tripFinancials,
    addExpense,
    addIncome,
    transferFunds,
    requestCashCollection,
    confirmCashCollection,
    rejectCashCollection,
    addTripExpense,
    exportFinancialReportToCsv,
  };
});
