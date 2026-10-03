import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { telegramIdentity, webhookSecret } from '../apps/api/src/telegram-identity.ts';
import { registerCustomerLinks } from '../apps/api/src/customer-links.ts';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const botToken = '123:test';
const signed = id => {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id, first_name: 'Client' }) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  params.set('hash', createHmac('sha256', createHmac('sha256', 'WebAppData').update(botToken).digest()).update(check).digest('hex'));
  return params.toString();
};
let persisted;
const store = {
  tenants: [{ id: 't', slug: 'noor' }, { id: 'other', slug: 'other' }],
  botConfigs: ['t', 'other'].map(tenantId => ({ tenantId, isActive: true, botToken, botUsername: 'NoorcargoBot' })),
  tenantSettings: { t: {} }, customers: [{ id: 'legacy', tenantId: 't', cargoCode: 'NOOR/S2256', fullName: 'Legacy', balanceUSD: 12 }, { id: 'linked', tenantId: 't', telegramUserId: 99 }],
  clientLinks: [], auditLogs: [], branches: [], originWarehouses: [], users: [], packages: [{ id: 'p', tenantId: 't', customerId: 'legacy', weightKg: 4, costUSD: 12 }],
  nextId: (prefix, items) => `${prefix}-${items.length + 1}`,
  saveToFile() { persisted = JSON.parse(JSON.stringify(this)); },
};
app.addHook('preHandler', async request => {
  if (request.headers['test-role']) request.authUser = { id: 'owner', fullName: 'Owner', role: request.headers['test-role'], organizationSlug: 'noor' };
});
const exports = {};
vm.runInNewContext(ts.transpileModule(await readFile(new URL('../apps/api/src/client-security.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: () => ({ telegramIdentity, webhookSecret }), URL });
exports.registerClientSecurity(app, store);
registerCustomerLinks(app, store);
const issue = (role = 'OWNER') => app.inject({ method: 'POST', url: '/api/o/noor/customers/legacy/telegram-link', headers: { 'test-role': role } });
const claim = (token, id = 7, preview = false, slug = 'noor') => app.inject({ method: 'POST', url: `/api/app/${slug}/customer/link${preview ? '/preview' : ''}`, headers: { 'x-telegram-init-data': signed(id) }, payload: { token } });
const extract = response => new URL(response.json().url).searchParams.get('startapp').slice(5);
try {
  assert.equal((await issue('ADMIN')).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/other/customers/legacy/telegram-link', headers: { 'test-role': 'OWNER' } })).statusCode, 403);
  const first = await issue(); assert.equal(first.statusCode, 200, first.body);
  const oldToken = extract(first);
  assert.ok(oldToken.length + 5 <= 64);
  assert.ok(!JSON.stringify(persisted).includes(oldToken), 'Persist only hash');
  const next = await issue(); const token = extract(next);
  assert.equal((await claim(oldToken)).statusCode, 404);
  assert.equal((await claim(token, 7, true, 'other')).statusCode, 404);
  assert.equal((await app.inject({ method: 'POST', url: '/api/app/noor/customer/link', payload: { token } })).statusCode, 401);
  assert.equal((await claim(token, 99)).statusCode, 409);
  const preview = await claim(token, 7, true); assert.equal(preview.statusCode, 200, preview.body);
  assert.equal(preview.json().cargoCode, 'NOOR/S2256'); assert.equal(preview.json().balanceUSD, undefined);
  const before = JSON.stringify(store.packages);
  const result = await claim(token); assert.equal(result.statusCode, 200, result.body);
  assert.equal(store.customers[0].telegramUserId, 7); assert.equal(store.customers[0].balanceUSD, 12);
  assert.equal(store.customers.length, 2); assert.equal(JSON.stringify(store.packages), before);
  assert.equal(persisted.customers[0].telegramUserId, 7); assert.ok(persisted.clientLinks[0].usedAt);
  assert.equal(store.auditLogs[0].userId, '7'); assert.equal(store.auditLogs[0].action, 'TELEGRAM_LINKED');
  assert.equal((await claim(token, 8)).statusCode, 409);
  assert.equal((await issue()).statusCode, 409);
  store.customers[0].telegramUserId = undefined;
  const expiredToken = extract(await issue()); store.clientLinks[0].expiresAt = new Date(0).toISOString();
  assert.equal((await claim(expiredToken)).statusCode, 410);
  const blockedToken = extract(await issue()); store.customers[0].isBlocked = true;
  assert.equal((await claim(blockedToken)).statusCode, 409);
  console.log('Customer links: owner scope, signed identity, expiry, replay, privacy and preserved data passed');
} finally { await app.close(); }
