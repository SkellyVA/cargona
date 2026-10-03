import { createHash, randomBytes } from 'node:crypto';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export function registerCustomerLinks(app: any, store: any) {
  const audit = (tenantId: string, customer: any, actor: any, action: string, details: string) => {
    store.auditLogs.unshift({ id: store.nextId('audit', store.auditLogs), tenantId, entityType: 'CUSTOMER', entityId: customer.id,
      userId: String(actor.id), userName: actor.name || actor.fullName || actor.first_name || '', userRole: actor.role || 'CUSTOMER', action, details, createdAt: new Date().toISOString() });
  };
  app.post('/api/o/:slug/customers/:id/telegram-link', async (request: any, reply: any) => {
    const actor = request.authUser;
    if (!actor || !['OWNER', 'TENANT_OWNER', 'SUPERADMIN', 'SUPER_ADMIN'].includes(actor.role)) return reply.status(403).send({ error: 'Ссылку создаёт только владелец' });
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    if (!tenant || (!['SUPERADMIN', 'SUPER_ADMIN'].includes(actor.role) && actor.organizationSlug !== tenant.slug)) return reply.status(403).send({ error: 'Нет доступа к компании' });
    const customer = store.customers.find((c: any) => c.id === request.params.id && c.tenantId === tenant.id);
    if (!customer) return reply.status(404).send({ error: 'Клиент не найден' });
    if (customer.telegramUserId || customer.isBlocked) return reply.status(409).send({ error: 'Клиент уже привязан к Telegram или заблокирован' });
    const bot = store.botConfigs.find((b: any) => b.tenantId === tenant.id && b.isActive && b.botToken);
    const username = String(bot?.botUsername || store.tenantSettings[tenant.id]?.botUsername || '').replace(/^@/, '');
    if (!bot || !/^[A-Za-z0-9_]+$/.test(username)) return reply.status(400).send({ error: 'Сначала настройте активного бота' });
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    store.clientLinks = store.clientLinks.filter((l: any) => Date.parse(l.expiresAt) > now && !(l.tenantId === tenant.id && l.customerId === customer.id));
    const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();
    store.clientLinks.push({ tenantId: tenant.id, customerId: customer.id, tokenHash: hash(token), expiresAt, createdBy: actor.id });
    audit(tenant.id, customer, actor, 'TELEGRAM_LINK_CREATED', 'Создана одноразовая ссылка привязки Telegram на 30 минут');
    await store.saveToFile();
    return { url: `https://t.me/${username}?startapp=link_${token}`, expiresAt };
  });
  const resolve = (request: any, reply: any) => {
    if (!request.telegramUser) { reply.status(401).send({ error: 'Откройте ссылку через Telegram' }); return; }
    const token = request.body?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) { reply.status(400).send({ error: 'Некорректная ссылка' }); return; }
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    const link = store.clientLinks.find((l: any) => l.tenantId === tenant?.id && l.tokenHash === hash(token));
    if (!link) { reply.status(404).send({ error: 'Ссылка не найдена или заменена новой' }); return; }
    if (link.usedAt) { reply.status(409).send({ error: 'Ссылка уже использована' }); return; }
    if (Date.parse(link.expiresAt) <= Date.now()) { reply.status(410).send({ error: 'Ссылка истекла. Попросите владельца создать новую' }); return; }
    const customer = store.customers.find((c: any) => c.tenantId === tenant.id && c.id === link.customerId);
    if (!customer || customer.isBlocked || customer.telegramUserId || store.customers.some((c: any) => c.tenantId === tenant.id && Number(c.telegramUserId) === request.telegramUser.id)) {
      reply.status(409).send({ error: 'Этот клиент или аккаунт Telegram уже привязан либо недоступен' }); return;
    }
    return { link, customer, tenant };
  };
  app.post('/api/app/:slug/customer/link/preview', async (request: any, reply: any) => {
    const result = resolve(request, reply);
    if (result) return { fullName: result.customer.fullName, cargoCode: result.customer.cargoCode, expiresAt: result.link.expiresAt };
  });
  app.post('/api/app/:slug/customer/link', async (request: any, reply: any) => {
    const result = resolve(request, reply);
    if (!result) return;
    const { customer, link, tenant } = result;
    customer.telegramUserId = request.telegramUser.id;
    customer.telegramUsername = request.telegramUser.username || '';
    link.usedAt = new Date().toISOString();
    audit(tenant.id, customer, request.telegramUser, 'TELEGRAM_LINKED', `Подтверждена привязка Telegram ${request.telegramUser.id}, карго-код сохранён`);
    await store.saveToFile();
    return { success: true, cargoCode: customer.cargoCode };
  });
}
