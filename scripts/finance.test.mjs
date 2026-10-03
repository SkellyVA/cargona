import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { registerFinance } from '../apps/api/src/finance.ts';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
let saved, failWrite = false, writes = 0;
const store = {
  tenants: [{ id: 't', slug: 'noor' }, { id: 'other', slug: 'other' }], tenantSettings: {}, botConfigs: [], users: [], originWarehouses: [],
  branches: [{ id: 'b', tenantId: 't', name: 'Branch', cashBalance: 50 }, { id: 'foreign-b', tenantId: 'other', cashBalance: 500 }],
  cashAccounts: [{ id: 'cash', tenantId: 't', branchId: 'b', type: 'CASH_PVZ', isActive: true, balance: 50 }, { id: 'safe', tenantId: 't', type: 'SAFE', isActive: true, balance: 100 }, { id: 'bank', tenantId: 't', type: 'BANK', isActive: true, balance: 0 }, { id: 'foreign', tenantId: 'other', type: 'SAFE', isActive: true, balance: 1000 }],
  customers: [{ id: 'c', tenantId: 't', cargoCode: 'NOOR/S1', balance: -10 }],
  packages: [{ id: 'p', tenantId: 't', customerId: 'c', currentBranchId: 'b', trackingNumber: 'TRACK', status: 'RELEASED', cost: 10 }, { id: 'unpaid', tenantId: 't', status: 'READY_FOR_PICKUP', currentBranchId: 'b' }],
  trips: [{ id: 'trip', tenantId: 't' }], cashCollections: [], financialTransactions: [], financialReceipts: [], auditLogs: [], tripExpenses: [],
  payments: [{ id: 'pay', tenantId: 't', customerId: 'c', amount: 10, currency: 'USD', type: 'DELIVERY_PAYMENT', packageAmountsUSD: { p: 10 } }],
  nextId: (prefix, items) => `${prefix}-${items.length + 1}`,
  saveToFile() { if (failWrite) { this.persistenceError = true; throw new Error('disk full'); } writes++; saved = JSON.parse(JSON.stringify(this)); },
};
app.addHook('onRequest', async (_request, reply) => { if (store.persistenceError) return reply.status(503).send({ error: 'Storage unavailable' }); });
app.addHook('preHandler', async request => {
  if (request.headers['test-role']) request.authUser = { id: 'actor', name: 'Actual owner', role: request.headers['test-role'], organizationSlug: request.headers['test-company'] || 'noor' };
});
const exports = {};
vm.runInNewContext(ts.transpileModule(await readFile(new URL('../apps/api/src/client-security.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({}), URL });
exports.registerClientSecurity(app, store);
registerFinance(app, store);
app.put('/api/o/:slug/customers/:id', () => ({ success: true }));
app.put('/api/o/:slug/branches/:id', () => ({ success: true }));
app.put('/api/o/:slug/packages/:id', () => ({ success: true }));
let serial = 0;
const send = (path, payload = {}, key = `operation-${++serial}-123456`, role = 'OWNER') => app.inject({ method: 'POST', url: '/api/o/noor/finance' + path, headers: { 'test-role': role, 'idempotency-key': key }, payload });
const tx = (payload, key, role) => send('/transactions', { currency: 'USD', accountId: 'safe', type: 'EXPENSE', amount: 5, ...payload }, key, role);
const ok = response => { assert.equal(response.statusCode, 200, response.body); return response.json(); };
try {
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/finance/transactions', payload: {} })).statusCode, 401);
  for (const body of [{ amount: -1 }, { amount: 0 }, { amount: 1.001 }, { amount: '5' }, { amount: 101 }, { accountId: 'foreign' }, { type: 'UNKNOWN' }, { type: 'TRANSFER', targetAccountId: 'safe' }, { type: 'TRANSFER', targetAccountId: 'foreign' }, { relatedTripId: 'foreign-trip' }]) assert.ok((await tx(body)).statusCode >= 400, JSON.stringify(body));
  assert.equal(store.cashAccounts[1].balance, 100); assert.equal(store.financialTransactions.length, 0);
  const expenseBody = { amount: 7, createdBy: 'Forged author' };
  const expenses = await Promise.all([tx(expenseBody, 'expense-key-123456'), tx(expenseBody, 'expense-key-123456')]);
  const expense = ok(expenses[0]); ok(expenses[1]);
  assert.equal(store.cashAccounts[1].balance, 93); assert.equal(store.financialTransactions.length, 1);
  assert.equal(expense.transaction.createdBy, 'Actual owner'); assert.equal(expense.transaction.balanceBeforeUSD, 100); assert.equal(expense.transaction.balanceAfterUSD, 93);
  assert.equal((await tx({ amount: 8 }, 'expense-key-123456')).statusCode, 409);
  const savedExpenseResponse = JSON.stringify(saved.financialReceipts[0].response);
  ok(await tx({ type: 'INCOME', amount: 20 }));
  assert.equal(JSON.stringify(store.financialReceipts[0].response), savedExpenseResponse, 'Receipt must not drift when account changes');
  const foreignCurrency = ok(await tx({ type: 'INCOME', accountId: 'bank', amount: 100, currency: 'TJS', exchangeRate: 10, amountUSD: 999 }));
  assert.equal(foreignCurrency.transaction.amountUSD, 10, 'API derives USD from recorded exchange rate');
  ok(await tx({ type: 'TRANSFER', amount: 5, targetAccountId: 'bank' }));
  assert.equal(store.cashAccounts[2].balance, 15);
  const request = { sourceBranchId: 'b', amount: 20, requestedBy: 'Forged cashier' };
  const totalAssets = () => store.cashAccounts.filter(a => a.tenantId === 't').reduce((sum, a) => sum + a.balance, 0) + store.cashCollections.filter(c => c.status === 'REQUESTED').reduce((sum, c) => sum + c.amountUSD, 0);
  const assetsBeforeCollection = totalAssets();
  const collection = ok(await send('/collections', request, 'collection-key-123456')).collection;
  ok(await send('/collections', request, 'collection-key-123456'));
  assert.equal(store.branches[0].cashBalance, 30); assert.equal(store.cashAccounts[0].balance, 30); assert.equal(collection.requestedBy, 'Actual owner');
  assert.equal(totalAssets(), assetsBeforeCollection, 'Cash in transit remains part of total assets');
  assert.equal((await send('/collections', { sourceBranchId: 'foreign-b', amount: 1 })).statusCode, 400);
  assert.equal((await send('/collections', { sourceBranchId: 'b', amount: 31 })).statusCode, 409);
  assert.equal((await send(`/collections/${collection.id}/confirm`, {}, undefined, 'ADMIN')).statusCode, 403);
  const beforeSafe = store.cashAccounts[1].balance;
  const confirms = await Promise.all([send(`/collections/${collection.id}/confirm`), send(`/collections/${collection.id}/confirm`)]);
  confirms.forEach(ok); assert.equal(store.cashAccounts[1].balance, beforeSafe + 20);
  assert.equal(totalAssets(), assetsBeforeCollection);
  assert.equal((await send(`/collections/${collection.id}/reject`)).statusCode, 409);
  const rejected = ok(await send('/collections', { sourceBranchId: 'b', amount: 10 })).collection;
  ok(await send(`/collections/${rejected.id}/reject`)); ok(await send(`/collections/${rejected.id}/reject`));
  assert.equal(store.branches[0].cashBalance, 30);
  assert.equal((await send(`/collections/${rejected.id}/confirm`)).statusCode, 409);
  const topUp = ok(await send('/customers/c/balance', { type: 'PAYMENT', amount: 10, accountId: 'cash' }));
  assert.equal(store.customers[0].balance, 0); assert.equal(store.cashAccounts[0].balance, 40);
  const refund = { type: 'CUSTOMER_REFUND', accountId: 'cash', originalTransactionId: topUp.transaction.id, amount: 5 };
  assert.equal((await tx(refund, undefined, 'ADMIN')).statusCode, 403);
  ok(await tx(refund, 'refund-key-123456')); ok(await tx(refund, 'refund-key-123456'));
  assert.equal(store.customers[0].balance, -5); assert.equal(store.branches[0].cashBalance, 35);
  assert.equal((await tx({ ...refund, amount: 6 })).statusCode, 409);
  ok(await tx(refund)); assert.equal(store.customers[0].balance, -10);
  assert.equal((await tx(refund)).statusCode, 409);
  assert.equal((await send('/packages/unpaid/return', { reason: 'Not paid', refundAmountUSD: 2, originalPaymentId: 'pay', accountId: 'cash' })).statusCode, 409);
  const parcelReturn = { reason: 'Defect', refundAmountUSD: 2, originalPaymentId: 'pay', accountId: 'cash' };
  ok(await send('/packages/p/return', parcelReturn, 'return-key-123456')); ok(await send('/packages/p/return', parcelReturn, 'return-key-123456'));
  assert.equal(store.packages[0].status, 'RETURNED'); assert.equal((await send('/packages/p/return', parcelReturn)).statusCode, 409);
  assert.equal((await tx({ type: 'CUSTOMER_REFUND', originalPaymentId: 'pay', amount: 9 })).statusCode, 409);
  ok(await tx({ type: 'CUSTOMER_REFUND', originalPaymentId: 'pay', amount: 8 }));
  assert.equal((await tx({ type: 'CUSTOMER_REFUND', originalPaymentId: 'pay', amount: 1 })).statusCode, 409);
  ok(await send('/packages/unpaid/return', { reason: 'Return before payment', refundAmountUSD: 0 }));
  for (const [route, body] of [['customers/c', { balance: 900 }], ['branches/b', { cashBalance: 900 }], ['packages/p', { refundAmountUSD: 900 }]]) {
    const response = await app.inject({ method: 'PUT', url: '/api/o/noor/' + route, headers: { 'test-role': 'OWNER' }, payload: body }); assert.equal(response.statusCode, 400);
  }
  store.cashAccounts[0].balance = 99;
  assert.equal((await tx({ type: 'EXPENSE', accountId: 'cash', amount: 1 })).statusCode, 409);
  assert.equal((await send('/accounts/cash/reconcile', { observedAmountUSD: 30, reason: 'Counted cash' }, undefined, 'ADMIN')).statusCode, 403);
  ok(await send('/accounts/cash/reconcile', { observedAmountUSD: 30, reason: 'Counted cash' }));
  assert.equal(store.branches[0].cashBalance, 30); assert.equal(store.cashAccounts[0].balance, 30);
  assert.equal(store.auditLogs[0].oldValues.balanceUSD, 99); assert.equal(store.auditLogs[0].userId, 'actor');
  assert.equal((await send('/trip-expenses', { tripId: 'other-trip', amount: 2 })).statusCode, 400);
  ok(await send('/trip-expenses', { tripId: 'trip', amount: 2 }, 'trip-operation-key-123456')); ok(await send('/trip-expenses', { tripId: 'trip', amount: 2 }, 'trip-operation-key-123456')); assert.equal(store.tripExpenses.length, 1);
  store.financialReceipts = JSON.parse(JSON.stringify(saved.financialReceipts));
  assert.equal(ok(await tx(expenseBody, 'expense-key-123456')).replayed, true);
  assert.equal(store.cashAccounts[3].balance, 1000);
  failWrite = true;
  assert.equal((await tx({ type: 'INCOME', amount: 2 }, 'disk-operation-key-123456')).statusCode, 500);
  assert.equal((await tx({ type: 'INCOME', amount: 2 }, 'disk-operation-key-123456')).statusCode, 503);
  console.log('Finance checks passed: validation, concurrent retry, tenant isolation, cash transitions, debt payment, capped refunds, owner reconciliation, durable receipt and disk failure');
} finally { await app.close(); }
