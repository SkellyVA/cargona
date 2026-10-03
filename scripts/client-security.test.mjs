import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { telegramIdentity, webhookSecret } from '../apps/api/src/telegram-identity.ts';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const token = '123:test-token';
function signed(id, age = 0) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000) - age), user: JSON.stringify({ id, first_name: 'Test', username: 'tester' }) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}
const store = {
  tenants: [{ id: 't', slug: 'noor', name: 'NOOR', ownerPassword: 'secret' }],
  botConfigs: [{ tenantId: 't', isActive: true, botToken: token }],
  tenantSettings: { t: { botToken: token, ownerPassword: 'secret', autoDeliveryRatePerKgUSD: 3 } },
  customers: [{ id: 'c1', tenantId: 't', telegramUserId: 1, cargoCode: 'NOOR/S1', fullName: 'First', preferredBranchId: 'b1' }, { id: 'c2', tenantId: 't', telegramUserId: 2, cargoCode: 'NOOR/S2', invitedByCustomerId: 'c1' }],
  packages: [{ id: 'p1', tenantId: 't', customerId: 'c1', currentBranchId: 'b1', status: 'READY_FOR_PICKUP' }, { id: 'p2', tenantId: 't', customerId: 'c2', currentBranchId: 'b2', status: 'RELEASED' }],
  branches: [{ id: 'b1', tenantId: 't', name: 'One' }, { id: 'b2', tenantId: 't', name: 'Two' }],
  users: [{ id: 'u', tenantId: 't', assignedBranchId: 'b1' }], originWarehouses: [], trips: [],
};
app.addHook('preHandler', async request => {
  if (request.headers['test-staff']) request.authUser = { id: 'u', role: 'OPERATOR', organizationSlug: 'noor' };
});
const exports = {};
const source = await readFile(new URL('../apps/api/src/client-security.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: () => ({ telegramIdentity, webhookSecret }), URL });
exports.registerClientSecurity(app, store);
app.get('/api/app/:slug/me', request => request.query);
app.get('/api/app/:slug/auth/lookup', () => ({ success: true }));
app.get('/api/o/:slug/all', () => ({ customers: store.customers, packages: store.packages, settings: { botToken: token } }));
app.post('/api/o/:slug/customers', request => request.body);
app.post('/api/o/:slug/packages/bulk', request => request.body);
app.post('/api/o/:slug/packages/:id/review', request => request.body);
app.put('/api/o/:slug/packages/:id', request => request.body);
app.post('/api/bot/webhook/:slug', () => ({ ok: true }));
app.post('/api/wms/handover', request => { store.packages[0].status = 'RELEASED'; return request.body; });
try {
  assert.equal(telegramIdentity(signed(1, 86401), token), null);
  assert.equal(telegramIdentity(signed(1).replace('tester', 'attacker'), token), null);
  assert.equal(telegramIdentity(signed(1) + '&auth_date=1', token), null);
  const guest = await app.inject('/api/app/noor/bootstrap');
  assert.equal(guest.statusCode, 200);
  assert.deepEqual(guest.json().customers, []);
  assert.ok(!guest.body.includes('secret') && !guest.body.includes(token));
  const mine = await app.inject({ url: '/api/app/noor/bootstrap', headers: { 'x-telegram-init-data': signed(1) } });
  assert.deepEqual(mine.json().packages.map(p => p.id), ['p1']);
  assert.deepEqual(mine.json().referralStats, { cargoCode: 'NOOR/S1', total: 1, active: 1 });
  assert.ok(!mine.body.includes('NOOR/S2'), 'Referral statistics must not disclose invited customer records');
  const spoof = await app.inject('/api/app/noor/me?tgUserId=2&cargoCode=NOOR/S2');
  assert.ok(!spoof.body.includes('NOOR/S2'));
  assert.equal((await app.inject('/api/o/noor/all')).statusCode, 401);
  const registration = await app.inject({ method: 'POST', url: '/api/o/noor/customers', headers: { 'x-telegram-init-data': signed(3) }, payload: { cargoCode: 'LOW1', telegramUserId: 2, fullName: 'New', balanceUSD: 500 } });
  assert.equal(registration.statusCode, 200, registration.body);
  assert.equal(registration.json().telegramUserId, 3);
  assert.equal(registration.json().cargoCode, undefined);
  assert.equal(registration.json().balanceUSD, undefined);
  assert.equal((await app.inject({ url: '/api/app/noor/auth/lookup?code=NOOR/S2', headers: { 'x-telegram-init-data': signed(1) } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/packages/p2/review', headers: { 'x-telegram-init-data': signed(1) }, payload: { rating: 5 } })).statusCode, 403);
  const bulk = await app.inject({ method: 'POST', url: '/api/o/noor/packages/bulk', headers: { 'x-telegram-init-data': signed(1) }, payload: { trackingNumbers: ['T'], customerCargoCode: 'NOOR/S2', status: 'RELEASED', weightKg: 10 } });
  assert.equal(bulk.json().customerCargoCode, 'NOOR/S1');
  assert.equal(bulk.json().status, 'PRE_REGISTERED');
  assert.equal(bulk.json().weightKg, 0);
  assert.equal(bulk.json().skipExisting, true);
  const staff = await app.inject({ url: '/api/o/noor/all', headers: { 'test-staff': 'yes' } });
  assert.deepEqual(staff.json().packages.map(p => p.id), ['p1']);
  assert.deepEqual(staff.json().settings, {});
  assert.equal((await app.inject({ method: 'PUT', url: '/api/o/noor/packages/p2', headers: { 'test-staff': 'yes' }, payload: { weightKg: 2 } })).statusCode, 403);
  const handover = { customerId: 'c1', packageIds: ['p1'], amountPaid: 10, paymentMethod: 'CASH', branchId: 'b2' };
  const issued = await app.inject({ method: 'POST', url: '/api/wms/handover', headers: { 'test-staff': 'yes' }, payload: handover });
  assert.equal(issued.statusCode, 200, issued.body);
  assert.equal(issued.json().branchId, 'b1', 'Cashier cannot choose a different branch');
  assert.equal((await app.inject({ method: 'POST', url: '/api/wms/handover', headers: { 'test-staff': 'yes' }, payload: handover })).statusCode, 409);
  store.customers[0].isBlocked = true;
  assert.equal((await app.inject({ url: '/api/app/noor/me', headers: { 'x-telegram-init-data': signed(1) } })).statusCode, 403);
  store.customers[0].isBlocked = false;
  assert.equal((await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', payload: {} })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', headers: { 'x-telegram-bot-api-secret-token': webhookSecret(token) }, payload: {} })).statusCode, 200);
  console.log('Client checks passed: signature, expiry, tenant/client isolation, registration, branch scope and webhook');
} finally { await app.close(); }
