import { telegramIdentity, webhookSecret } from './telegram-identity.js';

const pick = (value: any, keys: string[]) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const publicTenantKeys = ['id', 'name', 'slug', 'codePrefix', 'baseCurrency', 'timezone', 'logoUrl'];
const publicSettingsKeys = ['companyName', 'codePrefix', 'customerIdStart', 'baseCurrency', 'chinaWarehouseAddress', 'chinaContactPhone', 'chinaContactName', 'botUsername', 'managerUsername', 'channelId', 'reviewsChannelId', 'paymentRequisites', 'autoDeliveryRatePerKgUSD', 'airDeliveryRatePerKgUSD', 'minPackageCostUSD', 'freeStorageDays', 'loyaltySettings'];

export function registerClientSecurity(app: any, store: any) {
  const companyFor = (slug: string) => store.tenants.find((t: any) => t.slug === slug);
  const botFor = (tenant: any) => store.botConfigs.find((b: any) => b.tenantId === tenant?.id && b.isActive && b.botToken);
  const owns = (pkg: any, client: any) => pkg && client && pkg.tenantId === client.tenantId && (pkg.customerId === client.id || pkg.customerCargoCode === client.cargoCode);
  app.addHook('preHandler', async (request: any, reply: any) => {
    const path = request.url.split('?')[0];
    if (path.startsWith('/api/wms/')) {
      const staff = request.authUser;
      if (!staff) return reply.status(401).send({ error: 'Требуется вход' });
      if (!['OWNER', 'TENANT_OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'PVZ_OPERATOR', 'CASHIER', 'SUPERADMIN', 'SUPER_ADMIN'].includes(staff.role)) return reply.status(403).send({ error: 'Нет доступа к выдаче' });
      const superadmin = ['SUPERADMIN', 'SUPER_ADMIN'].includes(staff.role);
      const tenant = companyFor(superadmin ? request.body?.tenantSlug : staff.organizationSlug);
      if (!tenant) return reply.status(400).send({ error: 'Укажите компанию' });
      const employee = store.users.find((u: any) => u.id === staff.id && u.tenantId === tenant.id);
      const limited = !['OWNER', 'TENANT_OWNER', 'ADMIN', 'MANAGER', 'SUPERADMIN', 'SUPER_ADMIN'].includes(staff.role);
      const branchId = limited ? employee?.assignedBranchId : request.body?.branchId;
      if (limited && !branchId) return reply.status(403).send({ error: 'Сотруднику не назначен ПВЗ' });
      request.branchScope = limited ? branchId : null;
      if (path === '/api/wms/handover') {
        if (!store.branches.some((b: any) => b.id === branchId && b.tenantId === tenant.id)) return reply.status(400).send({ error: 'ПВЗ не найден' });
        const customer = store.customers.find((c: any) => c.tenantId === tenant.id && (c.id === request.body.customerId || c.cargoCode === request.body.customerId));
        if (!customer) return reply.status(400).send({ error: 'Клиент не найден' });
        const replay = store.handoverReceipts?.some((r: any) => r.tenantId === tenant.id && r.actorId === staff.id && r.key === request.headers['idempotency-key']);
        if (!Array.isArray(request.body.packageIds) || !request.body.packageIds.length || request.body.packageIds.some((id: string) => {
          const pkg = store.packages.find((p: any) => p.tenantId === tenant.id && (p.id === id || p.trackingNumber === id));
          return !owns(pkg, customer) || pkg.currentBranchId !== branchId || (!replay && pkg.status !== 'READY_FOR_PICKUP');
        })) return reply.status(409).send({ error: 'Посылки должны принадлежать клиенту и быть готовы к выдаче в этом ПВЗ' });
        if (!Number.isFinite(request.body.amountPaid) || request.body.amountPaid < 0) return reply.status(400).send({ error: 'Некорректная сумма' });
        if (new Set(request.body.packageIds).size !== request.body.packageIds.length || !['CASH', 'CARD', 'ONLINE_QR', 'TRANSFER'].includes(request.body.paymentMethod)) return reply.status(400).send({ error: 'Некорректный список посылок или способ оплаты' });
        request.body.tenantSlug = tenant.slug;
        request.body.branchId = branchId;
        request.body.customerId = customer.id;
      } else if (path === '/api/wms/pickup/verify-qr') {
        try {
          const qr = new URL(String(request.body.qrString).replace('cargona://pickup', 'https://cargona.local'));
          if (qr.searchParams.get('t') !== tenant.slug) return reply.status(403).send({ error: 'QR другой компании' });
          const customer = store.customers.find((c: any) => c.tenantId === tenant.id && c.cargoCode === qr.searchParams.get('c'));
          if (limited && (!customer || (customer.preferredBranchId !== branchId && !store.packages.some((p: any) => owns(p, customer) && p.currentBranchId === branchId && p.status === 'READY_FOR_PICKUP')))) return reply.status(403).send({ error: 'Клиент другого ПВЗ' });
        } catch { return reply.status(400).send({ error: 'Некорректный QR' }); }
      } else return reply.status(403).send({ error: 'Неизвестный маршрут WMS' });
      return;
    }
    const webhook = path.match(/^\/api\/bot\/webhook\/([^/]+)$/);
    if (webhook) {
      const bot = botFor(companyFor(decodeURIComponent(webhook[1])));
      if (!bot || request.headers['x-telegram-bot-api-secret-token'] !== webhookSecret(bot.botToken)) return reply.status(403).send({ error: 'Invalid webhook secret' });
      return;
    }
    const match = path.match(/^\/api\/(app|o)\/([^/]+)\/(.*)$/);
    if (!match) return;
    const [, surface, rawSlug, resource] = match;
    const tenant = companyFor(decodeURIComponent(rawSlug));
    if (!tenant) return reply.status(404).send({ error: 'Компания не найдена' });
    const init = request.headers['x-telegram-init-data'];
    const user = typeof init === 'string' ? telegramIdentity(init, botFor(tenant)?.botToken || '') : null;
    if (init && !user) return reply.status(401).send({ error: 'Проверка Telegram не пройдена. Откройте приложение заново через бота.' });
    const customer = user && store.customers.find((c: any) => c.tenantId === tenant.id && Number(c.telegramUserId) === user.id && !c.isBlocked);
    if (user && store.customers.some((c: any) => c.tenantId === tenant.id && Number(c.telegramUserId) === user.id && c.isBlocked)) return reply.status(403).send({ error: 'Клиентский аккаунт заблокирован' });
    request.telegramUser = user;
    request.clientCustomer = customer || null;
    if (surface === 'app') {
      if (['customer/link', 'customer/link/preview'].includes(resource) && request.method === 'POST') {
        if (!user) return reply.status(401).send({ error: 'Откройте ссылку через Telegram' });
        return;
      }
      if (resource === 'bootstrap' || resource === 'me') {
        request.query = { ...(request.query || {}), tgUserId: user ? String(user.id) : undefined, cargoCode: customer?.cargoCode };
        return;
      }
      if (!user || !customer) return reply.status(401).send({ error: 'Откройте личный кабинет через Telegram' });
      if (resource === 'auth/lookup') {
        const query = String(request.query.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const code = customer.cargoCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (query !== code && query !== code.replace(/\D+/g, '')) return reply.status(403).send({ error: 'Нет доступа к этому клиенту' });
      } else if (resource === 'customer/branch') {
        request.body.cargoCode = customer.cargoCode;
        request.body.telegramUserId = user.id;
        if (!store.branches.some((b: any) => b.tenantId === tenant.id && b.id === request.body.branchId)) return reply.status(400).send({ error: 'ПВЗ не найден' });
      } else return reply.status(403).send({ error: 'Этот клиентский маршрут недоступен' });
      return;
    }
    if (request.body && typeof request.body === 'object') {
      if (request.method === 'PUT' && ((resource.startsWith('customers/') && ['balance', 'balanceUSD'].some(key => request.body[key] !== undefined)) || (resource.startsWith('branches/') && ['cashBalance', 'cashBalanceUSD'].some(key => request.body[key] !== undefined)) || (resource.startsWith('packages/') && (request.body.status === 'RETURNED' || ['refundAmountUSD', 'returnReason', 'returnTrackingNumber'].some(key => request.body[key] !== undefined))))) return reply.status(400).send({ error: 'Денежные операции и возвраты проводятся через раздел финансов' });
      delete request.body.id;
      delete request.body.tenantId;
      for (const key of ['branchId', 'assignedBranchId', 'currentBranchId', 'targetBranchId', 'originBranchId', 'destinationBranchId', 'preferredBranchId']) {
        const id = request.body[key];
        if (id && ![...store.branches, ...store.originWarehouses].some((b: any) => b.id === id && b.tenantId === tenant.id)) return reply.status(400).send({ error: 'Локация не принадлежит компании' });
      }
      if (request.body.originWarehouseId && !store.originWarehouses.some((w: any) => w.id === request.body.originWarehouseId && w.tenantId === tenant.id)) return reply.status(400).send({ error: 'Склад не принадлежит компании' });
      if (request.body.manifestItems && (!Array.isArray(request.body.manifestItems) || request.body.manifestItems.some((item: any) => item.packageId && !store.packages.some((p: any) => p.id === item.packageId && p.tenantId === tenant.id)))) return reply.status(400).send({ error: 'Некорректный состав рейса' });
    }
    if (user) {
      if (resource === 'loyalty' && request.method === 'GET') return;
      if (resource === 'customers' && request.method === 'POST') {
        if (store.customers.some((c: any) => c.tenantId === tenant.id && Number(c.telegramUserId) === user.id)) return reply.status(409).send({ error: 'Вы уже зарегистрированы. Откройте приложение заново.' });
        request.body = { ...pick(request.body, ['fullName', 'phone', 'preferredBranchId', 'invitedByCustomerId']), telegramUserId: user.id, telegramUsername: user.username || '', notes: 'Регистрация через Telegram Mini App' };
        if (request.body.preferredBranchId && !store.branches.some((b: any) => b.tenantId === tenant.id && b.id === request.body.preferredBranchId)) return reply.status(400).send({ error: 'ПВЗ не найден' });
        return;
      }
      if (!customer) return reply.status(401).send({ error: 'Завершите регистрацию' });
      if (resource === 'packages/bulk' && request.method === 'POST') {
        request.body = { ...pick(request.body, ['trackingNumbers', 'originWarehouseId', 'targetBranchId', 'description']), customerCargoCode: customer.cargoCode, attachExisting: true, skipExisting: true, weightKg: 0, status: 'PRE_REGISTERED' };
        return;
      }
      const review = resource.match(/^packages\/([^/]+)\/review$/);
      if (review && request.method === 'POST') {
        const pkg = store.packages.find((p: any) => p.tenantId === tenant.id && (p.id === decodeURIComponent(review[1]) || p.trackingNumber === decodeURIComponent(review[1])));
        if (!owns(pkg, customer)) return reply.status(403).send({ error: 'Нет доступа к этой посылке' });
        if (pkg.status !== 'RELEASED') return reply.status(409).send({ error: 'Отзыв доступен после получения посылки' });
        request.body = { ...pick(request.body, ['rating', 'comment', 'photos']), customerName: customer.fullName, customerCargoCode: customer.cargoCode };
        return;
      }
      return reply.status(403).send({ error: 'Нет доступа к этому действию' });
    }
    const staff = request.authUser;
    if (!staff) return reply.status(401).send({ error: 'Требуется вход' });
    if (['SUPERADMIN', 'SUPER_ADMIN'].includes(staff.role)) return;
    if (staff.organizationSlug !== tenant.slug) return reply.status(403).send({ error: 'Нет доступа к этой компании' });
    if (['OWNER', 'TENANT_OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      if (resource === 'loyalty' && request.method !== 'GET' && !['OWNER', 'TENANT_OWNER'].includes(staff.role)) return reply.status(403).send({ error: 'Доступно только владельцу' });
      return;
    }
    const employee = store.users.find((u: any) => u.id === staff.id && u.tenantId === tenant.id);
    const branchId = employee?.assignedBranchId;
    if (!branchId || !store.branches.some((b: any) => b.tenantId === tenant.id && b.id === branchId)) return reply.status(403).send({ error: 'Сотруднику не назначена локация' });
    request.branchScope = branchId;
    if (!['OPERATOR', 'PVZ_OPERATOR', 'CASHIER', 'SORTER', 'WAREHOUSE'].includes(staff.role)) return reply.status(403).send({ error: 'Недопустимая роль' });
    const category = resource.split('/')[0];
    const allowed = ['all', 'dashboard', 'branches', 'warehouses', 'customers', 'packages', 'loyalty', ...(['SORTER', 'WAREHOUSE'].includes(staff.role) ? ['trips'] : []), ...(staff.role === 'CASHIER' ? ['finance'] : [])];
    if (!allowed.includes(category)) return reply.status(403).send({ error: 'Недостаточно прав' });
    if (['GET', 'HEAD'].includes(request.method)) {
      if (category === 'dashboard' || category === 'finance') return reply.status(403).send({ error: 'Сводка доступна администратору; данные локации доступны в рабочем разделе' });
      if (category === 'packages' && request.params.id) {
        const pkg = store.packages.find((p: any) => p.tenantId === tenant.id && p.id === request.params.id);
        if (pkg?.currentBranchId !== branchId) return reply.status(403).send({ error: 'Посылка другой локации' });
      }
      return;
    }
    if (request.method === 'DELETE' || category === 'loyalty' || category === 'warehouses' || category === 'finance') return reply.status(403).send({ error: 'Доступно администратору или владельцу' });
    if (category === 'trips' && request.method === 'PUT' && ['SORTER', 'WAREHOUSE'].includes(staff.role)) {
      const trip = store.trips.find((t: any) => t.tenantId === tenant.id && (t.id === request.params.id || t.tripCode === request.params.id));
      if (trip?.originBranchId !== branchId) return reply.status(403).send({ error: 'Рейс другой локации' });
      if (request.body.manifestItems?.some((item: any) => item.packageId && !store.packages.some((p: any) => p.id === item.packageId && p.currentBranchId === branchId && p.tenantId === tenant.id))) return reply.status(403).send({ error: 'Посылка другой локации' });
      return;
    }
    if (category === 'branches' && resource.endsWith('/cells') && request.params.id === branchId && ['OPERATOR', 'PVZ_OPERATOR', 'SORTER', 'WAREHOUSE'].includes(staff.role)) return;
    if (category === 'packages') {
      if (!['OPERATOR', 'PVZ_OPERATOR', 'SORTER', 'WAREHOUSE'].includes(staff.role)) return reply.status(403).send({ error: 'Нет доступа к приёмке' });
      if (request.params.id) {
        const pkg = store.packages.find((p: any) => p.tenantId === tenant.id && p.id === request.params.id);
        if (pkg?.currentBranchId !== branchId) return reply.status(403).send({ error: 'Посылка другой локации' });
      }
      if (request.body.status === 'RELEASED') return reply.status(403).send({ error: 'Используйте выдачу через кассу' });
      request.body.currentBranchId = branchId;
      if (resource === 'packages/bulk') return reply.status(403).send({ error: 'Массовое добавление доступно администратору' });
      return;
    }
    if (category === 'customers' && ['OPERATOR', 'PVZ_OPERATOR'].includes(staff.role)) {
      if (request.params.id) {
        const client = store.customers.find((c: any) => c.tenantId === tenant.id && c.id === request.params.id);
        if (client?.preferredBranchId !== branchId) return reply.status(403).send({ error: 'Клиент другого ПВЗ' });
      }
      request.body = { ...pick(request.body, ['cargoCode', 'fullName', 'phone', 'telegramUsername']), preferredBranchId: branchId };
      return;
    }
    return reply.status(403).send({ error: 'Изменение доступно администратору или владельцу' });
  });
  app.get('/api/app/:slug/bootstrap', async (request: any, reply: any) => {
    const tenant = companyFor(request.params.slug);
    if (!tenant) return reply.status(404).send({ error: 'Компания не найдена' });
    const client = request.clientCustomer;
    const invited = client ? store.customers.filter((c: any) => c.tenantId === tenant.id && c.id !== client.id && c.invitedByCustomerId && [client.id, client.cargoCode, client.referralCode].filter(Boolean).some((ref: string) => ref.toUpperCase().replace(/[^A-Z0-9]/g, '') === String(c.invitedByCustomerId).toUpperCase().replace(/[^A-Z0-9]/g, ''))) : [];
    const minimum = store.tenantSettings[tenant.id]?.loyaltySettings?.activeReferralMinPackages || 1;
    const active = invited.filter((c: any) => store.packages.filter((p: any) => owns(p, c) && p.status === 'RELEASED').length >= minimum).length;
    return {
      referralStats: client ? { cargoCode: client.cargoCode, total: invited.length, active } : null,
      tenant: pick(tenant, publicTenantKeys), settings: pick(store.tenantSettings[tenant.id] || {}, publicSettingsKeys),
      branches: store.branches.filter((b: any) => b.tenantId === tenant.id).map((b: any) => pick(b, ['id', 'tenantId', 'name', 'city', 'country', 'address', 'phone', 'workingHours', 'type', 'isActive', 'isPickupPoint', 'deliveryTariffs'])),
      warehouses: store.originWarehouses.filter((w: any) => w.tenantId === tenant.id).map((w: any) => pick(w, ['id', 'tenantId', 'name', 'city', 'country', 'address', 'phone', 'receiverName', 'isActive'])),
      customers: client ? [client] : [], packages: client ? store.packages.filter((p: any) => owns(p, client)) : [],
      trips: client ? store.trips.filter((t: any) => t.tenantId === tenant.id && store.packages.some((p: any) => owns(p, client) && p.tripId === t.id)).map((t: any) => pick(t, ['id', 'originBranchId', 'destinationBranchId', 'departureDate', 'actualArrivalDate'])) : [], staff: [], auditLogs: [], cashAccounts: [], financialTransactions: [], cashCollections: [], tripExpenses: [], expenseCategories: [],
    };
  });
  app.addHook('onSend', async (request: any, reply: any, payload: any) => {
    if (!request.branchScope || reply.statusCode >= 400 || typeof payload !== 'string' || !String(reply.getHeader('content-type')).includes('application/json')) return payload;
    const data = JSON.parse(payload);
    const branch = request.branchScope;
    const relevant = (key: string, item: any) => key === 'branches' || key === 'warehouses' ? item.id === branch : key === 'customers' ? item.preferredBranchId === branch : key === 'packages' || key === 'readyPackages' ? (item.currentBranchId || store.packages.find((p: any) => p.id === item.id)?.currentBranchId) === branch : key === 'trips' ? item.originBranchId === branch || item.destinationBranchId === branch : item.branchId === branch;
    for (const key of ['branches', 'warehouses', 'customers', 'packages', 'readyPackages', 'trips', 'staff', 'auditLogs', 'cashAccounts', 'financialTransactions', 'cashCollections', 'tripExpenses']) if (Array.isArray(data[key])) data[key] = data[key].filter((item: any) => relevant(key, item));
    if (request.url.includes('/all')) { data.settings = pick(data.settings, publicSettingsKeys); delete data.expenseCategories; }
    if (Array.isArray(data.readyPackages)) data.totalAmountToPay = data.readyPackages.reduce((sum: number, p: any) => sum + (p.cost || 0), 0);
    return JSON.stringify(data);
  });
}
