import { randomUUID } from 'node:crypto';
import { callTelegram } from './telegram.js';

export function registerBroadcasts(app: any, store: any, send = callTelegram, pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))) {
  const exclusive = (action: () => Promise<void>) => store.exclusive ? store.exclusive(action) : action();
  store.botBroadcasts ||= [];
  let interrupted = false;
  for (const job of store.botBroadcasts) if (job.status === 'RUNNING') { job.status = 'INTERRUPTED'; interrupted = true; }
  app.addHook('onReady', async () => { if (interrupted) await store.saveToFile(); });
  const audience = (tenantId: string, branchId?: string) => {
    const customers = store.customers.filter((c: any) => c.tenantId === tenantId && (!branchId || c.preferredBranchId === branchId));
    const recipients = [...new Set<number>(customers.filter((c: any) => !c.isBlocked).map((c: any) => Number(c.telegramUserId)).filter((id: number) => Number.isSafeInteger(id) && id > 0))];
    return { recipients, totalCustomers: customers.length, skipped: customers.length - recipients.length };
  };
  app.get('/api/o/:slug/broadcasts', async (request: any, reply: any) => {
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    if (!tenant) return reply.status(404).send({ error: 'Компания не найдена' });
    return store.botBroadcasts.filter((job: any) => job.tenantId === tenant.id).slice(-20).reverse();
  });
  app.get('/api/o/:slug/broadcasts/preview', async (request: any, reply: any) => {
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    if (!tenant) return reply.status(404).send({ error: 'Компания не найдена' });
    const { recipients, ...counts } = audience(tenant.id, request.query.branchId);
    return { ...counts, recipientCount: recipients.length };
  });
  app.get('/api/o/:slug/broadcasts/:id', async (request: any, reply: any) => {
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    const job = store.botBroadcasts.find((j: any) => j.id === request.params.id && j.tenantId === tenant?.id);
    return job || reply.status(404).send({ error: 'Рассылка не найдена' });
  });
  app.post('/api/o/:slug/broadcasts', async (request: any, reply: any) => {
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    if (!tenant) return reply.status(404).send({ error: 'Компания не найдена' });
    const { text, branchId } = request.body || {};
    if (typeof text !== 'string' || !text.trim() || text.length > 4096) return reply.status(400).send({ error: 'Введите сообщение до 4096 символов' });
    if (branchId && !store.branches.some((b: any) => b.tenantId === tenant.id && b.id === branchId)) return reply.status(400).send({ error: 'ПВЗ не найден' });
    const bot = store.botConfigs.find((b: any) => b.tenantId === tenant.id && b.isActive && b.botToken);
    if (!bot) return reply.status(400).send({ error: 'Подключите бота перед рассылкой' });
    const token = bot.botToken;
    if (store.botBroadcasts.some((j: any) => j.tenantId === tenant.id && j.status === 'RUNNING')) return reply.status(409).send({ error: 'Предыдущая рассылка ещё выполняется' });
    const { recipients, skipped } = audience(tenant.id, branchId);
    if (!recipients.length) return reply.status(400).send({ error: 'Нет клиентов с доступным личным чатом Telegram' });
    const job = { id: randomUUID(), tenantId: tenant.id, text: text.trim(), branchId: branchId || null, status: 'RUNNING', total: recipients.length, sent: 0, failed: 0, skipped, errors: [] as any[], createdAt: new Date().toISOString(), completedAt: null as string | null };
    store.botBroadcasts.push(job);
    await store.saveToFile();
    const actor = request.authUser;
    void (async () => {
      for (const chatId of recipients) {
        if (store.persistenceError) throw new Error('Storage unavailable');
        let failure: unknown;
        try {
          try { await send(token, 'sendMessage', { chat_id: chatId, text: job.text }); }
          catch (error: any) {
            if (!error.retryAfter) throw error;
            await pause(error.retryAfter * 1000);
            await send(token, 'sendMessage', { chat_id: chatId, text: job.text });
          }
        } catch (error) {
          failure = error;
        }
        await exclusive(async () => {
          if (failure) {
            job.failed++;
            job.errors.push({ chatId, error: failure instanceof Error ? failure.message : 'Ошибка отправки' });
          } else job.sent++;
          await store.saveToFile();
        });
        await pause(1000);
      }
      await exclusive(async () => {
        job.status = 'COMPLETED';
        job.completedAt = new Date().toISOString();
        store.auditLogs.unshift({ id: randomUUID(), tenantId: tenant.id, entityType: 'TENANT', entityId: job.id, action: 'BROADCAST', details: `Рассылка: отправлено ${job.sent}, ошибок ${job.failed}`, createdAt: job.completedAt, userId: actor?.id, userName: actor?.name || actor?.fullName, userRole: actor?.role });
        await store.saveToFile();
      });
    })().catch(async () => {
      if (!store.persistenceError) await exclusive(async () => { job.status = 'INTERRUPTED'; await store.saveToFile(); });
    }).catch(() => { console.error('[Broadcast] Storage unavailable; broadcast interrupted'); });
    return reply.status(202).send(job);
  });
}
