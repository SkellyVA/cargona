import { createHash } from 'node:crypto';
import { ensureDefaultCashAccounts } from './finance.js';

export function registerHandover(app: any, store: any) {
  app.post('/api/wms/handover', async (request: any, reply: any) => {
    const actor = request.authUser;
    if (!actor) return reply.status(401).send({ error: 'Требуется вход' });
    const body = request.body;
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return reply.status(400).send({ error: 'Обновите интерфейс: отсутствует ключ операции' });
    const tenant = store.tenants.find((t: any) => t.slug === body.tenantSlug);
    const branch = store.branches.find((b: any) => b.id === body.branchId && b.tenantId === tenant?.id);
    const customer = store.customers.find((c: any) => c.id === body.customerId && c.tenantId === tenant?.id);
    if (!tenant || !branch || !customer) return reply.status(400).send({ error: 'Компания, ПВЗ или клиент не найдены' });
    if (customer.isBlocked) return reply.status(403).send({ error: 'Клиент заблокирован' });
    if (!Array.isArray(body.packageIds) || !body.packageIds.length || !body.packageIds.every((id: any) => typeof id === 'string')) return reply.status(400).send({ error: 'Выберите посылки' });
    const packages = body.packageIds.map((id: string) => store.packages.find((p: any) => p.tenantId === tenant.id && (p.id === id || p.trackingNumber === id)));
    if (packages.some((p: any) => !p || (p.customerId !== customer.id && p.customerCargoCode !== customer.cargoCode) || p.currentBranchId !== branch.id)) return reply.status(409).send({ error: 'Посылки должны принадлежать клиенту и находиться в этом ПВЗ' });
    if (new Set(packages.map((p: any) => p.id)).size !== packages.length) return reply.status(400).send({ error: 'Повтор посылки в списке' });
    if (!Number.isFinite(body.amountPaid) || body.amountPaid < 0 || !['CASH', 'CARD', 'ONLINE_QR', 'TRANSFER'].includes(body.paymentMethod)) return reply.status(400).send({ error: 'Некорректная сумма или способ оплаты' });
    if (body.handoverPhoto !== undefined && (typeof body.handoverPhoto !== 'string' || body.handoverPhoto.length > 750000)) return reply.status(400).send({ error: 'Некорректное или слишком большое фото' });
    const fingerprint = createHash('sha256').update(JSON.stringify({ customerId: customer.id, branchId: branch.id,
      packageIds: packages.map((p: any) => p.id).sort(), amountPaid: body.amountPaid, paymentMethod: body.paymentMethod, handoverPhoto: body.handoverPhoto || '' })).digest('hex');
    const previous = store.handoverReceipts.find((r: any) => r.tenantId === tenant.id && r.key === key);
    if (previous) {
      if (previous.actorId !== actor.id || previous.fingerprint !== fingerprint) return reply.status(409).send({ error: 'Ключ уже использован для другой операции' });
      return { ...previous.response, replayed: true };
    }
    if (packages.some((p: any) => p.status !== 'READY_FOR_PICKUP')) return reply.status(409).send({ error: 'Посылка уже выдана или не готова к выдаче' });
    if (packages.some((p: any) => p.weightPending || (!(p.weightKg > 0) && !(p.cost > 0)) || !Number.isFinite(p.cost) || p.cost < 0)) return reply.status(409).send({ error: 'Сначала взвесьте посылки и рассчитайте стоимость' });
    // Existing package.cost and branch.cashBalance are USD amounts, as used by the panel.
    const amountUSD = Math.round(packages.reduce((sum: number, p: any) => sum + (p.isPaidOnline ? 0 : p.cost), 0) * 100) / 100;
    if (!Number.isSafeInteger(Math.round(amountUSD * 100)) || (branch.cashBalance != null && !Number.isFinite(branch.cashBalance))) return reply.status(409).send({ error: 'Некорректная стоимость или баланс кассы' });
    if (Math.abs(body.amountPaid - amountUSD) > 0.001) return reply.status(409).send({ error: 'Стоимость изменилась. Обновите данные и проверьте сумму', expectedAmountUSD: amountUSD });
    const now = new Date().toISOString();
    ensureDefaultCashAccounts(store, tenant.id);
    const cashAccount = store.cashAccounts.find((a: any) => a.tenantId === tenant.id && a.isActive && (body.paymentMethod === 'CASH' ? a.type === 'CASH_PVZ' && a.branchId === branch.id : a.type === 'BANK'));
    if (!cashAccount || (body.paymentMethod === 'CASH' && Math.round(cashAccount.balance * 100) !== Math.round((branch.cashBalance || 0) * 100))) return reply.status(409).send({ error: 'Проведите сверку кассы перед выдачей' });
    if (!Number.isFinite(cashAccount.balance) || cashAccount.balance < 0 || !Number.isSafeInteger(Math.round((cashAccount.balance + amountUSD) * 100))) return reply.status(409).send({ error: 'Некорректный остаток счёта' });
    const balanceBeforeUSD = cashAccount.balance;
    // ponytail: one synchronous store write commits issuance, cash, payment and receipt together; DB transaction when PostgreSQL lands.
    for (const pkg of packages) {
      pkg.status = 'RELEASED'; pkg.releasedAt = now; pkg.updatedAt = now; pkg.storageCellId = null; pkg.shelfLocation = '';
      if (body.handoverPhoto) { pkg.handoverPhoto = body.handoverPhoto; pkg.photos = [...(pkg.photos || []), body.handoverPhoto]; }
    }
    if (body.paymentMethod === 'CASH') branch.cashBalance = Math.round(((branch.cashBalance || 0) + amountUSD) * 100) / 100;
    cashAccount.balance = Math.round((cashAccount.balance + amountUSD) * 100) / 100; cashAccount.updatedAt = now;
    const payment = { id: store.nextId('pay', store.payments), tenantId: tenant.id, branchId: branch.id, customerId: customer.id,
      cashierUserId: actor.id, amount: amountUSD, currency: 'USD', method: body.paymentMethod === 'TRANSFER' ? 'BANK_TRANSFER' : body.paymentMethod,
      type: 'DELIVERY_PAYMENT', accountId: cashAccount.id, packageIds: packages.map((p: any) => p.id), packageAmountsUSD: Object.fromEntries(packages.map((p: any) => [p.id, p.isPaidOnline ? 0 : p.cost])), notes: `Выдача: ${packages.map((p: any) => p.id).join(', ')}`, createdAt: now };
    store.payments.push(payment);
    store.auditLogs.push({ id: store.nextId('audit', store.auditLogs), tenantId: tenant.id, branchId: branch.id,
      userId: actor.id, userName: actor.name || '', userRole: actor.role, entityType: 'PAYMENT', entityId: payment.id, action: 'HANDOVER',
      oldValues: { accountId: cashAccount.id, balanceUSD: balanceBeforeUSD }, newValues: { accountId: cashAccount.id, balanceUSD: cashAccount.balance },
      details: `Выдано ${packages.length} посылок клиенту ${customer.cargoCode}. Принято: ${amountUSD} USD (${payment.method})`, createdAt: now });
    const response = { success: true, message: 'Посылки успешно выданы', releasedCount: packages.length, paymentId: payment.id, amountUSD, releasedAt: now, branchCashBalanceUSD: branch.cashBalance };
    store.handoverReceipts.push({ tenantId: tenant.id, actorId: actor.id, key, fingerprint, response, createdAt: now });
    store.saveToFile();
    return response;
  });
}
