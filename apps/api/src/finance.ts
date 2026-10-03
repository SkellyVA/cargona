import { createHash } from 'node:crypto';

const cents = (n: number) => Math.round(n * 100);
const money = (n: number) => cents(n) / 100;
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { statusCode: status }); }
function amount(value: any, zero = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isSafeInteger(cents(value)) || value < 0 || (!zero && value === 0) || Math.abs(value * 100 - cents(value)) > 0.0001) fail('Сумма должна быть корректной, с точностью до копеек');
  return value;
}
export function ensureDefaultCashAccounts(store: any, tenantId: string) {
  store.cashAccounts ||= [];
  let changed = false;
  const add = (type: string, name: string, branch?: any) => {
    if (store.cashAccounts.some((a: any) => a.tenantId === tenantId && a.type === type && (a.branchId || null) === (branch?.id || null))) return;
    const now = new Date().toISOString();
    store.cashAccounts.push({ id: store.nextId('acc', store.cashAccounts), tenantId, branchId: branch?.id || null, type, name, currency: 'USD', balance: branch?.cashBalance || 0, isActive: true, createdAt: now, updatedAt: now });
    changed = true;
  };
  add('SAFE', 'Главный сейф (Офис)'); add('BANK', 'Расчетный счет / Эквайринг');
  for (const branch of store.branches.filter((b: any) => b.tenantId === tenantId)) add('CASH_PVZ', `Касса: ${branch.name}`, branch);
  return changed;
}

export function registerFinance(app: any, store: any) {
  const owner = (actor: any) => { if (!['OWNER', 'TENANT_OWNER', 'SUPERADMIN', 'SUPER_ADMIN'].includes(actor.role)) fail('Доступно только владельцу', 403); };
  const account = (tenantId: string, id: string) => {
    const a = store.cashAccounts.find((a: any) => a.tenantId === tenantId && a.id === id && a.isActive);
    if (!a) fail('Активный счёт этой компании не найден');
    amount(a.balance, true);
    if (a.type === 'CASH_PVZ') {
      const branch = store.branches.find((b: any) => b.tenantId === tenantId && b.id === a.branchId);
      if (!branch || cents(branch.cashBalance || 0) !== cents(a.balance)) fail('Остатки ПВЗ и счёта расходятся. Владелец должен провести сверку кассы', 409);
    }
    return a;
  };
  const setBalance = (a: any, value: number) => {
    amount(value, true); a.balance = money(value); a.updatedAt = new Date().toISOString();
    if (a.type === 'CASH_PVZ') {
      const branch = store.branches.find((b: any) => b.tenantId === a.tenantId && b.id === a.branchId);
      branch.cashBalance = a.balance; branch.updatedAt = a.updatedAt;
    }
  };
  const audit = (tenant: any, actor: any, id: string, action: string, before: any, after: any, details: string, branchId?: string) => {
    store.auditLogs.unshift({ id: store.nextId('audit', store.auditLogs), tenantId: tenant.id, branchId: branchId || null,
      userId: actor.id, userName: actor.name || '', userRole: actor.role, entityType: 'PAYMENT', entityId: id, action,
      oldValues: before, newValues: after, details, createdAt: new Date().toISOString() });
  };
  const transaction = (tenant: any, actor: any, fields: any) => {
    const tx = { id: store.nextId('tx', store.financialTransactions), tenantId: tenant.id, currency: 'USD', exchangeRate: 1,
      ...fields, createdBy: actor.name || actor.id, createdByUserId: actor.id, createdAt: new Date().toISOString() };
    store.financialTransactions.unshift(tx); return tx;
  };
  const post = (path: string, action: (request: any, tenant: any, actor: any) => any) => app.post(path, async (request: any, reply: any) => {
    try {
      const actor = request.authUser;
      if (!actor) fail('Требуется вход', 401);
      const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
      if (!tenant) fail('Компания не найдена', 404);
      if (!['OWNER', 'TENANT_OWNER', 'ADMIN', 'MANAGER', 'SUPERADMIN', 'SUPER_ADMIN'].includes(actor.role) || (!['SUPERADMIN', 'SUPER_ADMIN'].includes(actor.role) && actor.organizationSlug !== tenant.slug)) fail('Нет доступа к финансам компании', 403);
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) fail('Обновите интерфейс: отсутствует ключ операции');
      const body = request.body || {};
      if (typeof body !== 'object' || Array.isArray(body)) fail('Некорректная форма операции');
      request.body = body;
      if (/\/(confirm|reject|reconcile|return)$/.test(request.url.split('?')[0]) || body.type === 'CUSTOMER_REFUND' || body.type === 'CHARGE') owner(actor);
      const fingerprint = createHash('sha256').update(request.url.split('?')[0] + JSON.stringify(body, Object.keys(body).sort())).digest('hex');
      const previous = store.financialReceipts.find((r: any) => r.tenantId === tenant.id && r.key === key);
      if (previous) {
        if (previous.actorId !== actor.id || previous.fingerprint !== fingerprint) fail('Ключ уже использован для другой операции', 409);
        return { ...previous.response, replayed: true };
      }
      // ponytail: synchronous mutations and one atomic snapshot; replace with a DB transaction for multi-process PostgreSQL.
      const response = action(request, tenant, actor);
      store.financialReceipts.push({ tenantId: tenant.id, actorId: actor.id, key, fingerprint, response: JSON.parse(JSON.stringify(response)), createdAt: new Date().toISOString() });
      await store.saveToFile(); return response;
    } catch (error: any) { if (error.statusCode) return reply.status(error.statusCode).send({ error: error.message }); throw error; }
  });
  const scoped = (list: any[], id: string, tenantId: string, label: string) => {
    const record = list.find((x: any) => x.id === id && x.tenantId === tenantId);
    if (!record) fail(`${label} не найден в компании`); return record;
  };
  const refundSource = (tenantId: string, body: any) => {
    if (!!body.originalPaymentId === !!body.originalTransactionId) fail('Выберите одну исходную оплату');
    const isPayment = !!body.originalPaymentId;
    const original = scoped(isPayment ? store.payments : store.financialTransactions, body.originalPaymentId || body.originalTransactionId, tenantId, 'Исходная оплата');
    if (!(original.amount > 0) || !(isPayment ? original.currency === 'USD' && ['DELIVERY_PAYMENT', 'TOP_UP'].includes(original.type) : original.type === 'CUSTOMER_PAYMENT' && original.createdByUserId && Number.isFinite(original.amountUSD))) fail('Для этой старой или неподтверждённой оплаты нужен ручной аудит', 409);
    const reference = isPayment ? 'originalPaymentId' : 'originalTransactionId';
    const refunded = store.financialTransactions.filter((t: any) => t.tenantId === tenantId && t.type === 'CUSTOMER_REFUND' && t[reference] === original.id).reduce((s: number, t: any) => s + cents(t.amountUSD), 0);
    if (!Number.isSafeInteger(refunded) || !Number.isSafeInteger(cents(original.amountUSD ?? original.amount))) fail('Исходная оплата требует проверки сумм', 409);
    return { original, reference, remaining: (cents(original.amountUSD ?? original.amount) - refunded) / 100 };
  };
  post('/api/o/:slug/finance/transactions', (request, tenant, actor) => {
    const b = request.body; const types = ['INCOME', 'EXPENSE', 'TRANSFER', 'CUSTOMER_PAYMENT', 'CUSTOMER_REFUND'];
    if (!types.includes(b.type)) fail('Неизвестный тип операции');
    amount(b.amount);
    const currency = b.currency || 'USD'; const rate = currency === 'USD' ? 1 : b.exchangeRate;
    if (!['USD', 'TJS', 'RUB', 'CNY'].includes(currency) || !Number.isFinite(rate) || rate <= 0) fail('Укажите валюту и положительный курс');
    const amountUSD = amount(money(b.amount / rate));
    for (const [key, list, label] of [['relatedCustomerId', store.customers, 'Клиент'], ['relatedPackageId', store.packages, 'Посылка'], ['relatedTripId', store.trips, 'Рейс'], ['relatedBranchId', store.branches, 'ПВЗ']] as any) if (b[key]) scoped(list, b[key], tenant.id, label);
    let refund: any;
    if (b.type === 'CUSTOMER_REFUND') { owner(actor); refund = refundSource(tenant.id, b); if (amountUSD > refund.remaining + 0.001) fail('Возврат превышает остаток исходной оплаты', 409); if (b.relatedCustomerId && b.relatedCustomerId !== refund.original.customerId && b.relatedCustomerId !== refund.original.relatedCustomerId) fail('Оплата принадлежит другому клиенту'); }
    const reversedCustomer = refund?.original.customerBalanceAfterUSD !== undefined ? scoped(store.customers, refund.original.relatedCustomerId, tenant.id, 'Клиент оплаты') : null;
    const reversedBalance = reversedCustomer ? amountSigned(money(amountSigned(reversedCustomer.balance || 0) - amountUSD)) : undefined;
    ensureDefaultCashAccounts(store, tenant.id);
    const source = account(tenant.id, b.accountId);
    const target = b.type === 'TRANSFER' ? account(tenant.id, b.targetAccountId) : null;
    if (target && target.id === source.id) fail('Выберите разные счета');
    const outgoing = ['EXPENSE', 'TRANSFER', 'CUSTOMER_REFUND'].includes(b.type);
    if (outgoing && cents(source.balance) < cents(amountUSD)) fail('Недостаточно средств на счёте', 409);
    if (!outgoing) amount(money(source.balance + amountUSD), true);
    if (target) amount(money(target.balance + amountUSD), true);
    const before = { accountId: source.id, balanceUSD: source.balance, targetAccountId: target?.id, targetBalanceUSD: target?.balance, customerBalanceUSD: reversedCustomer?.balance };
    setBalance(source, source.balance + (outgoing ? -amountUSD : amountUSD));
    if (target) setBalance(target, target.balance + amountUSD);
    if (reversedCustomer) reversedCustomer.balance = reversedBalance;
    const after = { ...before, balanceUSD: source.balance, targetBalanceUSD: target?.balance, customerBalanceUSD: reversedCustomer?.balance };
    const tx = transaction(tenant, actor, { accountId: source.id, targetAccountId: target?.id || null, type: b.type, category: b.category || 'Прочие операции',
      amount: b.amount, currency, exchangeRate: rate, amountUSD, comment: b.comment || null, receiptUrl: b.receiptUrl || null,
      relatedCustomerId: refund ? refund.original.customerId || refund.original.relatedCustomerId : b.relatedCustomerId || null, relatedPackageId: b.relatedPackageId || null, relatedBranchId: source.branchId || b.relatedBranchId || null, relatedTripId: b.relatedTripId || null,
      ...(refund ? { [refund.reference]: refund.original.id } : {}), balanceBeforeUSD: before.balanceUSD, balanceAfterUSD: source.balance, targetBalanceBeforeUSD: before.targetBalanceUSD, targetBalanceAfterUSD: target?.balance, customerBalanceBeforeUSD: before.customerBalanceUSD, customerBalanceAfterUSD: after.customerBalanceUSD });
    audit(tenant, actor, tx.id, 'CREATE', before, after, `${b.type}: ${amountUSD} USD`, source.branchId);
    return { success: true, transaction: tx, account: source, targetAccount: target };
  });
  post('/api/o/:slug/finance/packages/:id/return', (request, tenant, actor) => {
    owner(actor);
    const b = request.body; const pkg = scoped(store.packages, request.params.id, tenant.id, 'Посылка');
    if (!String(b.reason || '').trim()) fail('Укажите причину возврата');
    if (pkg.status === 'RETURNED') fail('Возврат этой посылки уже оформлен', 409);
    const value = amount(b.refundAmountUSD || 0, true);
    let tx: any; let source: any; let refund: any;
    if (value > 0) {
      refund = refundSource(tenant.id, b);
      const paidForPackage = refund.original.packageAmountsUSD?.[pkg.id] ?? (refund.original.relatedPackageId === pkg.id ? refund.original.amountUSD : undefined);
      if (!Number.isFinite(paidForPackage) || value > paidForPackage + 0.001 || value > refund.remaining + 0.001) fail('Возврат превышает подтверждённую оплату этой посылки', 409);
      ensureDefaultCashAccounts(store, tenant.id); source = account(tenant.id, b.accountId);
      if (source.balance < value) fail('Недостаточно средств для возврата', 409);
    }
    if (source) {
      const before = source.balance; setBalance(source, before - value);
      tx = transaction(tenant, actor, { accountId: source.id, type: 'CUSTOMER_REFUND', amount: value, amountUSD: value, relatedPackageId: pkg.id, relatedCustomerId: pkg.customerId || refund.original.customerId, [refund.reference]: refund.original.id, balanceBeforeUSD: before, balanceAfterUSD: source.balance, comment: b.reason });
    }
    const oldStatus = pkg.status;
    pkg.status = 'RETURNED'; pkg.returnReason = b.reason; pkg.refundAmountUSD = value; pkg.returnTrackingNumber = b.returnTrackingNumber || ''; pkg.updatedAt = new Date().toISOString();
    audit(tenant, actor, pkg.id, 'RETURN', { status: oldStatus }, { status: pkg.status, refundAmountUSD: value, transactionId: tx?.id }, `Возврат ${pkg.trackingNumber}: ${b.reason}`, pkg.currentBranchId);
    return { success: true, package: pkg, transaction: tx };
  });
  post('/api/o/:slug/finance/collections', (request, tenant, actor) => {
    const b = request.body; const value = amount(b.amount);
    const branch = scoped(store.branches, b.sourceBranchId, tenant.id, 'ПВЗ');
    ensureDefaultCashAccounts(store, tenant.id);
    const source = account(tenant.id, store.cashAccounts.find((a: any) => a.tenantId === tenant.id && a.branchId === branch.id && a.type === 'CASH_PVZ')?.id);
    const target = account(tenant.id, store.cashAccounts.find((a: any) => a.tenantId === tenant.id && a.type === 'SAFE')?.id);
    if (cents(source.balance) < cents(value)) fail('В кассе недостаточно наличных', 409);
    const before = source.balance; setBalance(source, source.balance - value);
    const now = new Date().toISOString();
    const collection = { id: store.nextId('col', store.cashCollections), tenantId: tenant.id, receiptNumber: `COL-${store.nextId('col', store.cashCollections)}`, sourceBranchId: branch.id, sourceAccountId: source.id, targetAccountId: target.id, amount: value, amountUSD: value, currency: 'USD', status: 'REQUESTED', requestedBy: actor.name || actor.id, requestedByUserId: actor.id, notes: b.notes || null, createdAt: now };
    store.cashCollections.unshift(collection);
    audit(tenant, actor, collection.id, 'CASH_COLLECTION', { balanceUSD: before }, { balanceUSD: source.balance, inTransitUSD: value }, `Передано на инкассацию ${value} USD`, branch.id);
    return { success: true, collection };
  });
  for (const status of ['confirm', 'reject']) post(`/api/o/:slug/finance/collections/:id/${status}`, (request, tenant, actor) => {
    owner(actor);
    const collection = scoped(store.cashCollections, request.params.id, tenant.id, 'Инкассация');
    const wanted = status === 'confirm' ? 'CONFIRMED' : 'REJECTED';
    if (collection.status === wanted) return { success: true, collection, alreadyProcessed: true };
    if (collection.status !== 'REQUESTED') fail('Инкассация уже обработана другим действием', 409);
    const value = amount(collection.amountUSD ?? collection.amount);
    const target = account(tenant.id, status === 'confirm' ? collection.targetAccountId : collection.sourceAccountId);
    if (status === 'confirm' ? target.type !== 'SAFE' : target.type !== 'CASH_PVZ' || target.branchId !== collection.sourceBranchId) fail('Счёт инкассации требует проверки', 409);
    const before = target.balance; amount(money(before + value), true);
    setBalance(target, before + value); collection.status = wanted;
    collection.confirmedBy = actor.name || actor.id; collection.confirmedByUserId = actor.id; collection.confirmedAt = new Date().toISOString();
    if (status === 'reject') collection.rejectionReason = request.body?.reason || 'Отклонено владельцем';
    const tx = transaction(tenant, actor, { accountId: target.id, type: 'COLLECTION', category: wanted, amount: value, amountUSD: value, collectionId: collection.id, relatedBranchId: collection.sourceBranchId, balanceBeforeUSD: before, balanceAfterUSD: target.balance });
    audit(tenant, actor, tx.id, 'UPDATE', { balanceUSD: before, status: 'REQUESTED' }, { balanceUSD: target.balance, status: wanted }, `Инкассация ${collection.receiptNumber}: ${wanted}`, collection.sourceBranchId);
    return { success: true, collection, account: target };
  });
  post('/api/o/:slug/finance/customers/:id/balance', (request, tenant, actor) => {
    const b = request.body; if (!['TOP_UP', 'PAYMENT', 'CHARGE'].includes(b.type)) fail('Для возврата используйте исходную оплату');
    const value = amount(b.amount); const customer = scoped(store.customers, request.params.id, tenant.id, 'Клиент');
    const before = amountSigned(customer.balance || 0);
    const after = money(before + (b.type === 'CHARGE' ? -value : value)); amountSigned(after);
    let target: any;
    if (b.type === 'CHARGE') owner(actor); else { ensureDefaultCashAccounts(store, tenant.id); target = account(tenant.id, b.accountId); amount(money(target.balance + value), true); }
    const cashBefore = target?.balance;
    if (target) setBalance(target, target.balance + value);
    customer.balance = after;
    const tx = transaction(tenant, actor, { accountId: target?.id || null, type: b.type === 'CHARGE' ? 'CUSTOMER_CHARGE' : 'CUSTOMER_PAYMENT', category: b.type, amount: value, amountUSD: value, relatedCustomerId: customer.id, comment: b.comment || null, balanceBeforeUSD: cashBefore, balanceAfterUSD: target?.balance, customerBalanceBeforeUSD: before, customerBalanceAfterUSD: after });
    audit(tenant, actor, tx.id, 'UPDATE', { customerBalanceUSD: before, cashBalanceUSD: cashBefore }, { customerBalanceUSD: after, cashBalanceUSD: target?.balance }, `${b.type}: ${value} USD, клиент ${customer.cargoCode}`, target?.branchId);
    return { success: true, customer, transaction: tx, targetAccount: target };
  });
  post('/api/o/:slug/finance/trip-expenses', (request, tenant, actor) => {
    const b = request.body; scoped(store.trips, b.tripId, tenant.id, 'Рейс');
    const value = amount(b.amount); if ((b.currency || 'USD') !== 'USD') fail('Расход на рейс передаётся в USD');
    const expense = { id: store.nextId('te', store.tripExpenses), tenantId: tenant.id, tripId: b.tripId, category: b.category || 'TRUCK_FREIGHT', amount: value, amountUSD: value, currency: 'USD', comment: b.comment || null, createdAt: new Date().toISOString(), createdBy: actor.id };
    store.tripExpenses.unshift(expense); audit(tenant, actor, expense.id, 'CREATE', {}, { amountUSD: value }, `Расход рейса ${b.tripId}: ${value} USD`);
    return { success: true, tripExpense: expense };
  });
  post('/api/o/:slug/finance/accounts/:id/reconcile', (request, tenant, actor) => {
    owner(actor); if (!String(request.body?.reason || '').trim()) fail('Укажите причину сверки');
    const a = scoped(store.cashAccounts, request.params.id, tenant.id, 'Счёт');
    if (!a.isActive) fail('Счёт отключён');
    const value = amount(request.body.observedAmountUSD, true); const before = amountSigned(a.balance);
    const branch = store.branches.find((b: any) => b.tenantId === tenant.id && b.id === a.branchId);
    if (a.type === 'CASH_PVZ' && !branch) fail('ПВЗ счёта не найден');
    const branchBefore = branch?.cashBalance;
    setBalance(a, value);
    const tx = transaction(tenant, actor, { accountId: a.id, type: 'RECONCILIATION', category: 'Сверка кассы', amount: Math.abs(money(value - before)), amountUSD: Math.abs(money(value - before)), comment: request.body.reason, balanceBeforeUSD: before, balanceAfterUSD: value });
    audit(tenant, actor, tx.id, 'UPDATE', { balanceUSD: before, branchBalanceUSD: branchBefore }, { balanceUSD: value }, `Сверка: ${request.body.reason}`, a.branchId);
    return { success: true, account: a, transaction: tx };
  });
  app.get('/api/o/:slug/finance/refund-options', async (request: any) => {
    const tenant = store.tenants.find((t: any) => t.slug === request.params.slug);
    const result: any[] = [];
    for (const [records, reference] of [[store.payments, 'originalPaymentId'], [store.financialTransactions, 'originalTransactionId']] as any) for (const original of records.filter((r: any) => r.tenantId === tenant.id)) {
      try { const source = refundSource(tenant.id, { [reference]: original.id }); if (source.remaining > 0) result.push({ id: original.id, reference, customerId: original.customerId || original.relatedCustomerId, remainingUSD: source.remaining, createdAt: original.createdAt }); } catch {}
    }
    return { payments: result };
  });
}
function amountSigned(value: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isSafeInteger(cents(value))) fail('Некорректный баланс клиента'); return value;
}
