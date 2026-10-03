import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { registerHandover } from '../apps/api/src/handover.ts';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
let saved;
let writes = 0;
let failWrite = false;
const store = {
  tenants: [{ id: 't', slug: 'noor' }], users: [{ id: 'cashier', tenantId: 't', assignedBranchId: 'b' }],
  branches: [{ id: 'b', tenantId: 't', cashBalance: 5 }, { id: 'foreign', tenantId: 'other' }],
  customers: [{ id: 'c', tenantId: 't', cargoCode: 'NOOR/S2256' }],
  packages: [{ id: 'foreign-p', trackingNumber: 'TRACK', tenantId: 'other', status: 'READY_FOR_PICKUP', cost: 900 },
    { id: 'p', trackingNumber: 'TRACK', tenantId: 't', customerId: 'c', currentBranchId: 'b', status: 'READY_FOR_PICKUP', weightKg: 2, cost: 10 },
    { id: 'paid', trackingNumber: 'PAID', tenantId: 't', customerId: 'c', currentBranchId: 'b', status: 'READY_FOR_PICKUP', weightKg: 1, cost: 6, isPaidOnline: true },
    { id: 'pending', tenantId: 't', customerId: 'c', currentBranchId: 'b', status: 'READY_FOR_PICKUP', weightKg: 0, cost: 0, weightPending: true }],
  payments: [], auditLogs: [], handoverReceipts: [], nextId: (prefix, items) => `${prefix}-${items.length + 1}`,
  saveToFile() { if (failWrite) { this.persistenceError = true; throw new Error('disk full'); } writes++; saved = JSON.parse(JSON.stringify(this)); },
};
app.addHook('onRequest', async (_request, reply) => { if (store.persistenceError) return reply.status(503).send({ error: 'Storage unavailable' }); });
app.addHook('preHandler', async request => { if (request.headers['test-user']) request.authUser = { id: request.headers['test-user'], name: 'Real cashier', role: 'CASHIER', organizationSlug: 'noor' }; });
const exports = {};
vm.runInNewContext(ts.transpileModule(await readFile(new URL('../apps/api/src/client-security.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: () => ({}), URL });
exports.registerClientSecurity(app, store);
registerHandover(app, store);
const payload = { customerId: 'c', branchId: 'foreign', tenantSlug: 'spoof', packageIds: ['TRACK', 'paid'], amountPaid: 10, paymentMethod: 'CASH' };
const send = (body = payload, key = 'operation-key-123456', actor = 'cashier') => app.inject({ method: 'POST', url: '/api/wms/handover', headers: { 'test-user': actor, 'idempotency-key': key }, payload: body });
try {
  assert.equal((await app.inject({ method: 'POST', url: '/api/wms/handover', payload })).statusCode, 401);
  assert.equal((await send({ ...payload, amountPaid: 1 })).statusCode, 409);
  assert.equal((await send({ ...payload, packageIds: ['p', 'TRACK'], amountPaid: 20 })).statusCode, 400, 'ID and tracking aliases must not charge twice');
  assert.equal((await send({ ...payload, packageIds: ['pending'], amountPaid: 0 })).statusCode, 409);
  assert.equal((await send(payload, 'short')).statusCode, 400);
  assert.equal(writes, 0); assert.equal(store.payments.length, 0); assert.equal(store.branches[0].cashBalance, 5);
  const responses = await Promise.all([send(), send()]);
  for (const response of responses) assert.equal(response.statusCode, 200, response.body);
  assert.equal(responses[0].json().paymentId, responses[1].json().paymentId);
  assert.equal(responses.filter(r => r.json().replayed).length, 1);
  assert.equal(writes, 1); assert.equal(store.payments.length, 1); assert.equal(store.branches[0].cashBalance, 15);
  assert.equal(store.payments[0].currency, 'USD'); assert.equal(store.payments[0].cashierUserId, 'cashier');
  assert.equal(store.auditLogs[0].userName, 'Real cashier'); assert.equal(store.packages[0].status, 'READY_FOR_PICKUP');
  assert.equal(saved.packages[1].status, 'RELEASED'); assert.equal(saved.packages[2].status, 'RELEASED');
  store.handoverReceipts = saved.handoverReceipts;
  assert.equal((await send()).json().replayed, true, 'Saved receipt protects retries after restart');
  assert.equal((await send({ ...payload, amountPaid: 11 })).statusCode, 409);
  assert.equal((await send(payload, 'different-operation-123')).statusCode, 409);
  assert.equal(store.payments.length, 1); assert.equal(writes, 1);
  store.packages[3].weightPending = false; store.packages[3].weightKg = 1; store.packages[3].cost = 2;
  const transfer = await send({ ...payload, packageIds: ['pending'], amountPaid: 2, paymentMethod: 'TRANSFER', handoverPhoto: 'photo' }, 'transfer-operation-123');
  assert.equal(transfer.statusCode, 200, transfer.body);
  assert.equal(store.payments[1].method, 'BANK_TRANSFER'); assert.equal(store.branches[0].cashBalance, 15);
  assert.equal(store.packages[3].handoverPhoto, 'photo');
  store.packages.push({ id: 'disk-test', tenantId: 't', customerId: 'c', currentBranchId: 'b', status: 'READY_FOR_PICKUP', weightKg: 1, cost: 3 });
  failWrite = true;
  const diskBody = { ...payload, packageIds: ['disk-test'], amountPaid: 3 };
  assert.equal((await send(diskBody, 'disk-operation-123')).statusCode, 500, 'Failed persistence must not report success');
  assert.equal((await send(diskBody, 'disk-operation-123')).statusCode, 503, 'An in-memory receipt must not masquerade as a saved success');
  assert.equal(saved.payments.length, 2);
  console.log('Handover checks passed: concurrent retry, durable receipt, changed payload, aliases, tenant scope, server amount, weighing, online payment, cash and audit');
} finally { await app.close(); }
