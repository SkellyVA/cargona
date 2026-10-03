export function registerStorageLifecycle(app: any, store: any) {
  const releases = new WeakMap<object, () => void>();
  app.addHook('onRequest', async (request: any, reply: any) => {
    if (request.url.split('?')[0].startsWith('/health')) return;
    if (store.storageMode === 'postgres') {
      releases.set(request, await store.acquire());
      try { await store.checkStorage(); }
      catch { return reply.status(503).send({ error: 'Хранилище недоступно. Изменения временно заблокированы.' }); }
    }
    if (store.persistenceError) return reply.status(503).send({ error: 'Хранилище недоступно. Изменения временно заблокированы.' });
  });
  app.addHook('onSend', async (request: any, reply: any, payload: any) => {
    try {
      await store.flush();
      return payload;
    } catch {
      reply.code(503).type('application/json');
      return JSON.stringify({ error: 'Сохранение не подтверждено. Хранилище заблокировано до восстановления.' });
    } finally {
      releases.get(request)?.();
      releases.delete(request);
    }
  });
  app.addHook('onClose', async () => { await store.close(); });
}
