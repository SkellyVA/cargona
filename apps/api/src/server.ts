import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { store } from './store.js';
import { runSmartMigration } from './importer/migrationEngine.js';
import { callTelegram, escapeTelegramHtml, startReferral } from './telegram.js';

const fastify = Fastify({
  logger: true,
});

await fastify.register(compress, {
  global: true,
  encodings: ['gzip', 'deflate'],
});

await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

const APP_DOMAIN = (process.env.APP_DOMAIN || 'cargona.akii.world').trim();
const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'admin@cargona.io').toLowerCase().trim();
const SUPERADMIN_PASSWORD = (process.env.SUPERADMIN_PASSWORD || 'password123').trim();
const SUPERADMIN_NAME = (process.env.SUPERADMIN_NAME || 'Администратор Платформы').trim();
const MAX_TENANTS_LIMIT = Number(process.env.MAX_TENANTS_LIMIT || 0); // 0 or negative means unlimited

const ENABLE_NOOR_CLUB_ENV = (process.env.ENABLE_NOOR_CLUB || 'false').trim().toLowerCase();
const ALLOWED_LOYALTY_TENANTS = (process.env.ENABLE_NOOR_CLUB_TENANTS || process.env.ALLOWED_LOYALTY_TENANTS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isLoyaltyModuleAllowedForTenant(tenant: any): boolean {
  if (ENABLE_NOOR_CLUB_ENV === 'false' && (tenant as any)?.isLoyaltyModuleAllowed === false) return false;
  return true;
}

// ==========================================
// 1. Health & Root
// ==========================================
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'CargonaOS API Gateway & Bot Engine',
  domain: APP_DOMAIN,
  timestamp: new Date().toISOString(),
}));

// ==========================================
// 1.5 Authentication Routes (/api/auth)
// ==========================================
fastify.post<{
  Body: {
    email: string;
    password: string;
  };
}>('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body || {};
  if (!email || !password) {
    return reply.status(400).send({ error: 'Заполните email и пароль' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. SuperAdmin (Configured via CLI / Environment variables)
  const isSuperAdminEmail = cleanEmail === SUPERADMIN_EMAIL || (SUPERADMIN_EMAIL === 'admin@cargona.io' && cleanEmail === 'admin@cargona.io');
  const isSuperAdminPass = cleanPass === SUPERADMIN_PASSWORD || (SUPERADMIN_PASSWORD === 'password123' && (cleanPass === 'admin' || cleanPass === 'admin123'));

  if (isSuperAdminEmail && isSuperAdminPass) {
    return {
      success: true,
      user: {
        id: 'superadmin-1',
        name: SUPERADMIN_NAME,
        email: cleanEmail,
        role: 'SUPERADMIN',
        organizationSlug: 'cargona-platform',
        organizationName: 'CargonaOS Platform',
      },
    };
  }

  // 2. Tenant Owner (check store.tenants with ownerEmail)
  const tenant = store.tenants.find((t: any) => t.ownerEmail?.toLowerCase() === cleanEmail);
  if (tenant) {
    const tenantPass = (tenant as any).ownerPassword || 'password123';
    if (tenantPass !== cleanPass) {
      return reply.status(401).send({ error: 'Неверный email или пароль' });
    }
    if (tenant.status === 'SUSPENDED') {
      return reply.status(403).send({ error: 'Организация деактивирована' });
    }
    return {
      success: true,
      user: {
        id: `owner-${tenant.id}`,
        name: `Владелец (${tenant.name})`,
        email: (tenant as any).ownerEmail,
        role: 'OWNER',
        organizationSlug: tenant.slug,
        organizationName: tenant.name,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        codePrefix: tenant.codePrefix,
        ownerEmail: (tenant as any).ownerEmail,
        ownerPassword: (tenant as any).ownerPassword,
        planName: (tenant as any).planName || 'PRO',
        baseCurrency: tenant.baseCurrency || 'USD',
        isActive: tenant.status === 'ACTIVE',
      },
    };
  }

  // 3. Check store.users
  const user = store.users.find((u) => u.email?.toLowerCase() === cleanEmail);
  if (user) {
    const t = store.tenants.find((x) => x.id === user.tenantId);
    return {
      success: true,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role === 'TENANT_OWNER' ? 'OWNER' : (user.role as any),
        organizationSlug: t?.slug || 'cargona',
        organizationName: t?.name || 'Cargona',
      },
      tenant: t
        ? {
            id: t.id,
            name: t.name,
            slug: t.slug,
            codePrefix: t.codePrefix,
            ownerEmail: (t as any).ownerEmail,
            ownerPassword: (t as any).ownerPassword,
            planName: (t as any).planName || 'PRO',
            baseCurrency: t.baseCurrency || 'USD',
            isActive: t.status === 'ACTIVE',
          }
        : null,
    };
  }

  return reply.status(401).send({ error: 'Неверный email или пароль' });
});

// ==========================================
// 2. Super Admin Routes (/admin)
// ==========================================
fastify.get('/api/admin/overview', async () => {
  const totalTenants = store.tenants.length;
  const totalPackages = store.packages.length;
  const totalWeight = store.packages.reduce((acc, p) => acc + (p.weightKg || 0), 0);
  const mrr = store.tenants.reduce((acc, t) => {
    const plan = store.plans.find((p) => p.id === t.planId);
    return acc + (plan?.priceMonthly || 0);
  }, 0);

  return {
    metrics: {
      totalTenants,
      maxTenantsLimit: MAX_TENANTS_LIMIT > 0 ? MAX_TENANTS_LIMIT : null,
      isLimitReached: MAX_TENANTS_LIMIT > 0 && totalTenants >= MAX_TENANTS_LIMIT,
      totalPackages,
      totalWeightTons: Number((totalWeight / 1000).toFixed(2)),
      mrrUSD: mrr,
    },
    maxTenantsLimit: MAX_TENANTS_LIMIT > 0 ? MAX_TENANTS_LIMIT : null,
    isLimitReached: MAX_TENANTS_LIMIT > 0 && totalTenants >= MAX_TENANTS_LIMIT,
    tenants: store.tenants.map((t: any) => {
      const plan = store.plans.find((p) => p.id === t.planId);
      const pkgCount = store.packages.filter((p) => p.tenantId === t.id).length;
      const botCfg = store.botConfigs.find((b) => b.tenantId === t.id && b.isActive);
      return {
        ...t,
        ownerEmail: t.ownerEmail || `owner@${t.slug}.cargo`,
        ownerPassword: t.ownerPassword || 'password123',
        planName: t.planName || plan?.name || 'PRO',
        packageCount: pkgCount,
        botUsername: botCfg?.botUsername || null,
        isActive: t.status === 'ACTIVE' || t.isActive === true,
      };
    }),
    plans: store.plans,
  };
});

fastify.get('/api/admin/tenants', async () => {
  return {
    maxTenantsLimit: MAX_TENANTS_LIMIT > 0 ? MAX_TENANTS_LIMIT : null,
    isLimitReached: MAX_TENANTS_LIMIT > 0 && store.tenants.length >= MAX_TENANTS_LIMIT,
    tenants: store.tenants.map((t: any) => {
      const plan = store.plans.find((p) => p.id === t.planId);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        codePrefix: t.codePrefix,
        ownerEmail: t.ownerEmail || `owner@${t.slug}.cargo`,
        ownerPassword: t.ownerPassword || 'password123',
        planName: t.planName || plan?.name || 'PRO',
        baseCurrency: t.baseCurrency || 'USD',
        isActive: t.status === 'ACTIVE' || t.isActive === true,
      };
    }),
  };
});

fastify.post<{
  Body: {
    name: string;
    slug: string;
    codePrefix: string;
    planId?: string;
    planName?: string;
    ownerEmail: string;
    ownerPassword?: string;
    baseCurrency?: string;
  };
}>('/api/admin/tenants', async (request, reply) => {
  const { name, slug, codePrefix, planId, planName, ownerEmail, ownerPassword, baseCurrency = 'USD' } = request.body;
  if (!name || !slug || !codePrefix || !ownerEmail) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  const cleanSlug = slug.toLowerCase().trim();
  let existing = store.tenants.find((t) => t.slug === cleanSlug);
  if (existing) {
    existing.name = name.trim();
    existing.codePrefix = codePrefix.toUpperCase().trim();
    (existing as any).ownerEmail = ownerEmail.toLowerCase().trim();
    if (ownerPassword) (existing as any).ownerPassword = ownerPassword.trim();
    if (baseCurrency) existing.baseCurrency = baseCurrency;
    store.saveToFile();
    return { success: true, tenant: existing };
  }

  // Check license limit for new tenant creation
  if (MAX_TENANTS_LIMIT > 0 && store.tenants.length >= MAX_TENANTS_LIMIT) {
    return reply.status(403).send({
      error: `Достигнут лимит лицензии на количество организаций (${MAX_TENANTS_LIMIT}). Для расширения лицензии обратитесь к поставщику платформы.`,
    });
  }

  const newTenant = {
    id: store.nextId('tenant', store.tenants),
    name: name.trim(),
    slug: cleanSlug,
    codePrefix: codePrefix.toUpperCase().trim(),
    baseCurrency,
    timezone: 'Asia/Dushanbe',
    defaultLanguage: 'ru' as const,
    status: 'ACTIVE' as const,
    planId: planId || 'plan-pro',
    planName: planName || 'PRO',
    ownerEmail: ownerEmail.toLowerCase().trim(),
    ownerPassword: (ownerPassword || 'password123').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.tenants.push(newTenant as any);

  // Auto-create a TENANT_OWNER user for this organization
  const ownerUser = {
    id: store.nextId('user', store.users),
    tenantId: newTenant.id,
    email: ownerEmail.toLowerCase().trim(),
    fullName: `Владелец ${name.trim()}`,
    username: `${cleanSlug}_owner`,
    role: 'TENANT_OWNER' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.users.push(ownerUser);

  store.saveToFile();
  return { success: true, tenant: newTenant, owner: ownerUser };
});

fastify.put<{
  Params: { id: string };
  Body: {
    name?: string;
    slug?: string;
    codePrefix?: string;
    planId?: string;
    planName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    baseCurrency?: string;
    status?: 'ACTIVE' | 'SUSPENDED';
    isActive?: boolean;
  };
}>('/api/admin/tenants/:id', async (request, reply) => {
  const { id } = request.params;
  const tenant = store.tenants.find((t) => t.id === id || t.slug === id);
  if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

  if (request.body.name) tenant.name = request.body.name.trim();
  if (request.body.codePrefix) tenant.codePrefix = request.body.codePrefix.toUpperCase().trim();
  if (request.body.planId) tenant.planId = request.body.planId;
  if (request.body.planName) (tenant as any).planName = request.body.planName;
  if (request.body.ownerEmail) (tenant as any).ownerEmail = request.body.ownerEmail.toLowerCase().trim();
  if (request.body.ownerPassword) (tenant as any).ownerPassword = request.body.ownerPassword.trim();
  if (request.body.baseCurrency) tenant.baseCurrency = request.body.baseCurrency;
  if (request.body.status) tenant.status = request.body.status;
  if (typeof request.body.isActive === 'boolean') {
    tenant.status = request.body.isActive ? 'ACTIVE' : 'SUSPENDED';
  }
  tenant.updatedAt = new Date().toISOString();

  store.saveToFile();
  return { success: true, tenant };
});

fastify.put<{
  Params: { slug: string };
  Body: {
    name?: string;
    codePrefix?: string;
    baseCurrency?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    channelId?: string;
    reviewsChannelId?: string;
    managerUsername?: string;
  };
}>('/api/o/:slug/profile', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug.toLowerCase() === (slug || '').toLowerCase() || t.id === slug);
  if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

  if (request.body.name) tenant.name = request.body.name.trim();
  if (request.body.codePrefix !== undefined) tenant.codePrefix = request.body.codePrefix.toUpperCase().trim();
  if (request.body.baseCurrency) tenant.baseCurrency = request.body.baseCurrency;
  if (request.body.ownerEmail) (tenant as any).ownerEmail = request.body.ownerEmail.toLowerCase().trim();
  if (request.body.ownerPassword) (tenant as any).ownerPassword = request.body.ownerPassword.trim();
  if (request.body.channelId !== undefined) (tenant as any).channelId = request.body.channelId;
  if (request.body.reviewsChannelId !== undefined) (tenant as any).reviewsChannelId = request.body.reviewsChannelId;
  if (request.body.managerUsername !== undefined) (tenant as any).managerUsername = request.body.managerUsername;
  tenant.updatedAt = new Date().toISOString();

  // Also sync bot config channel/manager fields
  let botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id);
  if (botConfig) {
    if (request.body.channelId !== undefined) botConfig.channelIdForPosting = request.body.channelId || null;
    if (request.body.reviewsChannelId !== undefined) (botConfig as any).reviewsChannelId = request.body.reviewsChannelId || null;
    if (request.body.managerUsername !== undefined) (botConfig as any).managerUsername = request.body.managerUsername || null;
  }

  // Also update owner user record if exists
  const ownerUser = store.users.find((u) => u.tenantId === tenant.id && u.role === 'OWNER');
  if (ownerUser) {
    if (request.body.name) ownerUser.name = request.body.name.trim();
    if (request.body.ownerEmail) ownerUser.email = request.body.ownerEmail.toLowerCase().trim();
  }

  store.saveToFile();
  return { success: true, tenant };
});

fastify.delete<{ Params: { id: string } }>('/api/admin/tenants/:id', async (request, reply) => {
  const { id } = request.params;
  const index = store.tenants.findIndex((t) => t.id === id || t.slug === id);
  if (index === -1) return reply.status(404).send({ error: 'Tenant not found' });

  const tenant = store.tenants.splice(index, 1)[0];
  // Cascade delete tenant isolated data
  store.branches = store.branches.filter((b) => b.tenantId !== tenant.id);
  store.packages = store.packages.filter((p) => p.tenantId !== tenant.id);
  store.customers = store.customers.filter((c) => c.tenantId !== tenant.id);
  store.trips = store.trips.filter((t) => t.tenantId !== tenant.id);
  store.botConfigs = store.botConfigs.filter((b) => b.tenantId !== tenant.id);
  store.users = store.users.filter((u) => u.tenantId !== tenant.id);
  store.auditLogs = store.auditLogs.filter((a) => a.tenantId !== tenant.id);

  store.saveToFile();
  return { success: true, message: `Tenant ${tenant.name} and related records purged successfully` };
});

// ==========================================
// 3. Tenant Context Routes (/o/:slug)
// ==========================================

// Full state sync for tenant
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/all', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const tenantBranches = (store.branches || []).filter((b) => b.tenantId === tenant.id).map((b) => {
    let cells = (store.storageCells || []).filter((c) => c.branchId === b.id);
    if (cells.length === 0 && Array.isArray((b as any).cells) && (b as any).cells.length > 0) {
      cells = (b as any).cells;
    }
    if (cells.length === 0) {
      const cell1 = {
        id: store.nextId('cell', store.storageCells),
        tenantId: tenant.id,
        branchId: b.id,
        rack: 'Стеллаж 1',
        shelf: 'Полка А-01',
        barcode: `CELL-${b.id}-A01`,
        isOccupied: false,
        packageCount: 0,
      };
      const cell2 = {
        id: store.nextId('cell', [...store.storageCells, cell1]),
        tenantId: tenant.id,
        branchId: b.id,
        rack: 'Стеллаж 1',
        shelf: 'Полка А-02',
        barcode: `CELL-${b.id}-A02`,
        isOccupied: false,
        packageCount: 0,
      };
      store.storageCells.push(cell1, cell2);
      cells = [cell1, cell2];
      store.saveToFile();
    }
    const packagesAtBranch = (store.packages || []).filter((p) => p.currentBranchId === b.id && p.status === 'READY_FOR_PICKUP');
    return {
      ...b,
      totalCells: cells.length,
      occupiedCells: cells.filter((c) => c.isOccupied).length,
      activePackagesCount: packagesAtBranch.length,
      cells,
    };
  });
  const tenantStaff = (store.users || []).filter((u) => u.tenantId === tenant.id);
  const tenantCustomers = (store.customers || [])
    .filter((c) => c.tenantId === tenant.id)
    .sort((a, b) => {
      const numA = parseInt((a.cargoCode || '').replace(/\D+/g, ''), 10);
      const numB = parseInt((b.cargoCode || '').replace(/\D+/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.cargoCode || '').localeCompare(b.cargoCode || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  const tenantTrips = (store.trips || []).filter((t) => t.tenantId === tenant.id);
  const tenantPackages = (store.packages || []).filter((p) => p.tenantId === tenant.id);
  const tenantAuditLogs = (store.auditLogs || []).filter((a) => a.tenantId === tenant.id);
  const tenantWarehouses = (store.originWarehouses || []).filter((w: any) => w.tenantId === tenant.id);
  const botConfig = (store.botConfigs || []).find((b) => b.tenantId === tenant.id);
  const rawTenantSettings = (store.tenantSettings && store.tenantSettings[tenant.id]) || {};
  const settings = {
    companyName: tenant.name,
    codePrefix: tenant.codePrefix,
    ownerEmail: (tenant as any).ownerEmail,
    baseCurrency: tenant.baseCurrency || 'USD',
    ...rawTenantSettings,
    channelId: rawTenantSettings.channelId || botConfig?.channelIdForPosting || (tenant as any).channelId || '',
    reviewsChannelId: rawTenantSettings.reviewsChannelId || (botConfig as any)?.reviewsChannelId || (tenant as any).reviewsChannelId || '',
    managerUsername: rawTenantSettings.managerUsername || (botConfig as any)?.managerUsername || (tenant as any).managerUsername || '',
    botToken: rawTenantSettings.botToken || botConfig?.botToken || '',
    botUsername: rawTenantSettings.botUsername || botConfig?.botUsername || '',
  };

  const tenantCashAccounts = (store.cashAccounts || []).filter((a) => a.tenantId === tenant.id);
  const tenantTransactions = (store.financialTransactions || []).filter((t) => t.tenantId === tenant.id);
  const tenantCollections = (store.cashCollections || []).filter((c) => c.tenantId === tenant.id);
  const tenantTripExpenses = (store.tripExpenses || []).filter((e) => e.tenantId === tenant.id);
  const tenantCategories = (store.expenseCategories || []).filter((c) => c.tenantId === tenant.id);

  return {
    tenant,
    settings,
    branches: tenantBranches,
    staff: tenantStaff,
    customers: tenantCustomers,
    trips: tenantTrips,
    packages: tenantPackages,
    auditLogs: tenantAuditLogs,
    warehouses: tenantWarehouses,
    cashAccounts: tenantCashAccounts,
    financialTransactions: tenantTransactions,
    cashCollections: tenantCollections,
    tripExpenses: tenantTripExpenses,
    expenseCategories: tenantCategories,
  };
});

fastify.get<{ Params: { slug: string } }>('/api/o/:slug/dashboard', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const tenantPackages = store.packages.filter((p) => p.tenantId === tenant.id);
  const tenantBranches = store.branches.filter((b) => b.tenantId === tenant.id);
  const tenantCustomers = store.customers.filter((c) => c.tenantId === tenant.id);
  const totalCashInPvz = tenantBranches.reduce((acc, b) => acc + (b.cashBalance || 0), 0);
  const totalDebt = tenantCustomers.reduce((acc, c) => acc + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);

  const readyForPickup = tenantPackages.filter((p) => p.status === 'READY_FOR_PICKUP').length;
  const inTransit = tenantPackages.filter((p) => p.status === 'IN_TRANSIT').length;
  const atOrigin = tenantPackages.filter((p) => p.status === 'RECEIVED_AT_ORIGIN').length;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      codePrefix: tenant.codePrefix,
      baseCurrency: tenant.baseCurrency,
    },
    metrics: {
      totalPackages: tenantPackages.length,
      readyForPickup,
      inTransit,
      atOrigin,
      totalCashInPvz,
      totalCustomerDebt: totalDebt,
    },
    branches: tenantBranches,
    recentPackages: tenantPackages.slice(0, 10),
  };
});

// --- Settings & Delivery Rates ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/settings', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const settings = store.tenantSettings[tenant.id] || {
    companyName: tenant.name,
    codePrefix: tenant.codePrefix,
    ownerEmail: (tenant as any).ownerEmail,
    baseCurrency: tenant.baseCurrency || 'USD',
  };
  return { settings };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/settings', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  store.tenantSettings[tenant.id] = {
    ...store.tenantSettings[tenant.id],
    ...request.body,
    updatedAt: new Date().toISOString(),
  };

  if (request.body.companyName) tenant.name = request.body.companyName.trim();
  if (request.body.codePrefix) tenant.codePrefix = request.body.codePrefix.toUpperCase().trim();
  if (request.body.baseCurrency) tenant.baseCurrency = request.body.baseCurrency;

  store.saveToFile();
  return { success: true, settings: store.tenantSettings[tenant.id] };
});

// --- Loyalty & Referral System (NOOR CLUB) ---
// --- Loyalty & Referral System (NOOR CLUB) ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/loyalty', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => (t.slug || '').toLowerCase() === (slug || '').toLowerCase()) || store.tenants[0];
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const isAllowed = isLoyaltyModuleAllowedForTenant(tenant);
  const tenantSettings = store.tenantSettings[tenant.id] || {};
  const loyalty = tenantSettings.loyaltySettings || {
    enabled: true,
    clubName: 'NOOR CLUB',
    requiredActiveReferralsForSpecialRate: 2,
    specialRatePerKg: 26,
    bonusPerNextReferral: 10,
    bonusUsagePerKg: 1,
    minRateAfterBonus: 25,
    welcomeBonus: 0,
    activeReferralMinPackages: 1,
  };

  return {
    loyalty: {
      ...loyalty,
      isModuleAllowed: isAllowed,
      enabled: loyalty.enabled !== false,
    },
  };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/loyalty', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => (t.slug || '').toLowerCase() === (slug || '').toLowerCase()) || store.tenants[0];
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  if (!store.tenantSettings[tenant.id]) {
    store.tenantSettings[tenant.id] = {
      companyName: tenant.name,
      codePrefix: tenant.codePrefix,
      ownerEmail: (tenant as any).ownerEmail,
      baseCurrency: tenant.baseCurrency || 'USD',
    };
  }

  store.tenantSettings[tenant.id].loyaltySettings = {
    ...store.tenantSettings[tenant.id].loyaltySettings,
    ...request.body,
    isModuleAllowed: true,
  };

  store.saveToFile();
  return { success: true, loyalty: store.tenantSettings[tenant.id].loyaltySettings };
});

// --- Branches & Cells Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/branches', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branches = store.branches.filter((b) => b.tenantId === tenant.id).map((b) => {
    let cells = store.storageCells.filter((c) => c.branchId === b.id);
    if (cells.length === 0 && Array.isArray((b as any).cells) && (b as any).cells.length > 0) {
      cells = (b as any).cells;
    }
    if (cells.length === 0) {
      const cell1 = {
        id: store.nextId('cell', store.storageCells),
        tenantId: tenant.id,
        branchId: b.id,
        rack: 'Стеллаж 1',
        shelf: 'Полка А-01',
        barcode: `CELL-${b.id}-A01`,
        isOccupied: false,
        packageCount: 0,
      };
      const cell2 = {
        id: store.nextId('cell', [...store.storageCells, cell1]),
        tenantId: tenant.id,
        branchId: b.id,
        rack: 'Стеллаж 1',
        shelf: 'Полка А-02',
        barcode: `CELL-${b.id}-A02`,
        isOccupied: false,
        packageCount: 0,
      };
      store.storageCells.push(cell1, cell2);
      cells = [cell1, cell2];
      store.saveToFile();
    }
    const packagesAtBranch = store.packages.filter((p) => p.currentBranchId === b.id && p.status === 'READY_FOR_PICKUP');
    return {
      ...b,
      totalCells: cells.length,
      occupiedCells: cells.filter((c) => c.isOccupied).length,
      activePackagesCount: packagesAtBranch.length,
      cells,
    };
  });

  return { branches };
});

fastify.post<{
  Params: { slug: string };
  Body: {
    name: string;
    city: string;
    address: string;
    phone?: string;
    cashBalanceUSD?: number;
    cells?: any[];
  };
}>('/api/o/:slug/branches', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const newBranch = {
    id: store.nextId('branch', store.branches),
    tenantId: tenant.id,
    name: request.body.name,
    type: 'DESTINATION_PVZ' as const,
    country: 'Таджикистан',
    city: request.body.city,
    address: request.body.address,
    phone: request.body.phone || null,
    workingHours: '09:00 - 19:00',
    cashBalance: request.body.cashBalanceUSD || 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.branches.push(newBranch as any);

  const initialCells = Array.isArray(request.body.cells) && request.body.cells.length > 0
    ? request.body.cells
    : [
        { rack: 'Стеллаж 1', shelf: 'Полка А-01', barcode: `CELL-${newBranch.id}-A01` },
        { rack: 'Стеллаж 1', shelf: 'Полка А-02', barcode: `CELL-${newBranch.id}-A02` },
      ];

  const createdCells = [];
  for (const cell of initialCells) {
    const newCell = {
      id: cell.id || store.nextId('cell', store.storageCells),
      tenantId: tenant.id,
      branchId: newBranch.id,
      rack: cell.rack || 'Стеллаж 1',
      shelf: cell.shelf || 'Полка 1',
      barcode: cell.barcode || `CELL-${newBranch.id}-${Date.now()}`,
      isOccupied: false,
      packageCount: 0,
    };
    store.storageCells.push(newCell);
    createdCells.push(newCell);
  }

  (newBranch as any).cells = createdCells;
  store.saveToFile();
  return { success: true, branch: newBranch };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/branches/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branch = store.branches.find((b) => b.id === id && b.tenantId === tenant.id);
  if (!branch) return reply.status(404).send({ error: 'Branch not found' });

  Object.assign(branch, request.body);
  branch.updatedAt = new Date().toISOString();
  store.saveToFile();
  return { success: true, branch };
});

fastify.post<{ Params: { slug: string; id: string } }>('/api/o/:slug/branches/:id/collection', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branch = store.branches.find((b) => b.id === id && b.tenantId === tenant.id);
  if (!branch) return reply.status(404).send({ error: 'Branch not found' });

  const collectedAmount = branch.cashBalance || 0;
  branch.cashBalance = 0;
  branch.updatedAt = new Date().toISOString();

  store.auditLogs.unshift({
    id: store.nextId('audit', store.auditLogs),
    tenantId: tenant.id,
    branchId: branch.id,
    userId: 'user-admin',
    userName: 'Владелец',
    userRole: 'TENANT_OWNER',
    entityType: 'BRANCH',
    entityId: branch.id,
    action: 'CASH_COLLECTION',
    details: `Инкассация кассы филиала ${branch.name}: изъято ${collectedAmount} USD`,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();
  return { success: true, collectedAmount };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/branches/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.branches.findIndex((b) => b.id === id && b.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Branch not found' });

  const removed = store.branches.splice(idx, 1)[0];
  store.storageCells = store.storageCells.filter((c) => c.branchId !== id);
  store.saveToFile();
  return { success: true, message: 'Branch deleted', branch: removed };
});

// --- Origin Warehouses Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/warehouses', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const warehouses = store.originWarehouses.filter((w: any) => w.tenantId === tenant.id);
  return { warehouses };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/warehouses', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const body = request.body || {};
  const newWh = {
    id: body.id || store.nextId('wh', store.originWarehouses),
    tenantId: tenant.id,
    name: body.name || 'Склад',
    country: body.country || 'Китай',
    countryCode: body.countryCode || 'CN',
    city: body.city || 'Иу',
    address: body.address || '',
    receiverName: body.receiverName || '',
    phone: body.phone || '',
    zipCode: body.zipCode || '',
    instructions: body.instructions || '',
    guidePhotos: body.guidePhotos || [],
    isActive: body.isActive !== false,
    cells: body.cells || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.originWarehouses.push(newWh as any);
  store.saveToFile();
  return { success: true, warehouse: newWh };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/warehouses/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const wh = store.originWarehouses.find((w: any) => w.id === id && w.tenantId === tenant.id);
  if (!wh) return reply.status(404).send({ error: 'Warehouse not found' });

  Object.assign(wh, request.body);
  (wh as any).updatedAt = new Date().toISOString();
  store.saveToFile();
  return { success: true, warehouse: wh };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/warehouses/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.originWarehouses.findIndex((w: any) => w.id === id && w.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Warehouse not found' });

  const removed = store.originWarehouses.splice(idx, 1)[0];
  store.saveToFile();
  return { success: true, message: 'Warehouse deleted', warehouse: removed };
});

// --- Storage Cells Management ---
fastify.post<{
  Params: { slug: string; id: string };
  Body: { rack: string; shelf: string; barcode?: string };
}>('/api/o/:slug/branches/:id/cells', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branch = store.branches.find((b) => b.id === id && b.tenantId === tenant.id);
  if (!branch) return reply.status(404).send({ error: 'Branch not found' });

  const newCell = {
    id: store.nextId('cell', store.storageCells),
    tenantId: tenant.id,
    branchId: branch.id,
    rack: request.body.rack || 'Стеллаж 1',
    shelf: request.body.shelf || 'Полка 1',
    barcode: request.body.barcode || `CELL-${branch.id}-${Date.now()}`,
    isOccupied: false,
    packageCount: 0,
  };

  store.storageCells.push(newCell);
  store.saveToFile();
  return { success: true, cell: newCell };
});

fastify.delete<{ Params: { slug: string; id: string; cellId: string } }>('/api/o/:slug/branches/:id/cells/:cellId', async (request, reply) => {
  const { slug, id, cellId } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branch = store.branches.find((b) => b.id === id && b.tenantId === tenant.id);
  if (branch && (branch as any).cells) {
    const cIdx = (branch as any).cells.findIndex((c: any) => c.id === cellId);
    if (cIdx !== -1) (branch as any).cells.splice(cIdx, 1);
  }
  store.storageCells = store.storageCells.filter((c) => !(c.branchId === id && c.id === cellId));
  store.saveToFile();
  return { success: true, message: 'Cell deleted' };
});

fastify.delete<{ Params: { slug: string; id: string; cellId: string } }>('/api/o/:slug/warehouses/:id/cells/:cellId', async (request, reply) => {
  const { slug, id, cellId } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const wh = store.originWarehouses.find((w: any) => w.id === id && w.tenantId === tenant.id);
  if (wh && (wh as any).cells) {
    const cIdx = (wh as any).cells.findIndex((c: any) => c.id === cellId);
    if (cIdx !== -1) (wh as any).cells.splice(cIdx, 1);
  }
  store.saveToFile();
  return { success: true, message: 'Warehouse cell deleted' };
});

// --- Staff Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/staff', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const staff = store.users.filter((u) => u.tenantId === tenant.id);
  return { staff };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/staff', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const { fullName, email, password, role, phone, branchId, branchName } = request.body;
  if (!fullName || !email) {
    return reply.status(400).send({ error: 'Missing name or email' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    existing.fullName = fullName.trim();
    if (password) (existing as any).password = password.trim();
    if (role) existing.role = role;
    if (phone) existing.phone = phone;
    if (branchId) existing.assignedBranchId = branchId;
    store.saveToFile();
    return { success: true, employee: existing };
  }

  const newEmployee = {
    id: store.nextId('user', store.users),
    tenantId: tenant.id,
    fullName: fullName.trim(),
    email: cleanEmail,
    password: (password || 'password123').trim(),
    username: cleanEmail.split('@')[0],
    role: role || 'OPERATOR',
    phone: phone || '+992 90 000 0000',
    assignedBranchId: branchId || null,
    branchName: branchName || 'Главный офис',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(newEmployee as any);
  store.saveToFile();
  return { success: true, employee: newEmployee };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/staff/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  let user = store.users.find((u) => u.id === id && u.tenantId === tenant.id);
  if (!user) {
    // If not found by ID, look up by email (e.g. owner)
    user = store.users.find((u) => u.tenantId === tenant.id && u.email.toLowerCase() === (tenant as any).ownerEmail?.toLowerCase());
  }

  if (user) {
    Object.assign(user, request.body);
    user.updatedAt = new Date().toISOString();
    if (user.role === 'TENANT_OWNER' || user.role === 'OWNER' || user.email.toLowerCase() === (tenant as any).ownerEmail?.toLowerCase()) {
      if (request.body.email) (tenant as any).ownerEmail = request.body.email.toLowerCase().trim();
      if (request.body.password) (tenant as any).ownerPassword = request.body.password;
    }
  } else {
    // If owner didn't have user entry yet, create one
    if (request.body.email) (tenant as any).ownerEmail = request.body.email.toLowerCase().trim();
    if (request.body.password) (tenant as any).ownerPassword = request.body.password;
  }

  store.saveToFile();
  return { success: true, employee: user || request.body };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/staff/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.users.findIndex((u) => u.id === id && u.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Staff member not found' });

  store.users.splice(idx, 1);
  store.saveToFile();
  return { success: true, message: 'Staff member removed' };
});

// --- Customers Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/customers', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const customers = store.customers
    .filter((c) => c.tenantId === tenant.id)
    .sort((a, b) => {
      const numA = parseInt((a.cargoCode || '').replace(/\D+/g, ''), 10);
      const numB = parseInt((b.cargoCode || '').replace(/\D+/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.cargoCode || '').localeCompare(b.cargoCode || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  return { customers };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/customers', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const {
    cargoCode,
    fullName,
    phone,
    telegramUsername,
    telegramUserId,
    balanceUSD,
    preferredBranchId,
    invitedByCustomerId,
    referralCode,
    notes,
  } = request.body;

  const code = (cargoCode || store.nextCargoCode(tenant)).toUpperCase().trim();

  const newCustomer = {
    id: store.nextId('cust', store.customers),
    tenantId: tenant.id,
    cargoCode: code,
    fullName: fullName ? fullName.trim() : `Клиент ${code}`,
    phone: phone ? phone.trim() : '+992 90 000 0000',
    telegramUsername: telegramUsername ? telegramUsername.replace('@', '').trim() : null,
    telegramUserId: telegramUserId ? Number(telegramUserId) : null,
    balance: balanceUSD || 0,
    currency: tenant.baseCurrency || 'USD',
    isBlocked: false,
    notes: notes || null,
    preferredBranchId: preferredBranchId || null,
    invitedByCustomerId: invitedByCustomerId || null,
    referralCode: referralCode || code,
    bonusBalance: 0,
    createdAt: new Date().toISOString(),
  };

  store.customers.push(newCustomer);

  // If invited by another customer, award bonus and send Telegram notification to inviter
  if (invitedByCustomerId) {
    const inviterQuery = String(invitedByCustomerId).toUpperCase().trim();
    const inviter = store.customers.find(
      (c) =>
        (c.tenantId === tenant.id || !c.tenantId) &&
        (c.id === invitedByCustomerId ||
          (c.cargoCode || '').toUpperCase() === inviterQuery ||
          (c.cargoCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === inviterQuery.replace(/[^A-Z0-9]/g, '') ||
          ((c as any).referralCode && (c as any).referralCode.toUpperCase() === inviterQuery))
    );

    if (inviter) {
      const rawSettings = store.tenantSettings[tenant.id] || {};
      const loyalty = rawSettings.loyaltySettings || {};
      const bonusPerReferral = Number(loyalty.bonusPerNextReferral || 50);
      (inviter as any).bonusBalance = ((inviter as any).bonusBalance || 0) + bonusPerReferral;

      const botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id && b.isActive && b.botToken);
      const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      const token = botConfig?.botToken || (envToken && !envToken.startsWith('MOCK_') ? envToken : '');

      const inviterTgId = (inviter as any).telegramUserId;
      if (token && inviterTgId) {
        const clubName = loyalty.clubName || `${tenant.name} CLUB`;
        const notificationText =
          `🎉 <b>У вас новый реферал!</b>\n\n` +
          `По вашей пригласительной ссылке зарегистрировался клиент:\n` +
          `👤 <b>${newCustomer.fullName}</b>\n` +
          `🏷 Код клиента: <code>${newCustomer.cargoCode}</code>\n\n` +
          `🎁 Вам начислено <b>+${bonusPerReferral} баллов</b> в программе <b>${clubName}</b>!`;

        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: inviterTgId,
            text: notificationText,
            parse_mode: 'HTML',
          }),
        }).catch((err) => {
          console.error('Failed to send telegram referral notification:', err);
        });
      }
    }
  }

  store.saveToFile();
  return { success: true, customer: newCustomer };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/customers/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const cleanId = (id || '').trim().toUpperCase();
  const cust = store.customers.find(
    (c) =>
      (c.tenantId === tenant.id || !c.tenantId) &&
      (c.id === id || (c.cargoCode || '').toUpperCase() === cleanId)
  );
  if (!cust) return reply.status(404).send({ error: 'Customer not found' });

  if (request.body.fullName) cust.fullName = request.body.fullName.trim();
  if (request.body.phone) cust.phone = request.body.phone.trim();
  if (typeof request.body.balanceUSD === 'number') cust.balance = request.body.balanceUSD;
  if (typeof request.body.balance === 'number') cust.balance = request.body.balance;
  if (typeof request.body.isBlocked === 'boolean') cust.isBlocked = request.body.isBlocked;
  if (request.body.preferredBranchId) cust.preferredBranchId = request.body.preferredBranchId;
  if (request.body.notes) cust.notes = request.body.notes;

  store.saveToFile();
  return { success: true, customer: cust };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/customers/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.customers.findIndex((c) => (c.id === id || c.cargoCode === id) && c.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Customer not found' });

  store.customers.splice(idx, 1);
  store.saveToFile();
  return { success: true, message: 'Customer deleted' };
});

// --- Packages Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/packages', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const packages = store.packages.filter((p) => p.tenantId === tenant.id);
  return { packages };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/packages', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const {
    trackingNumber,
    customerCargoCode,
    description,
    weightKg = 0,
    lengthCm,
    widthCm,
    heightCm,
    volumeM3,
    costUSD = 0,
    shelfLocation,
    branchId,
    tripId,
    status = 'RECEIVED_AT_ORIGIN',
  } = request.body;

  if (!trackingNumber) {
    return reply.status(400).send({ error: 'Tracking number required' });
  }

  const existing = store.packages.find((p) => p.tenantId === tenant.id && p.trackingNumber.toLowerCase() === trackingNumber.toLowerCase().trim());
  if (existing) {
    Object.assign(existing, request.body);
    existing.updatedAt = new Date().toISOString();
    store.saveToFile();
    return { success: true, package: existing };
  }

  const newPackage = {
    id: store.nextId('pkg', store.packages),
    tenantId: tenant.id,
    trackingNumber: trackingNumber.trim(),
    internalBarcode: `PKG-${tenant.codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: null,
    customerCargoCode: (customerCargoCode || '').toUpperCase().trim(),
    currentBranchId: branchId || 'branch-origin',
    shelfLocation: shelfLocation || null,
    tripId: tripId || null,
    weightKg: Number(weightKg) || 0,
    lengthCm: lengthCm || null,
    widthCm: widthCm || null,
    heightCm: heightCm || null,
    volumeM3: volumeM3 || null,
    cost: Number(costUSD) || 0,
    currency: tenant.baseCurrency || 'USD',
    photos: [],
    description: description || null,
    status: status as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.packages.unshift(newPackage as any);
  store.saveToFile();
  return { success: true, package: newPackage };
});

// Bulk Package Intake (Multiple tracking numbers via pasted list)
fastify.post<{
  Params: { slug: string };
  Body: {
    trackingNumbers: string[];
    targetBranchId?: string;
    customerCargoCode?: string;
    status?: string;
    weightKg?: number;
    description?: string;
  };
}>('/api/o/:slug/packages/bulk', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const { trackingNumbers, targetBranchId, customerCargoCode, status = 'RECEIVED_AT_ORIGIN', weightKg = 0, description } = request.body;
  if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
    return reply.status(400).send({ error: 'Список трек-номеров пуст' });
  }

  const createdPackages: any[] = [];
  const updatedPackages: any[] = [];

  for (const rawTrack of trackingNumbers) {
    const track = (rawTrack || '').trim();
    if (!track) continue;

    let existing = store.packages.find((p) => p.tenantId === tenant.id && p.trackingNumber.toLowerCase() === track.toLowerCase());
    if (existing) {
      if (status) existing.status = status as any;
      if (targetBranchId) existing.currentBranchId = targetBranchId;
      if (customerCargoCode) existing.customerCargoCode = customerCargoCode.toUpperCase().trim();
      if (weightKg > 0) existing.weightKg = weightKg;
      existing.updatedAt = new Date().toISOString();
      updatedPackages.push(existing);
    } else {
      const newPkg = {
        id: store.nextId('pkg', store.packages),
        tenantId: tenant.id,
        trackingNumber: track,
        internalBarcode: `PKG-${tenant.codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: null,
        customerCargoCode: (customerCargoCode || '').toUpperCase().trim(),
        currentBranchId: targetBranchId || 'branch-origin',
        weightKg: weightKg || 0,
        cost: 0,
        currency: tenant.baseCurrency || 'USD',
        photos: [],
        description: description || null,
        status: (status as any) || 'RECEIVED_AT_ORIGIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.packages.unshift(newPkg);
      createdPackages.push(newPkg);
    }
  }

  // Add audit log
  store.auditLogs.unshift({
    id: store.nextId('audit', store.auditLogs),
    tenantId: tenant.id,
    userId: 'user-admin',
    userName: 'Оператор склада',
    userRole: 'SORTER',
    entityType: 'PACKAGE',
    entityId: createdPackages[0]?.id || 'bulk',
    action: 'CREATE',
    details: `Массовая приемка: добавлено ${createdPackages.length}, обновлено ${updatedPackages.length} трек-номеров`,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();
  return {
    success: true,
    totalReceived: createdPackages.length + updatedPackages.length,
    createdCount: createdPackages.length,
    updatedCount: updatedPackages.length,
    packages: [...createdPackages, ...updatedPackages],
  };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/packages/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const pkg = store.packages.find((p) => (p.id === id || p.trackingNumber === id) && p.tenantId === tenant.id);
  if (!pkg) return reply.status(404).send({ error: 'Package not found' });

  const oldStatus = pkg.status;
  Object.assign(pkg, request.body);
  if (request.body.costUSD) pkg.cost = request.body.costUSD;
  if (request.body.status === 'READY_FOR_PICKUP' && oldStatus !== 'READY_FOR_PICKUP') {
    (pkg as any).readyAt = new Date().toISOString();
  }
  pkg.updatedAt = new Date().toISOString();
  store.saveToFile();

  // Send ready for pickup notification if applicable
  if (pkg.status === 'READY_FOR_PICKUP' && oldStatus !== 'READY_FOR_PICKUP') {
    const cust = store.customers.find((c) => (c.id === pkg.customerId || (pkg.customerCargoCode && c.cargoCode === pkg.customerCargoCode)) && c.tenantId === tenant.id);
    if (cust) {
      const domain = APP_DOMAIN.replace(/^https?:\/\//, '');
      const cellText = pkg.storageCellId ? ` (Ячейка: ${pkg.storageCellId})` : '';
      sendTelegramNotificationToCustomer(
        tenant.id,
        cust,
        `✅ <b>Посылка готова к выдаче!</b>\n\n` +
        `• <b>Трек-номер:</b> <code>${pkg.trackingNumber}</code>\n` +
        `• <b>Вес:</b> ${pkg.weightKg} кг\n` +
        `• <b>К оплате:</b> ${pkg.cost} ${pkg.currency}\n` +
        `• <b>Размещение:</b> ${pkg.shelfLocation || 'ПВЗ'}${cellText}\n\n` +
        `⏳ <i>Бесплатный срок хранения: 4 дня.</i>\n\n` +
        `👇 Нажмите кнопку, чтобы получить QR-код для выдачи:`,
        pkg.photos?.[0],
        {
          inline_keyboard: [[{ text: '🏷 Получить QR-код', web_app: { url: `https://${domain}/o/${slug}/app` } }]],
        }
      );
    }
  }

  return { success: true, package: pkg };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/packages/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.packages.findIndex((p) => (p.id === id || p.trackingNumber === id) && p.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Package not found' });

  store.packages.splice(idx, 1);
  store.saveToFile();
  return { success: true, message: 'Package deleted' };
});

// --- Trips Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/trips', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const trips = store.trips.filter((t) => t.tenantId === tenant.id);
  return { trips };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/trips', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const newTrip = {
    id: store.nextId('trip', store.trips),
    tenantId: tenant.id,
    tripCode: request.body.tripCode || `TRIP-${Date.now()}`,
    transportType: request.body.type || 'AUTO',
    originBranchId: 'branch-origin',
    destinationBranchId: 'branch-destination',
    driverName: request.body.driverName || null,
    vehiclePlate: request.body.vehiclePlate || null,
    status: request.body.status || 'LOADING',
    totalWeightKg: request.body.totalWeightKg || 0,
    totalVolumeM3: request.body.totalVolumeM3 || 0,
    sackCount: request.body.manifestItems?.length || 0,
    manifestItems: request.body.manifestItems || [],
    departureDate: request.body.departureDate || null,
    estimatedArrivalDate: request.body.estimatedArrival || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.trips.unshift(newTrip as any);
  store.saveToFile();
  return { success: true, trip: newTrip };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/trips/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const trip = store.trips.find((t) => (t.id === id || t.tripCode === id) && t.tenantId === tenant.id);
  if (!trip) return reply.status(404).send({ error: 'Trip not found' });

  const oldStatus = trip.status;
  Object.assign(trip, request.body);
  trip.updatedAt = new Date().toISOString();
  store.saveToFile();

  // Notify clients and auto-post to Telegram news channel
  const botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id && b.isActive && b.botToken);
  const domain = APP_DOMAIN.replace(/^https?:\/\//, '');

  if (request.body.status && request.body.status !== oldStatus) {
    const newSt = request.body.status;

    // 1. Personal DM notifications to customers whose packages are in this trip upon arrival
    if (newSt === 'ARRIVED') {
      const tripPackages = store.packages.filter((p) => p.tenantId === tenant.id && (p.tripId === trip.id || (trip.manifestItems || []).some((m: any) => m.packageId === p.id || m.trackingNumber === p.trackingNumber)));
      const customerCargoCodes = [...new Set(tripPackages.map((p) => p.customerCargoCode).filter(Boolean))];

      for (const code of customerCargoCodes) {
        const cust = store.customers.find((c) => c.tenantId === tenant.id && c.cargoCode === code);
        if (cust) {
          const custPkgs = tripPackages.filter((p) => p.customerCargoCode === code);
          sendTelegramNotificationToCustomer(
            tenant.id,
            cust,
            `🚚 <b>Рейс ${trip.tripCode} прибыл!</b>\n\n` +
            `Ваши посылки (<b>${custPkgs.length} шт.</b>) поступили в пункт назначения и направлены на сортировку.\n\n` +
            `👇 Мы пришлем вам уведомление сразу после размещения на полке ПВЗ:`,
            undefined,
            {
              inline_keyboard: [[{ text: '📦 Открыть кабинет', web_app: { url: `https://${domain}/o/${slug}/app` } }]],
            }
          );
        }
      }
    }

    // 2. Auto-post to Telegram News Channel if configured
    const channel = botConfig?.channelIdForPosting;
    if (botConfig && botConfig.botToken && channel) {
      const cleanChannel = channel.startsWith('@') || channel.startsWith('-') ? channel : `@${channel}`;
      let postText = '';

      if (newSt === 'ARRIVED') {
        postText =
          `🚚 <b>Рейс прибыл на склад!</b>\n\n` +
          `• <b>Код рейса:</b> <code>${trip.tripCode}</code>\n` +
          `• <b>Маршрут:</b> ${trip.route || 'Иу → Душанбе'}\n` +
          `• <b>Вес груза:</b> ${trip.totalWeightKg || 0} кг (${trip.sackCount || 0} мест)\n\n` +
          `📦 <i>Груз поступил на разгрузку и сортировку. Личные уведомления клиентам отправлены.</i>\n\n` +
          `🏢 <b>${tenant.name}</b>`;
      } else if (newSt === 'IN_TRANSIT' && oldStatus === 'LOADING') {
        postText =
          `🚛 <b>Рейс отправлен в путь!</b>\n\n` +
          `• <b>Код рейса:</b> <code>${trip.tripCode}</code>\n` +
          `• <b>Маршрут:</b> ${trip.route || 'Иу → Душанбе'}\n` +
          `• <b>Транспорт:</b> ${trip.vehiclePlate ? `Авто (${trip.vehiclePlate})` : 'Магистральный рейс'}\n` +
          `• <b>Вес:</b> ${trip.totalWeightKg || 0} кг\n\n` +
          `⏳ <i>Следите за статусом ваших посылок в личном кабинете бота.</i>\n\n` +
          `🏢 <b>${tenant.name}</b>`;
      } else if (newSt === 'CUSTOMS') {
        postText =
          `🛃 <b>Рейс прибыл на таможенный пост</b>\n\n` +
          `• <b>Код рейса:</b> <code>${trip.tripCode}</code>\n` +
          `• <b>Маршрут:</b> ${trip.route || 'Иу → Душанбе'}\n\n` +
          `🔍 <i>Проходит таможенное оформление. Скоро груз будет доставлен в ПВЗ.</i>\n\n` +
          `🏢 <b>${tenant.name}</b>`;
      }

      if (postText) {
        fetch(`https://api.telegram.org/bot${botConfig.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChannel,
            text: postText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: '📦 Открыть приложение', url: `https://t.me/${botConfig.botUsername}` }]],
            },
          }),
        }).catch((err) => console.warn('[Trip Channel Auto-Posting Error]:', err));
      }
    }
  }

  return { success: true, trip };
});

fastify.delete<{ Params: { slug: string; id: string } }>('/api/o/:slug/trips/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const idx = store.trips.findIndex((t) => (t.id === id || t.tripCode === id) && t.tenantId === tenant.id);
  if (idx === -1) return reply.status(404).send({ error: 'Trip not found' });

  store.trips.splice(idx, 1);
  store.saveToFile();
  return { success: true, message: 'Trip deleted' };
});

// ==========================================
// 3.8. Accounting, Cash Desks & Financial API
// ==========================================

// Helper: Ensure default cash accounts for a tenant (Safe, Bank, PVZ accounts)
function ensureDefaultCashAccounts(tenantId: string) {
  let accounts = store.cashAccounts.filter((a) => a.tenantId === tenantId);
  const tenant = store.tenants.find((t) => t.id === tenantId);
  const currency = tenant?.baseCurrency || 'USD';

  if (accounts.length === 0) {
    // 1. Main Safe (Сейф)
    const safeAccount = {
      id: store.nextId('acc', store.cashAccounts),
      tenantId,
      branchId: null,
      name: 'Главный сейф (Офис)',
      type: 'SAFE' as const,
      currency,
      balance: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.cashAccounts.push(safeAccount);

    // 2. Bank / Acquiring (Безнал)
    const bankAccount = {
      id: store.nextId('acc', store.cashAccounts),
      tenantId,
      branchId: null,
      name: 'Расчетный счет / Эквайринг',
      type: 'BANK' as const,
      currency,
      balance: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.cashAccounts.push(bankAccount);

    // 3. Branches Cash Desks
    const branches = store.branches.filter((b) => b.tenantId === tenantId);
    for (const b of branches) {
      const pvzAccount = {
        id: store.nextId('acc', store.cashAccounts),
        tenantId,
        branchId: b.id,
        name: `Касса: ${b.name}`,
        type: 'CASH_PVZ' as const,
        currency,
        balance: b.cashBalance || 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.cashAccounts.push(pvzAccount);
    }

    store.saveToFile();
    accounts = store.cashAccounts.filter((a) => a.tenantId === tenantId);
  }
  return accounts;
}

// 1. Get Financial Summary & P&L
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/finance/summary', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  ensureDefaultCashAccounts(tenant.id);

  const accounts = store.cashAccounts.filter((a) => a.tenantId === tenant.id);
  const transactions = store.financialTransactions.filter((t) => t.tenantId === tenant.id);
  const packages = store.packages.filter((p) => p.tenantId === tenant.id);
  const tripExpenses = store.tripExpenses.filter((e) => e.tenantId === tenant.id);
  const collections = store.cashCollections.filter((c) => c.tenantId === tenant.id);
  const customers = store.customers.filter((c) => c.tenantId === tenant.id);

  // Total Cash in PVZ, Bank, Safe
  const pvzCash = accounts.filter((a) => a.type === 'CASH_PVZ').reduce((acc, a) => acc + (a.balance || 0), 0);
  const bankBalance = accounts.filter((a) => a.type === 'BANK').reduce((acc, a) => acc + (a.balance || 0), 0);
  const safeBalance = accounts.filter((a) => a.type === 'SAFE').reduce((acc, a) => acc + (a.balance || 0), 0);
  const totalCashAssets = pvzCash + bankBalance + safeBalance;

  // Total Delivered / In-transit Package Revenue (USD)
  const deliveredRevenue = packages
    .filter((p) => p.status === 'RELEASED' || p.status === 'READY_FOR_PICKUP')
    .reduce((acc, p) => acc + (p.cost || 0), 0);

  // Direct Logistics Costs (COGS)
  const directFreightCosts = tripExpenses.reduce((acc, e) => acc + (e.amountUSD || e.amount || 0), 0);

  // Operational Expenses (OPEX)
  const opexExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + (t.amountUSD || t.amount || 0), 0);

  // Net Profit
  const netProfit = deliveredRevenue - directFreightCosts - opexExpenses;
  const marginPercent = deliveredRevenue > 0 ? ((netProfit / deliveredRevenue) * 100).toFixed(1) : '0';

  // Customer Debtors
  const debtors = customers.filter((c) => (c.balance || 0) < 0);
  const totalDebt = Math.abs(debtors.reduce((acc, c) => acc + (c.balance || 0), 0));

  return {
    baseCurrency: tenant.baseCurrency || 'USD',
    totalCashAssets,
    pvzCash,
    bankBalance,
    safeBalance,
    deliveredRevenue,
    directFreightCosts,
    opexExpenses,
    netProfit,
    marginPercent: Number(marginPercent),
    totalDebt,
    debtorsCount: debtors.length,
    accounts,
  };
});

// 2. Financial Transactions: List & Create
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/finance/transactions', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });
  const list = store.financialTransactions.filter((t) => t.tenantId === tenant.id);
  return { transactions: list };
});

fastify.post<{
  Params: { slug: string };
  Body: {
    accountId: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CUSTOMER_PAYMENT' | 'CUSTOMER_REFUND';
    category: string;
    amount: number;
    currency?: string;
    amountUSD?: number;
    exchangeRate?: number;
    relatedPackageId?: string;
    relatedTripId?: string;
    relatedCustomerId?: string;
    relatedBranchId?: string;
    targetAccountId?: string;
    comment?: string;
    receiptUrl?: string;
    createdBy?: string;
  };
}>('/api/o/:slug/finance/transactions', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const {
    accountId,
    type,
    category,
    amount,
    currency = tenant.baseCurrency || 'USD',
    amountUSD = amount,
    exchangeRate = 1,
    relatedPackageId,
    relatedTripId,
    relatedCustomerId,
    relatedBranchId,
    targetAccountId,
    comment,
    receiptUrl,
    createdBy = 'Бухгалтерия',
  } = request.body;

  if (!amount || amount <= 0) {
    return reply.status(400).send({ error: 'Сумма транзакции должна быть больше нуля' });
  }

  ensureDefaultCashAccounts(tenant.id);

  const sourceAcc = store.cashAccounts.find((a) => a.id === accountId && a.tenantId === tenant.id);
  if (!sourceAcc && type !== 'TRANSFER') {
    return reply.status(400).send({ error: 'Указанный счет не найден' });
  }

  // Adjust account balances
  if (sourceAcc) {
    if (type === 'INCOME' || type === 'CUSTOMER_PAYMENT') {
      sourceAcc.balance = Number((sourceAcc.balance + amount).toFixed(2));
    } else if (type === 'EXPENSE' || type === 'CUSTOMER_REFUND') {
      sourceAcc.balance = Number((sourceAcc.balance - amount).toFixed(2));
    } else if (type === 'TRANSFER' && targetAccountId) {
      const targetAcc = store.cashAccounts.find((a) => a.id === targetAccountId && a.tenantId === tenant.id);
      if (targetAcc) {
        sourceAcc.balance = Number((sourceAcc.balance - amount).toFixed(2));
        targetAcc.balance = Number((targetAcc.balance + amount).toFixed(2));
        targetAcc.updatedAt = new Date().toISOString();
      }
    }
    sourceAcc.updatedAt = new Date().toISOString();
  }

  const transaction = {
    id: store.nextId('tx', store.financialTransactions),
    tenantId: tenant.id,
    accountId,
    type,
    category: category || 'Прочие операции',
    amount,
    currency,
    amountUSD,
    exchangeRate,
    relatedPackageId: relatedPackageId || null,
    relatedTripId: relatedTripId || null,
    relatedCustomerId: relatedCustomerId || null,
    relatedBranchId: relatedBranchId || null,
    targetAccountId: targetAccountId || null,
    comment: comment || null,
    receiptUrl: receiptUrl || null,
    createdBy,
    createdAt: new Date().toISOString(),
  };

  store.financialTransactions.unshift(transaction);

  // Add audit log
  store.auditLogs.unshift({
    id: store.nextId('audit', store.auditLogs),
    tenantId: tenant.id,
    branchId: relatedBranchId || sourceAcc?.branchId || null,
    userId: 'user-admin',
    userName: createdBy,
    userRole: 'TENANT_OWNER',
    entityType: 'PAYMENT',
    entityId: transaction.id,
    action: type === 'EXPENSE' ? 'CREATE' : 'UPDATE',
    details: `Финансовая операция [${type}]: ${amount} ${currency} (${category})`,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();
  return { success: true, transaction, account: sourceAcc };
});

// 3. Cash Collections (Инкассация ПВЗ -> Сейф)
fastify.post<{
  Params: { slug: string };
  Body: {
    sourceBranchId: string;
    amount: number;
    notes?: string;
    requestedBy?: string;
  };
}>('/api/o/:slug/finance/collections', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const { sourceBranchId, amount, notes, requestedBy = 'Оператор ПВЗ' } = request.body;
  if (!amount || amount <= 0) {
    return reply.status(400).send({ error: 'Укажите сумму для инкассации' });
  }

  ensureDefaultCashAccounts(tenant.id);

  const pvzAccount = store.cashAccounts.find(
    (a) => a.tenantId === tenant.id && a.branchId === sourceBranchId && a.type === 'CASH_PVZ'
  ) || store.cashAccounts.find((a) => a.tenantId === tenant.id && a.type === 'CASH_PVZ');

  const safeAccount = store.cashAccounts.find(
    (a) => a.tenantId === tenant.id && a.type === 'SAFE'
  );

  const receiptNumber = `COL-${new Date().getFullYear()}-${String(store.cashCollections.length + 1).padStart(4, '0')}`;

  const collection = {
    id: store.nextId('col', store.cashCollections),
    tenantId: tenant.id,
    receiptNumber,
    sourceBranchId,
    sourceAccountId: pvzAccount?.id || 'acc-pvz',
    targetAccountId: safeAccount?.id || 'acc-safe',
    amount,
    currency: tenant.baseCurrency || 'USD',
    amountUSD: amount,
    status: 'REQUESTED' as const,
    requestedBy,
    notes: notes || null,
    createdAt: new Date().toISOString(),
  };

  store.cashCollections.unshift(collection);

  // Immediately deduct from branch balance pending confirmation
  const branch = store.branches.find((b) => b.id === sourceBranchId && b.tenantId === tenant.id);
  if (branch) {
    branch.cashBalance = Math.max(0, (branch.cashBalance || 0) - amount);
    branch.updatedAt = new Date().toISOString();
  }
  if (pvzAccount) {
    pvzAccount.balance = Math.max(0, (pvzAccount.balance || 0) - amount);
    pvzAccount.updatedAt = new Date().toISOString();
  }

  store.saveToFile();
  return { success: true, collection };
});

// Confirm Collection (Приемка в Главный сейф)
fastify.post<{
  Params: { slug: string; id: string };
  Body: { confirmedBy?: string };
}>('/api/o/:slug/finance/collections/:id/confirm', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const collection = store.cashCollections.find((c) => c.id === id && c.tenantId === tenant.id);
  if (!collection) return reply.status(404).send({ error: 'Инкассация не найдена' });

  collection.status = 'CONFIRMED';
  collection.confirmedBy = request.body?.confirmedBy || 'Главный кассир / Владелец';
  collection.confirmedAt = new Date().toISOString();

  // Credit safe account
  const safeAccount = store.cashAccounts.find((a) => a.id === collection.targetAccountId) ||
    store.cashAccounts.find((a) => a.tenantId === tenant.id && a.type === 'SAFE');

  if (safeAccount) {
    safeAccount.balance = Number(((safeAccount.balance || 0) + collection.amount).toFixed(2));
    safeAccount.updatedAt = new Date().toISOString();
  }

  // Record transfer transaction
  store.financialTransactions.unshift({
    id: store.nextId('tx', store.financialTransactions),
    tenantId: tenant.id,
    accountId: collection.targetAccountId,
    type: 'COLLECTION',
    category: 'Инкассация в сейф',
    amount: collection.amount,
    currency: collection.currency,
    amountUSD: collection.amountUSD,
    exchangeRate: 1,
    targetAccountId: collection.sourceAccountId,
    comment: `Приемка инкассации №${collection.receiptNumber}`,
    createdBy: collection.confirmedBy,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();
  return { success: true, collection, safeAccount };
});

// 4. Trip Direct Expenses (Себестоимость рейса / COGS)
fastify.post<{
  Params: { slug: string };
  Body: {
    tripId: string;
    category: string;
    amount: number;
    currency?: string;
    comment?: string;
  };
}>('/api/o/:slug/finance/trip-expenses', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const { tripId, category, amount, currency = 'USD', comment } = request.body;
  if (!tripId || !amount) {
    return reply.status(400).send({ error: 'Укажите рейс и сумму расхода' });
  }

  const tripExpense = {
    id: store.nextId('te', store.tripExpenses),
    tenantId: tenant.id,
    tripId,
    category: category || 'TRUCK_FREIGHT',
    amount,
    currency,
    amountUSD: amount,
    comment: comment || null,
    createdAt: new Date().toISOString(),
  };

  store.tripExpenses.unshift(tripExpense);
  store.saveToFile();
  return { success: true, tripExpense };
});

// 5. Customer Balance Adjustments (Депозит / Погашение долга)
fastify.post<{
  Params: { slug: string; id: string };
  Body: {
    amount: number;
    type: 'TOP_UP' | 'PAYMENT' | 'REFUND';
    comment?: string;
    accountId?: string;
  };
}>('/api/o/:slug/finance/customers/:id/balance', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const customer = store.customers.find((c) => (c.id === id || c.cargoCode === id) && c.tenantId === tenant.id);
  if (!customer) return reply.status(404).send({ error: 'Customer not found' });

  const { amount, type, comment, accountId } = request.body;
  if (!amount || amount <= 0) return reply.status(400).send({ error: 'Сумма должна быть положительной' });

  if (type === 'TOP_UP') {
    customer.balance = Number(((customer.balance || 0) + amount).toFixed(2));
  } else if (type === 'PAYMENT') {
    customer.balance = Number(((customer.balance || 0) - amount).toFixed(2));
  } else if (type === 'REFUND') {
    customer.balance = Number(((customer.balance || 0) + amount).toFixed(2));
  }

  ensureDefaultCashAccounts(tenant.id);
  const targetAcc = accountId
    ? store.cashAccounts.find((a) => a.id === accountId)
    : store.cashAccounts.find((a) => a.tenantId === tenant.id && a.type === 'CASH_PVZ');

  if (targetAcc && (type === 'TOP_UP' || type === 'PAYMENT')) {
    targetAcc.balance = Number(((targetAcc.balance || 0) + amount).toFixed(2));
    targetAcc.updatedAt = new Date().toISOString();
  }

  // Record financial transaction
  store.financialTransactions.unshift({
    id: store.nextId('tx', store.financialTransactions),
    tenantId: tenant.id,
    accountId: targetAcc?.id || 'acc-pvz',
    type: 'CUSTOMER_PAYMENT',
    category: type === 'TOP_UP' ? 'Пополнение баланса' : 'Оплата задолженности',
    amount,
    currency: customer.currency || 'USD',
    amountUSD: amount,
    exchangeRate: 1,
    relatedCustomerId: customer.id,
    comment: comment || `Пополнение баланса клиента ${customer.cargoCode} (${customer.fullName})`,
    createdBy: 'Касса ПВЗ',
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();
  return { success: true, customer, targetAccount: targetAcc };
});

// ==========================================
// 4. Telegram Bot Management & Webhooks (BYOB)
// ==========================================

// Helper: Setup Webhook with Telegram API
async function setupTelegramBotWebhook(token: string, tenantSlug: string, tenantName: string, hostHeader?: string) {
  const cleanToken = token.trim().replace(/^bot/i, '');
  let domain = (hostHeader || APP_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
  if (!domain || domain.includes('localhost') || domain.includes('127.0.0.1')) {
    domain = 'noor.akii.world';
  }
  const webhookUrl = `https://${domain}/api/bot/webhook/${tenantSlug}`;
  const appUrl = `https://${domain}/o/${tenantSlug}/app`;

  // 1. Verify token & get bot username
  let meRes: Response;
  try {
    meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      signal: AbortSignal.timeout(12000),
    });
  } catch (err: any) {
    throw new Error(`Не удалось связаться с серверами Telegram: ${err.message || 'таймаут соединения'}`);
  }

  const meText = await meRes.text();
  let meData: any = {};
  try {
    meData = meText ? JSON.parse(meText) : {};
  } catch {
    throw new Error(`Некорректный ответ от Telegram API (HTTP ${meRes.status})`);
  }

  if (!meData || !meData.ok || !meData.result?.username) {
    const desc = meData?.description || 'Неверный токен Telegram бота. Проверьте токен, полученный от @BotFather.';
    throw new Error(desc);
  }

  const botUsername = meData.result.username;

  // 2. Clear old webhook / conflicts before setting new webhook
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook?drop_pending_updates=true`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.warn(`[Bot Webhook] Failed deleteWebhook for ${botUsername}:`, e);
  }

  // 3. Set Telegram Webhook
  try {
    const hookRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
      }),
      signal: AbortSignal.timeout(12000),
    });
    const hookData = (await hookRes.json().catch(() => ({}))) as any;
    if (!hookData.ok) {
      console.warn(`[Bot Webhook] Warning for ${botUsername}:`, hookData);
      throw new Error(`Telegram API Error: ${hookData.description || 'Не удалось установить вебхук'}`);
    }
  } catch (e: any) {
    console.warn(`[Bot Webhook] Failed setting webhook for ${botUsername}:`, e.message);
    throw e;
  }

  // 4. Set Default Chat Menu Button (Persistent WebApp button)
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '📦 Открыть кабинет',
          web_app: { url: appUrl },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error(`[Bot Menu Button] Failed for ${botUsername}:`, e);
  }

  // 5. Set Bot Commands: ONLY /start
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [{ command: 'start', description: '📦 Открыть личный кабинет' }],
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error(`[Bot Commands] Failed for ${botUsername}:`, e);
  }

  console.log(`[Bot Engine] Successfully configured @${botUsername} for tenant "${tenantName}" (Webhook: ${webhookUrl})`);
  return meData.result;
}

// Get Tenant Bot Settings
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/bot-settings', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) {
    return {
      botToken: '',
      botUsername: '',
      isActive: false,
      channelId: '',
      welcomeMessage: '',
      appUrl: `https://${APP_DOMAIN}/o/${slug}/app`,
      reviewsChannelId: '',
      managerUsername: '',
    };
  }

  const botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id);
  return {
    botToken: botConfig?.botToken || '',
    botUsername: botConfig?.botUsername || '',
    isActive: botConfig?.isActive || false,
    channelId: botConfig?.channelIdForPosting || (tenant as any)?.channelId || '',
    reviewsChannelId: (botConfig as any)?.reviewsChannelId || (tenant as any)?.reviewsChannelId || '',
    managerUsername: (botConfig as any)?.managerUsername || (tenant as any)?.managerUsername || '',
    welcomeMessage: botConfig?.welcomeMessage || '',
    appUrl: `https://${APP_DOMAIN}/o/${tenant.slug}/app`,
  };
});

// Save Tenant Bot Settings (Set BYOB token & register webhook)
fastify.post<{
  Params: { slug: string };
  Body: {
    botToken: string;
    managerUsername?: string;
    channelId?: string;
    reviewsChannelId?: string;
    autoChannelPosting?: boolean;
    welcomeMessage?: string;
    companyName?: string;
  };
}>('/api/o/:slug/bot-settings', async (request, reply) => {
  const { slug } = request.params;
  const { botToken, managerUsername, channelId, reviewsChannelId, welcomeMessage, companyName } = request.body;
  let tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant && store.tenants.length > 0 && (slug === 'cargona' || !slug)) {
    tenant = store.tenants[0];
  }

  if (!tenant) {
    const rawName = companyName?.trim() || (slug && slug !== 'cargona' ? slug : 'My Cargo');
    const safeSlug = slug || 'cargona';
    tenant = {
      id: store.nextId('tenant', store.tenants),
      name: rawName,
      slug: safeSlug,
      codePrefix: rawName.substring(0, 3).toUpperCase(),
      baseCurrency: 'USD',
      timezone: 'Asia/Dushanbe',
      defaultLanguage: 'ru' as const,
      status: 'ACTIVE' as const,
      planId: 'plan-pro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.tenants.push(tenant);
  } else {
    if (companyName && companyName.trim()) {
      tenant.name = companyName.trim();
    }
  }

  if (channelId !== undefined) (tenant as any).channelId = channelId || null;
  if (reviewsChannelId !== undefined) (tenant as any).reviewsChannelId = reviewsChannelId || null;
  if (managerUsername !== undefined) (tenant as any).managerUsername = managerUsername || null;

  if (!botToken || !botToken.trim()) {
    // Save channel and manager settings even if bot token is not provided
    let existing = store.botConfigs.find((b) => b.tenantId === tenant.id);
    if (!existing) {
      existing = {
        id: store.nextId('bot', store.botConfigs),
        tenantId: tenant.id,
        botToken: '',
        botUsername: '',
        welcomeMessage: welcomeMessage || `Добро пожаловать в ${tenant.name}!`,
        channelIdForPosting: channelId || null,
        reviewsChannelId: reviewsChannelId || null,
        managerUsername: managerUsername || null,
        isActive: false,
        webhookSecret: `sec_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      store.botConfigs.push(existing);
    } else {
      existing.isActive = false;
      if (channelId !== undefined) existing.channelIdForPosting = channelId || null;
      if (reviewsChannelId !== undefined) (existing as any).reviewsChannelId = reviewsChannelId || null;
      if (managerUsername !== undefined) (existing as any).managerUsername = managerUsername || null;
      existing.updatedAt = new Date().toISOString();
    }
    store.saveToFile();
    return { success: true, message: 'Настройки каналов и контактов сохранены' };
  }

  // Deactivate this token from any other tenant config so there's no ghost webhook
  for (const b of store.botConfigs) {
    if (b.botToken === botToken.trim() && b.tenantId !== tenant.id) {
      b.isActive = false;
      b.botToken = '';
    }
  }

  try {
    const host = (request.headers['x-forwarded-host'] as string) || request.headers.host || APP_DOMAIN;
    const botInfo = await setupTelegramBotWebhook(botToken, tenant.slug, tenant.name, host);

    let botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id);
    if (!botConfig) {
      botConfig = {
        id: store.nextId('bot', store.botConfigs),
        tenantId: tenant.id,
        botToken: botToken.trim(),
        botUsername: botInfo.username,
        welcomeMessage: welcomeMessage || `Добро пожаловать в ${tenant.name}!`,
        channelIdForPosting: channelId || null,
        reviewsChannelId: reviewsChannelId || null,
        managerUsername: managerUsername || null,
        isActive: true,
        webhookSecret: `sec_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      store.botConfigs.push(botConfig);
    } else {
      botConfig.botToken = botToken.trim();
      botConfig.botUsername = botInfo.username;
      botConfig.channelIdForPosting = channelId !== undefined ? (channelId || null) : botConfig.channelIdForPosting;
      (botConfig as any).reviewsChannelId = reviewsChannelId !== undefined ? (reviewsChannelId || null) : (botConfig as any).reviewsChannelId;
      (botConfig as any).managerUsername = managerUsername !== undefined ? (managerUsername || null) : (botConfig as any).managerUsername;
      botConfig.welcomeMessage = welcomeMessage || botConfig.welcomeMessage;
      botConfig.isActive = true;
      botConfig.updatedAt = new Date().toISOString();
    }

    // Add Audit Log
    store.auditLogs.unshift({
      id: store.nextId('audit', store.auditLogs),
      tenantId: tenant.id,
      userId: 'user-admin',
      userName: 'Администратор',
      userRole: 'TENANT_OWNER',
      entityType: 'TENANT',
      entityId: tenant.id,
      action: 'UPDATE',
      details: `Подключен Telegram-бот @${botInfo.username} для компании ${tenant.name}`,
      createdAt: new Date().toISOString(),
    });

    store.saveToFile();

    return {
      success: true,
      bot: {
        username: botInfo.username,
        name: botInfo.first_name,
        isActive: true,
        appUrl: `https://${APP_DOMAIN}/o/${tenant.slug}/app`,
      },
    };
  } catch (err: any) {
    console.error('[Bot Setup Error]:', err);
    return reply.status(400).send({
      error: err.message || 'Ошибка подключения бота к Telegram. Проверьте правильность токена.',
    });
  }
});

// Submit Package Review & Post to Reviews Channel
fastify.post<{
  Params: { slug: string; id: string };
  Body: {
    rating: number;
    comment?: string;
    photos?: string[];
    customerName?: string;
    customerCargoCode?: string;
  };
}>('/api/o/:slug/packages/:id/review', async (request, reply) => {
  const { slug, id } = request.params;
  const { rating, comment, photos, customerName, customerCargoCode } = request.body;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const pkg = store.packages.find((p) => (p.id === id || p.trackingNumber === id) && p.tenantId === tenant.id);
  if (pkg) {
    (pkg as any).reviewRating = rating;
    (pkg as any).reviewComment = comment || '';
    (pkg as any).reviewPhotos = photos || [];
    pkg.updatedAt = new Date().toISOString();
  }

  // Post review to Telegram reviews channel if configured
  const botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id && b.isActive && b.botToken);
  const reviewsChannel = (botConfig as any)?.reviewsChannelId || (tenant as any)?.reviewsChannelId;

  if (botConfig && botConfig.botToken && reviewsChannel) {
    try {
      const cleanChannel = reviewsChannel.startsWith('@') || reviewsChannel.startsWith('-') ? reviewsChannel : `@${reviewsChannel}`;
      const stars = '⭐️'.repeat(Math.max(1, Math.min(5, Number(rating) || 5)));
      const custName = customerName || (pkg?.customerCargoCode ? `Клиент (${pkg.customerCargoCode})` : 'Клиент');
      const tracking = pkg?.trackingNumber || id;
      const reviewText = comment ? `\n\n💬 <b>Отзыв:</b> <i>«${comment}»</i>` : '';

      const caption =
        `⭐️ <b>Новый отзыв о доставке</b>\n\n` +
        `👤 <b>Клиент:</b> ${custName} (${customerCargoCode || pkg?.customerCargoCode || '—'})\n` +
        `📦 <b>Трек:</b> <code>${tracking}</code>\n` +
        `⭐️ <b>Оценка:</b> ${stars} (${rating}/5)${reviewText}\n\n` +
        `🏢 <b>${tenant.name}</b>`;

      if (photos && photos.length > 0) {
        const firstPhoto = photos[0];
        if (firstPhoto.startsWith('data:image')) {
          const base64Data = firstPhoto.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const formData = new FormData();
          formData.append('chat_id', cleanChannel);
          formData.append('caption', caption);
          formData.append('parse_mode', 'HTML');
          const blob = new Blob([buffer], { type: 'image/jpeg' });
          formData.append('photo', blob, 'review.jpg');

          await fetch(`https://api.telegram.org/bot${botConfig.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
        } else {
          await fetch(`https://api.telegram.org/bot${botConfig.botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cleanChannel,
              photo: firstPhoto,
              caption,
              parse_mode: 'HTML',
            }),
          });
        }
      } else {
        await fetch(`https://api.telegram.org/bot${botConfig.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChannel,
            text: caption,
            parse_mode: 'HTML',
          }),
        });
      }
    } catch (err) {
      console.warn('[Review Channel Posting Error]:', err);
    }
  }

  store.saveToFile();
  return { success: true, message: 'Review recorded' };
});

// Telegram Webhook Handler (Incoming messages from Telegram)
fastify.post<{
  Params: { slug: string };
  Body: any;
}>('/api/bot/webhook/:slug', async (request, reply) => {
  const { slug } = request.params;
  const update = request.body;

  let tenant = store.tenants.find((t) => (t.slug || '').toLowerCase() === (slug || '').toLowerCase());
  if (!tenant && store.tenants.length > 0) {
    tenant = store.tenants[0];
  }
  if (!tenant) {
    console.warn(`[Bot Webhook] Received update for unknown tenant slug: ${slug}`);
    return reply.send({ ok: true });
  }

  let botConfig = store.botConfigs.find((b) => b.tenantId === tenant!.id && b.isActive && b.botToken);
  if (!botConfig) {
    botConfig = store.botConfigs.find((b) => b.isActive && b.botToken) || store.botConfigs[0];
  }

  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const token = botConfig?.botToken || (envToken && !envToken.startsWith('MOCK_') ? envToken : '');

  if (!token) {
    return reply.send({ ok: true });
  }

  const message = update?.message || update?.edited_message;
  if (!message || !message.chat) {
    return reply.send({ ok: true });
  }

  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const fromUser = message.from;
  const userName = fromUser?.first_name || fromUser?.username || 'клиент';
  const domain = ((request.headers['x-forwarded-host'] as string) || request.headers.host || APP_DOMAIN || 'noor.akii.world')
    .replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
  const baseAppUrl = `https://${domain}/o/${tenant.slug}/app`;

  // Check if start command has referral param: /start ref_NOOR-001 or /start 001
  let appUrl = baseAppUrl;
  let inviterInfoText = '';
  const rawRef = startReferral(text);
  if (rawRef) {
    appUrl = `${baseAppUrl}?ref=${encodeURIComponent(rawRef)}`;

    const inviterQuery = rawRef.toUpperCase();
    const inviter = store.customers.find(
      (c) =>
        (c.tenantId === tenant!.id || !c.tenantId) &&
        (c.id === rawRef ||
          (c.cargoCode || '').toUpperCase() === inviterQuery ||
          (c.cargoCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === inviterQuery.replace(/[^A-Z0-9]/g, '') ||
          ((c as any).referralCode && (c as any).referralCode.toUpperCase() === inviterQuery))
    );

    if (inviter) {
      inviterInfoText = `🤝 <i>Вы перешли по приглашению: <b>${escapeTelegramHtml(inviter.fullName)} (${escapeTelegramHtml(inviter.cargoCode)})</b></i>\n\n`;

      // Notify inviter about the referral click
      if ((inviter as any).telegramUserId && String((inviter as any).telegramUserId) !== String(fromUser?.id)) {
        const inviterNotice =
          `👀 <b>Переход по вашей реферальной ссылке!</b>\n\n` +
          `Пользователь <b>${escapeTelegramHtml(userName)}</b> (${fromUser?.username ? `@${escapeTelegramHtml(fromUser.username)}` : 'клиент'}) открыл бота по вашей ссылке-приглашению.\n\n` +
          `⏳ Как только он завершит регистрацию в личном кабинете, вам автоматически начислятся бонусные баллы!`;

        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: (inviter as any).telegramUserId,
            text: inviterNotice,
            parse_mode: 'HTML',
          }),
        }).catch(() => {});
      }
    }
  }

  // Persist Telegram User ID to matching customer if known
  if (fromUser?.id) {
    const matchCust = store.customers.find(
      (c) =>
        (c.tenantId === tenant!.id || !c.tenantId) &&
        (((c as any).telegramUserId && String((c as any).telegramUserId) === String(fromUser.id)) ||
          (fromUser.username && c.telegramUsername && c.telegramUsername.replace('@', '').toLowerCase() === fromUser.username.toLowerCase()))
    );
    if (matchCust && !(matchCust as any).telegramUserId) {
      (matchCust as any).telegramUserId = Number(fromUser.id);
      store.saveToFile();
    }
  }

  try {
    // 1. Search track number if user sends a digits/track string (length >= 6 and not a command)
    if (text.length >= 6 && !text.startsWith('/')) {
      const foundPkg = store.packages.find(
        (p) =>
          p.tenantId === tenant!.id &&
          (p.trackingNumber.toLowerCase() === text.toLowerCase() ||
            p.internalBarcode.toLowerCase() === text.toLowerCase())
      );

      if (foundPkg) {
        const statusMap: Record<string, string> = {
          PRE_REGISTERED: '📝 Предварительно внесен',
          RECEIVED_AT_ORIGIN: '🇨🇳 Принят на складе в Китае',
          PACKED_IN_SACK: '📦 Упакован в мешок',
          IN_TRANSIT: '🚚 В пути (выехал)',
          CUSTOMS: '🛃 На таможенном оформлении',
          ARRIVED_AT_PVZ: '🏢 Прибыл в пункт выдачи',
          READY_FOR_PICKUP: '✅ Готов к выдаче на складе',
          RELEASED: '🎉 Выдан клиенту',
        };

        const pkgText =
          `📦 <b>Информация о посылке:</b>\n\n` +
          `• <b>Трек-номер:</b> <code>${foundPkg.trackingNumber}</code>\n` +
          `• <b>Статус:</b> ${statusMap[foundPkg.status] || foundPkg.status}\n` +
          `• <b>Вес:</b> ${foundPkg.weightKg} кг\n` +
          `• <b>Стоимость доставки:</b> ${foundPkg.cost} ${foundPkg.currency}\n` +
          (foundPkg.description ? `• <b>Описание:</b> ${foundPkg.description}\n` : '') +
          `\n👇 Откройте приложение для получения QR-кода на выдачу:`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: pkgText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: '📦 Открыть в приложении', web_app: { url: appUrl } }]],
            },
          }),
        });
        return reply.send({ ok: true });
      }
    }

    // 2. Default /start or welcome message (Only /start command active)
    const welcomeText =
      `👋 <b>Здравствуйте, ${escapeTelegramHtml(userName)}!</b>\n\n` +
      (inviterInfoText ? `${inviterInfoText}` : '') +
      `Вас приветствует официальный бот карго-компании <b>«${escapeTelegramHtml(tenant.name)}»</b>.\n\n` +
      `📱 <b>В нашем личном кабинете вы можете:</b>\n` +
      `• 📦 Отслеживать трек-номера и статус доставки\n` +
      `• 🏷 Получить персональный QR-код для выдачи в ПВЗ\n` +
      `• 🏬 Скопировать точный адрес склада для интернет-магазинов\n` +
      `• 🚚 Видеть выехавшие и прибывшие рейсы\n\n` +
      `👇 <i>Нажмите кнопку ниже, чтобы открыть кабинет:</i>`;

    const inlineKeyboard: any[][] = [
      [{ text: '📦 Открыть личный кабинет', web_app: { url: appUrl } }],
    ];

    if (botConfig?.channelIdForPosting) {
      const channelLink = `https://t.me/${botConfig.channelIdForPosting.replace('@', '')}`;
      inlineKeyboard.push([{ text: '📢 Наш Telegram-канал', url: channelLink }]);
    }

    await callTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });

    // Set persistent WebApp menu button for this user
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        menu_button: {
          type: 'web_app',
          text: '📦 Открыть кабинет',
          web_app: { url: appUrl },
        },
      }),
    }).catch(() => {});
  } catch (err) {
    console.error(`[Bot Webhook Handler Error for ${slug}]:`, err);
    return reply.status(502).send({ ok: false });
  }

  return reply.send({ ok: true });
});

// ==========================================
// 5. WMS Operations & QR Pickup Flow
// ==========================================

// Verify QR code scanned at PVZ
fastify.post<{
  Body: {
    qrString: string;
  };
}>('/api/wms/pickup/verify-qr', async (request, reply) => {
  const { qrString } = request.body;
  if (!qrString || !qrString.startsWith('cargona://pickup')) {
    return reply.status(400).send({ error: 'Invalid QR code format' });
  }

  // Parse query params
  const url = new URL(qrString.replace('cargona://pickup', 'https://cargona.local'));
  const tenantSlug = url.searchParams.get('t');
  const cargoCode = url.searchParams.get('c');

  const tenant = store.tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) return reply.status(404).send({ error: 'Cargo company not found' });

  const customer = store.customers.find((c) => c.tenantId === tenant.id && c.cargoCode === cargoCode);
  if (!customer) return reply.status(404).send({ error: 'Customer not found' });

  // Get packages ready for pickup
  const readyPackages = store.packages
    .filter((p) => p.customerId === customer.id && p.status === 'READY_FOR_PICKUP')
    .map((p) => {
      const cell = store.storageCells.find((c) => c.id === p.storageCellId);
      return {
        id: p.id,
        trackingNumber: p.trackingNumber,
        internalBarcode: p.internalBarcode,
        weightKg: p.weightKg,
        cost: p.cost,
        currency: p.currency,
        description: p.description,
        shelfLocation: cell ? `${cell.rack} - ${cell.shelf}` : 'Без ячейки',
      };
    });

  const totalAmountToPay = readyPackages.reduce((acc, p) => acc + p.cost, 0);

  return {
    verified: true,
    customer: {
      id: customer.id,
      cargoCode: customer.cargoCode,
      fullName: customer.fullName,
      phone: customer.phone,
      currentBalance: customer.balance,
    },
    readyPackages,
    totalAmountToPay,
    currency: readyPackages[0]?.currency || 'TJS',
  };
});

// Handover packages & accept payment at PVZ
fastify.post<{
  Body: {
    customerId?: string;
    packageIds: string[];
    amountPaid: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_QR' | 'TRANSFER';
    branchId?: string;
    handoverPhoto?: string;
    tenantSlug?: string;
  };
}>('/api/wms/handover', async (request, reply) => {
  const { customerId, packageIds, amountPaid, paymentMethod, branchId, tenantSlug } = request.body;

  let tenant = tenantSlug ? store.tenants.find((t) => t.slug === tenantSlug) : null;
  const customer = store.customers.find(
    (c) =>
      (customerId && c.id === customerId) ||
      (customerId && c.cargoCode.toUpperCase() === customerId.toUpperCase())
  );
  if (customer && !tenant) {
    tenant = store.tenants.find((t) => t.id === customer.tenantId) || null;
  }

  // Update package statuses to RELEASED
  let updatedCount = 0;
  for (const pkgId of packageIds || []) {
    const pkg = store.packages.find((p) => p.id === pkgId || p.trackingNumber === pkgId);
    if (pkg) {
      pkg.status = 'RELEASED';
      pkg.releasedAt = new Date().toISOString();
      pkg.storageCellId = null;
      if (!tenant) {
        tenant = store.tenants.find((t) => t.id === pkg.tenantId) || null;
      }
      updatedCount++;
    }
  }

  // Update branch cash desk
  const branch = store.branches.find((b) => b.id === branchId || b.name === branchId);
  if (branch && paymentMethod === 'CASH') {
    branch.cashBalance = Math.round(((branch.cashBalance || 0) + (amountPaid || 0)) * 100) / 100;
  }

  // Record payment
  const activeTenantId = tenant?.id || customer?.tenantId || store.tenants[0]?.id || 'tenant-noor';
  const activeBranchId = branch?.id || branchId || store.branches[0]?.id || 'branch-main';
  const payment = {
    id: store.nextId('pay', store.payments),
    tenantId: activeTenantId,
    branchId: activeBranchId,
    customerId: customer?.id || customerId || 'cust-direct',
    cashierUserId: 'user-cashier-001',
    amount: amountPaid || 0,
    currency: 'TJS',
    method: paymentMethod || 'CASH',
    type: 'DELIVERY_PAYMENT' as const,
    createdAt: new Date().toISOString(),
  };
  store.payments.push(payment);

  // Add audit log
  store.auditLogs.push({
    id: store.nextId('audit', store.auditLogs),
    tenantId: activeTenantId,
    branchId: activeBranchId,
    userId: 'user-cashier-001',
    userName: 'Кассир ПВЗ',
    userRole: 'PVZ_OPERATOR',
    entityType: 'PACKAGE',
    entityId: packageIds?.[0] || customerId || 'handover',
    action: 'HANDOVER',
    details: `Выдано ${packageIds?.length || 0} посылок клиенту ${customer?.cargoCode || customerId || '—'}. Принято: ${amountPaid || 0} (${paymentMethod || 'CASH'})`,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();

  return {
    success: true,
    message: 'Посылки успешно выданы',
    releasedCount: updatedCount || packageIds?.length || 0,
    paymentId: payment.id,
  };
});

// ==========================================
// 6. Client Telegram Mini App Endpoints (/app/:slug)
// ==========================================
fastify.get<{ Params: { slug: string }; Querystring: { tgUserId?: string; cargoCode?: string } }>(
  '/api/app/:slug/me',
  async (request, reply) => {
    const { slug } = request.params;
    const { tgUserId, cargoCode } = request.query;
    let tenant = store.tenants.find((t) => t.slug.toLowerCase() === (slug || '').toLowerCase());
    if (!tenant && store.tenants.length > 0) {
      tenant = store.tenants[0];
    }
    if (!tenant) return reply.status(404).send({ error: 'Cargo not found' });

    const tenantSettings = store.tenantSettings[tenant.id] || {};
    const tenantBranches = store.branches.filter((b) => b.tenantId === tenant.id);
    const tenantOriginWarehouses = store.originWarehouses.filter((w: any) => w.tenantId === tenant.id);

    let customer = null;
    if (cargoCode) {
      customer = store.customers.find((c) => (c.tenantId === tenant.id || !c.tenantId) && (c.cargoCode || '').toUpperCase() === cargoCode.toUpperCase());
    }
    if (!customer && tgUserId) {
      customer = store.customers.find((c) => (c.tenantId === tenant.id || !c.tenantId) && (c as any).telegramUserId && String((c as any).telegramUserId) === String(tgUserId));
    }
    if (customer && tgUserId && !(customer as any).telegramUserId) {
      (customer as any).telegramUserId = Number(tgUserId);
      store.saveToFile();
    }
    if (!customer) {
      customer = store.customers.find((c) => c.tenantId === tenant.id) || {
        id: store.nextId('cust', store.customers),
        tenantId: tenant.id,
        cargoCode: store.nextCargoCode(tenant),
        fullName: 'Клиент Карго',
        phone: '+992 90 000 0000',
        balance: 0,
        currency: tenant.baseCurrency || 'USD',
        isBlocked: false,
        createdAt: new Date().toISOString(),
      };
    }

    const customerPackages = store.packages.filter((p) => p.customerId === customer.id || p.customerCargoCode === customer.cargoCode);

    const originWarehouse = tenantOriginWarehouses[0]
      || store.branches.find((b) => b.tenantId === tenant.id && b.type === 'ORIGIN_HUB')
      || store.branches.find((b) => b.type === 'ORIGIN_HUB')
      || { address: '浙江省金华市义乌市 Yiwu International Trade City {code}', phone: '+86 138 0000 0000', receiverName: '{name} ({code})' };

    const customerBranch = store.branches.find((b) => b.id === (customer as any).preferredBranchId && b.tenantId === tenant.id)
      || store.branches.find((b) => b.tenantId === tenant.id && b.type !== 'ORIGIN_HUB')
      || store.branches[0];

    const branchCity = customerBranch?.city?.trim() || '';
    const branchName = customerBranch?.name?.trim() || '';

    const formatWhTpl = (tpl: string) => {
      if (!tpl) return '';
      const code = customer.cargoCode || `${tenant.codePrefix || 'CRG'}-001`;
      const codeNumMatch = code.match(/\d+/);
      const id = codeNumMatch ? codeNumMatch[0] : (customer.id ? String(customer.id).replace(/\D+/g, '') : code);
      return tpl
        .replace(/\{code\}/gi, code)
        .replace(/\{user_?id\}/gi, id)
        .replace(/\{id\}/gi, id)
        .replace(/\{name\}/gi, customer.fullName || '')
        .replace(/\{phone\}/gi, customer.phone || '')
        .replace(/\{city\}/gi, branchCity)
        .replace(/\{branch_?city\}/gi, branchCity)
        .replace(/\{pvz_?city\}/gi, branchCity)
        .replace(/\{branch_?name\}/gi, branchName)
        .replace(/\{branch\}/gi, branchName)
        .replace(/\{pvz\}/gi, branchName);
    };

    const rawWhAddr = (originWarehouse as any).address || '';
    const rawWhReceiver = (originWarehouse as any).receiverName || `${customer.fullName} (${customer.cargoCode})`;
    const resolvedAddress = formatWhTpl(rawWhAddr);
    const resolvedReceiver = formatWhTpl(rawWhReceiver);
    const resolvedPhone = (originWarehouse as any).phone || originHubPhone('');

    const warehouseAddressFor1688 = `收件人: ${resolvedReceiver}\n电话: ${resolvedPhone}\n地址: ${resolvedAddress}`;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        codePrefix: tenant.codePrefix,
        baseCurrency: tenant.baseCurrency || 'USD',
        managerUsername: (tenant as any).managerUsername || tenantSettings.managerUsername || '',
        botUsername: (tenant as any).botUsername || tenantSettings.botUsername || '',
        channelId: (tenant as any).channelId || tenantSettings.channelId || '',
        chinaWarehouseAddress: (tenant as any).chinaWarehouseAddress || tenantSettings.chinaWarehouseAddress || '',
        chinaContactPhone: (tenant as any).chinaContactPhone || tenantSettings.chinaContactPhone || '',
        chinaContactName: (tenant as any).chinaContactName || tenantSettings.chinaContactName || '',
      },
      branches: tenantBranches.map((b) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        type: b.type,
        isPickupPoint: (b as any).isPickupPoint !== false,
        isActive: (b as any).isActive !== false,
      })),
      originWarehouses: tenantOriginWarehouses.map((w: any) => ({
        id: w.id,
        name: w.name,
        country: w.country || 'Китай',
        countryCode: w.countryCode || 'CN',
        city: w.city || 'Иу',
        address: w.address,
        phone: w.phone,
        contactName: w.contactName,
        isActive: w.isActive !== false,
      })),
      loyalty: tenantSettings.loyaltySettings || null,
      customer: {
        id: customer.id,
        cargoCode: customer.cargoCode,
        fullName: customer.fullName,
        phone: customer.phone,
        telegramUsername: (customer as any).telegramUsername || '',
        telegramUserId: (customer as any).telegramUserId || null,
        preferredBranchId: (customer as any).preferredBranchId || tenantBranches[0]?.id || 'b-001',
        bonusBalance: (customer as any).bonusBalance || 0,
        balance: customer.balance || 0,
        currency: customer.currency || tenant.baseCurrency || 'USD',
        invitedByCustomerId: (customer as any).invitedByCustomerId || null,
        referralCode: (customer as any).referralCode || customer.cargoCode,
      },
      pickupQr: qrPayload,
      warehouseAddressFor1688,
      packageCounts: {
        ready: customerPackages.filter((p) => p.status === 'READY_FOR_PICKUP').length,
        inTransit: customerPackages.filter((p) => p.status === 'IN_TRANSIT').length,
        atOrigin: customerPackages.filter((p) => p.status === 'RECEIVED_AT_ORIGIN').length,
      },
      packages: customerPackages.map((p) => ({
        id: p.id,
        trackingNumber: p.trackingNumber,
        status: p.status,
        weightKg: p.weightKg,
        cost: p.cost,
        currency: p.currency,
        photos: p.photos,
        description: p.description,
        shelfLocation: (p as any).shelfLocation || '',
        createdAt: p.createdAt,
      })),
    };
  }
);

// Client MiniApp Auth Lookup by Cargo ID
fastify.get<{ Params: { slug: string }; Querystring: { code: string } }>(
  '/api/app/:slug/auth/lookup',
  async (request, reply) => {
    const { slug } = request.params;
    const { code } = request.query;
    const tenant = store.tenants.find((t) => t.slug.toLowerCase() === (slug || '').toLowerCase()) || store.tenants[0];
    if (!tenant) return reply.status(404).send({ error: 'Cargo not found' });

    const rawInput = (code || '').trim().toUpperCase();
    if (!rawInput) return reply.status(400).send({ error: 'Code required' });

    const numPart = rawInput.replace(/\D+/g, '');
    const cleanRaw = rawInput.replace(/[^A-Z0-9]/g, '');

    const found = store.customers.find((c) => {
      if (c.tenantId && tenant.id && c.tenantId !== tenant.id) return false;
      const cCode = (c.cargoCode || '').toUpperCase();
      if (cCode === rawInput) return true;
      if (cCode.replace(/[^A-Z0-9]/g, '') === cleanRaw) return true;
      const cNum = cCode.replace(/\D+/g, '');
      if (numPart && cNum && (numPart === cNum || parseInt(numPart, 10) === parseInt(cNum, 10))) return true;
      return false;
    });

    if (!found) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    const customerPackages = store.packages.filter((p) => p.customerId === found.id || p.customerCargoCode === found.cargoCode);

    return {
      success: true,
      customer: {
        id: found.id,
        cargoCode: found.cargoCode,
        fullName: found.fullName,
        phone: found.phone,
        telegramUsername: found.telegramUsername,
        telegramUserId: (found as any).telegramUserId || null,
        preferredBranchId: found.preferredBranchId,
        bonusBalance: (found as any).bonusBalance || 0,
        debtUSD: (found as any).debtUSD || 0,
      },
      packages: customerPackages.map((p) => ({
        id: p.id,
        trackingNumber: p.trackingNumber,
        status: p.status,
        weightKg: p.weightKg,
        cost: p.cost,
        currency: p.currency,
        photos: p.photos,
        description: p.description,
        shelfLocation: (p as any).shelfLocation || '',
        createdAt: p.createdAt,
      })),
    };
  }
);

// Mini App endpoint to update customer's preferred branch (PVZ)
fastify.post<{
  Params: { slug: string };
  Body: { cargoCode?: string; branchId: string; telegramUserId?: number | string };
}>('/api/app/:slug/customer/branch', async (request, reply) => {
  const { slug } = request.params;
  const { cargoCode, branchId, telegramUserId } = request.body || {};
  let tenant = store.tenants.find((t) => (t.slug || '').toLowerCase() === (slug || '').toLowerCase());
  if (!tenant && store.tenants.length > 0) tenant = store.tenants[0];
  if (!tenant) return reply.status(404).send({ error: 'Cargo not found' });

  if (!branchId) return reply.status(400).send({ error: 'branchId is required' });

  const cleanCode = (cargoCode || '').trim().toUpperCase();
  const cust = store.customers.find(
    (c) =>
      (c.tenantId === tenant!.id || !c.tenantId) &&
      (((c.cargoCode || '').toUpperCase() === cleanCode && cleanCode.length > 0) ||
        (telegramUserId && (c as any).telegramUserId && String((c as any).telegramUserId) === String(telegramUserId)))
  );

  if (cust) {
    cust.preferredBranchId = branchId;
    store.packages.forEach((p) => {
      if (
        (p.tenantId === tenant!.id || !p.tenantId) &&
        (p.customerId === cust.id || (p.customerCargoCode || '').toUpperCase() === (cust.cargoCode || '').toUpperCase()) &&
        p.status !== 'RELEASED'
      ) {
        (p as any).branchId = branchId;
      }
    });
    store.saveToFile();
    return { success: true, preferredBranchId: branchId, customer: cust };
  }

  return reply.status(404).send({ error: 'Customer not found' });
});

function originHubPhone(phone?: string | null) {
  return phone || '+86 138 0000 0000';
}

// Pre-register track number by customer in Mini App
fastify.post<{
  Params: { slug: string };
  Body: {
    trackingNumber: string;
    description?: string;
  };
}>('/api/app/:slug/packages/pre-register', async (request, reply) => {
  const { slug } = request.params;
  const { trackingNumber, description } = request.body;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Cargo not found' });

  const customer = store.customers.find((c) => c.tenantId === tenant.id) || store.customers[0];
  const originBranch = store.branches.find((b) => b.tenantId === tenant.id && b.type === 'ORIGIN_HUB') || store.branches[0];

  const newPackage = {
    id: store.nextId('pkg', store.packages),
    tenantId: tenant.id,
    trackingNumber: trackingNumber.trim(),
    internalBarcode: `PKG-${tenant.codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: customer?.id || null,
    customerCargoCode: customer?.cargoCode || store.nextCargoCode(tenant),
    currentBranchId: originBranch?.id || 'branch-origin',
    weightKg: 0,
    cost: 0,
    currency: 'USD',
    photos: [],
    description: description || null,
    status: 'PRE_REGISTERED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.packages.unshift(newPackage);
  store.saveToFile();
  return { success: true, package: newPackage };
});

// ==========================================
// 12. Universal Smart Migration & Import API
// ==========================================
fastify.post<{
  Params: { slug: string };
  Body: {
    type: 'mongo' | 'json';
    mongoUri?: string;
    dbName?: string;
    jsonCollections?: Record<string, Record<string, any>[]>;
    defaultBranchId?: string;
    costPerKgUSD?: number;
  };
}>('/api/o/:slug/import/preview', async (request, reply) => {
  const { slug } = request.params;
  const body = request.body || ({} as any);

  try {
    const result = await runSmartMigration(
      {
        type: body.type || 'json',
        mongoUri: body.mongoUri,
        dbName: body.dbName,
        jsonCollections: body.jsonCollections,
      },
      {
        tenantSlug: slug,
        dryRun: true,
        defaultBranchId: body.defaultBranchId,
        costPerKgUSD: body.costPerKgUSD,
      }
    );
    return result;
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: err.message || 'Ошибка анализа данных миграции',
    });
  }
});

fastify.post<{
  Params: { slug: string };
  Body: {
    type: 'mongo' | 'json';
    mongoUri?: string;
    dbName?: string;
    jsonCollections?: Record<string, Record<string, any>[]>;
    defaultBranchId?: string;
    costPerKgUSD?: number;
  };
}>('/api/o/:slug/import/execute', async (request, reply) => {
  const { slug } = request.params;
  const body = request.body || ({} as any);

  try {
    const result = await runSmartMigration(
      {
        type: body.type || 'json',
        mongoUri: body.mongoUri,
        dbName: body.dbName,
        jsonCollections: body.jsonCollections,
      },
      {
        tenantSlug: slug,
        dryRun: false,
        defaultBranchId: body.defaultBranchId,
        costPerKgUSD: body.costPerKgUSD,
      }
    );
    return result;
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: err.message || 'Ошибка выполнения миграции',
    });
  }
});

// Auto-check bot webhooks on startup
async function initBotWebhooksOnStartup() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (envToken && !envToken.startsWith('MOCK_')) {
    const primaryTenant = store.tenants[0] || { id: 'tenant-noor', name: 'NOOR CARGO', slug: 'noor' };
    let botCfg = store.botConfigs.find((b) => b.tenantId === primaryTenant.id);
    if (!botCfg) {
      botCfg = {
        id: store.nextId('bot', store.botConfigs),
        tenantId: primaryTenant.id,
        botToken: envToken,
        botUsername: '',
        welcomeMessage: `Добро пожаловать в ${primaryTenant.name}!`,
        channelIdForPosting: null,
        reviewsChannelId: null,
        managerUsername: null,
        isActive: true,
        webhookSecret: `sec_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      store.botConfigs.push(botCfg);
    } else {
      botCfg.botToken = envToken;
      botCfg.isActive = true;
    }
  }

  for (const botCfg of store.botConfigs) {
    if (botCfg.isActive && botCfg.botToken && !botCfg.botToken.startsWith('MOCK_')) {
      const tenant = store.tenants.find((t) => t.id === botCfg.tenantId) || store.tenants[0];
      if (tenant) {
        try {
          await setupTelegramBotWebhook(botCfg.botToken, tenant.slug, tenant.name);
        } catch (err: any) {
          console.warn(`[Startup Bot Init] Failed to set webhook for ${tenant.name}: ${err.message}`);
        }
      }
    }
  }
}

// Start the API server
const PORT = Number(process.env.PORT) || 4000;
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 CargonaOS API Gateway & Bot Engine running at http://0.0.0.0:${PORT}`);
    initBotWebhooksOnStartup();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
