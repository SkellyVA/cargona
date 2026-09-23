import Fastify from 'fastify';
import cors from '@fastify/cors';
import { store } from './store.js';

const fastify = Fastify({
  logger: true,
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

  const tenantBranches = store.branches.filter((b) => b.tenantId === tenant.id);
  const tenantStaff = store.users.filter((u) => u.tenantId === tenant.id);
  const tenantCustomers = store.customers.filter((c) => c.tenantId === tenant.id);
  const tenantTrips = store.trips.filter((t) => t.tenantId === tenant.id);
  const tenantPackages = store.packages.filter((p) => p.tenantId === tenant.id);
  const tenantAuditLogs = store.auditLogs.filter((a) => a.tenantId === tenant.id);
  const tenantWarehouses = store.originWarehouses.filter((w: any) => w.tenantId === tenant.id);
  const settings = store.tenantSettings[tenant.id] || {
    companyName: tenant.name,
    codePrefix: tenant.codePrefix,
    ownerEmail: (tenant as any).ownerEmail,
    baseCurrency: tenant.baseCurrency || 'USD',
  };

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

// --- Branches & Cells Management ---
fastify.get<{ Params: { slug: string } }>('/api/o/:slug/branches', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const branches = store.branches.filter((b) => b.tenantId === tenant.id).map((b) => {
    const cells = store.storageCells.filter((c) => c.branchId === b.id);
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

  if (Array.isArray(request.body.cells)) {
    for (const cell of request.body.cells) {
      store.storageCells.push({
        id: store.nextId('cell', store.storageCells),
        tenantId: tenant.id,
        branchId: newBranch.id,
        rack: cell.rack || 'Стеллаж 1',
        shelf: cell.shelf || 'Полка 1',
        barcode: cell.barcode || `CELL-${newBranch.id}-${Date.now()}`,
        isOccupied: false,
        packageCount: 0,
      });
    }
  }

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

  store.branches.splice(idx, 1);
  store.storageCells = store.storageCells.filter((c) => c.branchId !== id);
  store.saveToFile();
  return { success: true, message: 'Branch deleted' };
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

  const user = store.users.find((u) => u.id === id && u.tenantId === tenant.id);
  if (!user) return reply.status(404).send({ error: 'Staff member not found' });

  Object.assign(user, request.body);
  user.updatedAt = new Date().toISOString();
  store.saveToFile();
  return { success: true, employee: user };
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

  const customers = store.customers.filter((c) => c.tenantId === tenant.id);
  return { customers };
});

fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/customers', async (request, reply) => {
  const { slug } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const { cargoCode, fullName, phone, telegramUsername, balanceUSD, preferredBranchId, notes } = request.body;
  const code = (cargoCode || store.nextCargoCode(tenant)).toUpperCase().trim();

  const newCustomer = {
    id: store.nextId('cust', store.customers),
    tenantId: tenant.id,
    cargoCode: code,
    fullName: fullName ? fullName.trim() : `Клиент ${code}`,
    phone: phone ? phone.trim() : '+992 90 000 0000',
    telegramUsername: telegramUsername || null,
    balance: balanceUSD || 0,
    currency: tenant.baseCurrency || 'USD',
    isBlocked: false,
    notes: notes || null,
    preferredBranchId: preferredBranchId || null,
    createdAt: new Date().toISOString(),
  };

  store.customers.push(newCustomer);
  store.saveToFile();
  return { success: true, customer: newCustomer };
});

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/customers/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const cust = store.customers.find((c) => (c.id === id || c.cargoCode === id) && c.tenantId === tenant.id);
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

fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/packages/:id', async (request, reply) => {
  const { slug, id } = request.params;
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return reply.status(404).send({ error: 'Organization not found' });

  const pkg = store.packages.find((p) => (p.id === id || p.trackingNumber === id) && p.tenantId === tenant.id);
  if (!pkg) return reply.status(404).send({ error: 'Package not found' });

  Object.assign(pkg, request.body);
  if (request.body.costUSD) pkg.cost = request.body.costUSD;
  pkg.updatedAt = new Date().toISOString();
  store.saveToFile();
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

  Object.assign(trip, request.body);
  trip.updatedAt = new Date().toISOString();
  store.saveToFile();
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
// 4. Telegram Bot Management & Webhooks (BYOB)
// ==========================================

// Helper: Setup Webhook with Telegram API
async function setupTelegramBotWebhook(token: string, tenantSlug: string, tenantName: string) {
  const cleanToken = token.trim();
  const domain = APP_DOMAIN.replace(/^https?:\/\//, '');
  const webhookUrl = `https://${domain}/api/bot/webhook/${tenantSlug}`;
  const appUrl = `https://${domain}/o/${tenantSlug}/app`;

  // 1. Verify token & get bot username
  const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
  const meData = (await meRes.json()) as any;
  if (!meData || !meData.ok) {
    throw new Error(meData?.description || 'Неверный токен Telegram бота. Проверьте токен от @BotFather.');
  }

  const botUsername = meData.result.username;

  // 2. Set Telegram Webhook
  const hookRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
    }),
  });
  const hookData = (await hookRes.json()) as any;
  if (!hookData.ok) {
    console.warn(`[Bot Webhook] Warning for ${botUsername}:`, hookData);
  }

  // 3. Set Default Chat Menu Button (Persistent WebApp button)
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
    });
  } catch (e) {
    console.error(`[Bot Menu Button] Failed for ${botUsername}:`, e);
  }

  // 4. Set Bot Commands: ONLY /start
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [{ command: 'start', description: '📦 Открыть личный кабинет' }],
      }),
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
    };
  }

  const botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id);
  return {
    botToken: botConfig?.botToken || '',
    botUsername: botConfig?.botUsername || '',
    isActive: botConfig?.isActive || false,
    channelId: botConfig?.channelIdForPosting || '',
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
    autoChannelPosting?: boolean;
    welcomeMessage?: string;
    companyName?: string;
  };
}>('/api/o/:slug/bot-settings', async (request, reply) => {
  const { slug } = request.params;
  const { botToken, managerUsername, channelId, welcomeMessage, companyName } = request.body;
  let tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant && store.tenants.length > 0 && (slug === 'cargona' || !slug)) {
    tenant = store.tenants[0];
  }

  if (!tenant) {
    const rawName = companyName?.trim() || (slug && slug !== 'cargona' ? slug : 'My Cargo');
    const safeSlug =
      slug && slug !== 'cargona'
        ? slug
        : rawName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'cargo';
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
    if (tenant.slug === 'cargona') {
      const safeSlug =
        (companyName?.trim() || 'cargo')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'cargo';
      tenant.slug = safeSlug;
    }
  }

  if (!botToken || !botToken.trim()) {
    // Disable bot for tenant
    const existing = store.botConfigs.find((b) => b.tenantId === tenant.id);
    if (existing) {
      existing.isActive = false;
      store.saveToFile();
    }
    return { success: true, message: 'Бот отключен' };
  }

  // Deactivate this token from any other tenant config so there's no ghost webhook
  for (const b of store.botConfigs) {
    if (b.botToken === botToken.trim() && b.tenantId !== tenant.id) {
      b.isActive = false;
      b.botToken = '';
    }
  }

  try {
    const botInfo = await setupTelegramBotWebhook(botToken, tenant.slug, tenant.name);

    let botConfig = store.botConfigs.find((b) => b.tenantId === tenant.id);
    if (!botConfig) {
      botConfig = {
        id: store.nextId('bot', store.botConfigs),
        tenantId: tenant.id,
        botToken: botToken.trim(),
        botUsername: botInfo.username,
        welcomeMessage: welcomeMessage || `Добро пожаловать в ${tenant.name}!`,
        channelIdForPosting: channelId || null,
        isActive: true,
        webhookSecret: `sec_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      store.botConfigs.push(botConfig);
    } else {
      botConfig.botToken = botToken.trim();
      botConfig.botUsername = botInfo.username;
      botConfig.channelIdForPosting = channelId || botConfig.channelIdForPosting;
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

// Telegram Webhook Handler (Incoming messages from Telegram)
fastify.post<{
  Params: { slug: string };
  Body: any;
}>('/api/bot/webhook/:slug', async (request, reply) => {
  const { slug } = request.params;
  const update = request.body;

  let tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) {
    console.warn(`[Bot Webhook] Received update for unknown tenant slug: ${slug}`);
    return reply.send({ ok: true });
  }

  let botConfig = store.botConfigs.find((b) => b.tenantId === tenant!.id && b.isActive);
  if (!botConfig || !botConfig.botToken) {
    const anyActiveConfig = store.botConfigs.find((b) => b.isActive && b.botToken);
    if (anyActiveConfig) {
      const activeTenant = store.tenants.find((t) => t.id === anyActiveConfig.tenantId);
      if (activeTenant) {
        tenant = activeTenant;
        botConfig = anyActiveConfig;
      }
    }
  }

  if (!botConfig || !botConfig.botToken) {
    return reply.send({ ok: true });
  }

  const token = botConfig.botToken;
  const message = update?.message || update?.edited_message;
  if (!message || !message.chat) {
    return reply.send({ ok: true });
  }

  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const fromUser = message.from;
  const userName = fromUser?.first_name || fromUser?.username || 'клиент';
  const domain = APP_DOMAIN.replace(/^https?:\/\//, '');
  const appUrl = `https://${domain}/o/${tenant.slug}/app`;

  try {
    // 1. Search track number if user sends a digits/track string (length >= 6 and not a command)
    if (text.length >= 6 && !text.startsWith('/')) {
      const foundPkg = store.packages.find(
        (p) =>
          p.tenantId === tenant.id &&
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
      `👋 <b>Здравствуйте, ${userName}!</b>\n\n` +
      `Вас приветствует официальный бот карго-компании <b>«${tenant.name}»</b>.\n\n` +
      `📱 <b>В нашем личном кабинете вы можете:</b>\n` +
      `• 📦 Отслеживать трек-номера и статус доставки\n` +
      `• 🏷 Получить персональный QR-код для выдачи в ПВЗ\n` +
      `• 🇨🇳 Скопировать адрес нашего склада в Китае для 1688 / Taobao\n` +
      `• 🚚 Видеть выехавшие и прибывшие рейсы\n\n` +
      `👇 <i>Нажмите кнопку ниже, чтобы открыть кабинет:</i>`;

    const inlineKeyboard: any[][] = [
      [{ text: '📦 Открыть личный кабинет', web_app: { url: appUrl } }],
    ];

    if (botConfig.channelIdForPosting) {
      const channelLink = `https://t.me/${botConfig.channelIdForPosting.replace('@', '')}`;
      inlineKeyboard.push([{ text: '📢 Наш Telegram-канал', url: channelLink }]);
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
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
    customerId: string;
    packageIds: string[];
    amountPaid: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_QR';
    branchId: string;
  };
}>('/api/wms/handover', async (request, reply) => {
  const { customerId, packageIds, amountPaid, paymentMethod, branchId } = request.body;

  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) return reply.status(404).send({ error: 'Customer not found' });

  // Update package statuses to RELEASED
  for (const pkgId of packageIds) {
    const pkg = store.packages.find((p) => p.id === pkgId);
    if (pkg) {
      pkg.status = 'RELEASED';
      pkg.releasedAt = new Date().toISOString();
      pkg.storageCellId = null;
    }
  }

  // Update branch cash desk
  const branch = store.branches.find((b) => b.id === branchId);
  if (branch && paymentMethod === 'CASH') {
    branch.cashBalance += amountPaid;
  }

  // Record payment
  const payment = {
    id: store.nextId('pay', store.payments),
    tenantId: customer.tenantId,
    branchId,
    customerId: customer.id,
    cashierUserId: 'user-cashier-001',
    amount: amountPaid,
    currency: 'TJS',
    method: paymentMethod,
    type: 'DELIVERY_PAYMENT' as const,
    createdAt: new Date().toISOString(),
  };

  // Add audit log
  store.auditLogs.push({
    id: store.nextId('audit', store.auditLogs),
    tenantId: customer.tenantId,
    branchId,
    userId: 'user-cashier-001',
    userName: 'Кассир ПВЗ',
    userRole: 'PVZ_OPERATOR',
    entityType: 'PACKAGE',
    entityId: packageIds[0] || customerId,
    action: 'HANDOVER',
    details: `Выдано ${packageIds.length} посылок клиенту ${customer.cargoCode}. Принято: ${amountPaid} TJS (${paymentMethod})`,
    createdAt: new Date().toISOString(),
  });

  store.saveToFile();

  return {
    success: true,
    message: 'Посылки успешно выданы',
    releasedCount: packageIds.length,
    paymentId: payment.id,
  };
});

// ==========================================
// 6. Client Telegram Mini App Endpoints (/app/:slug)
// ==========================================
fastify.get<{ Params: { slug: string }; Querystring: { tgUserId?: string } }>(
  '/api/app/:slug/me',
  async (request, reply) => {
    const { slug } = request.params;
    let tenant = store.tenants.find((t) => t.slug.toLowerCase() === (slug || '').toLowerCase());
    if (!tenant && store.tenants.length > 0) {
      tenant = store.tenants[0];
    }
    if (!tenant) return reply.status(404).send({ error: 'Cargo not found' });

    const customer = store.customers.find((c) => c.tenantId === tenant.id) || {
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

    const customerPackages = store.packages.filter((p) => p.customerId === customer.id || p.tenantId === tenant.id);

    const qrPayload = `cargona://pickup?t=${tenant.slug}&c=${customer.cargoCode}&token=sec_${Date.now()}`;
    const originWarehouse = store.branches.find((b) => b.tenantId === tenant.id && b.type === 'ORIGIN_HUB')
      || store.branches.find((b) => b.type === 'ORIGIN_HUB')
      || { address: 'Yiwu International Trade City', phone: '+86 138 0000 0000' };

    const warehouseAddressFor1688 = `收件人: ${customer.fullName} (${customer.cargoCode})\n电话: ${originHubPhone(originWarehouse.phone)}\n地址: 浙江省金华市义乌市 ${originWarehouse.address} (${customer.cargoCode})`;

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        codePrefix: tenant.codePrefix,
      },
      customer: {
        cargoCode: customer.cargoCode,
        fullName: customer.fullName,
        balance: customer.balance,
        currency: customer.currency,
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
        createdAt: p.createdAt,
      })),
    };
  }
);

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

// Auto-check bot webhooks on startup
async function initBotWebhooksOnStartup() {
  for (const botCfg of store.botConfigs) {
    if (botCfg.isActive && botCfg.botToken && !botCfg.botToken.startsWith('MOCK_')) {
      const tenant = store.tenants.find((t) => t.id === botCfg.tenantId);
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
