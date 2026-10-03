import { callTelegram } from './telegram.js';

export function registerBotHealth(app: any, store: any, domain: string, send = callTelegram) {
  domain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
  app.get('/health/bots', async (request: any, reply: any) => {
    // Only docker exec/loopback probes. Public reverse proxy requests cannot trigger Telegram calls.
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.ip)) return reply.status(403).send({ status: 'forbidden' });
    const configs = store.botConfigs.filter((b: any) => b.isActive && b.botToken && !b.botToken.startsWith('MOCK_'));
    const checks = await Promise.all(configs.map(async (bot: any) => {
      try {
        const tenant = store.tenants.find((t: any) => t.id === bot.tenantId);
        if (!tenant) return false;
        const info = await send(bot.botToken, 'getWebhookInfo', {});
        return info.url === `https://${domain}/api/bot/webhook/${tenant.slug}` &&
          Number(info.pending_update_count || 0) < 100 &&
          !(Number(info.last_error_date || 0) > Date.now() / 1000 - 3600);
      } catch { return false; }
    }));
    const ok = checks.every(Boolean);
    return reply.status(ok ? 200 : 503).send({ status: ok ? 'ok' : 'unavailable', checked: checks.length, failed: checks.filter(v => !v).length });
  });
}
