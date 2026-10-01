import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { escapeTelegramHtml, startReferral } from '../apps/api/src/telegram.ts';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const source = await readFile(new URL('../apps/api/src/server.ts', import.meta.url), 'utf8');
const messages = [];
const errors = [];
const tenant = { id: 't', slug: 'noor', name: 'NOOR & <CLUB>' };
const customer = { id: 'c', tenantId: 't', cargoCode: 'NOOR/S2301', fullName: 'Test', phone: '123' };
const store = {
  tenants: [tenant], customers: [customer], tenantSettings: {},
  botConfigs: [{ tenantId: 't', isActive: true, botToken: 'test-token' }],
  branches: [{ id: 'b', tenantId: 't', type: 'PVZ', name: 'Office' }],
  originWarehouses: [],
  packages: [
    { id: 'incomplete', tenantId: 't' },
    { id: 'without-barcode', tenantId: 't', trackingNumber: 'OTHER' },
    { id: 'found', tenantId: 't', customerId: 'c', trackingNumber: 'TRACK123', status: 'IN_TRANSIT' },
  ],
  saveToFile() {},
  nextId: () => `new-${store.customers.length}`,
};
const context = {
  fastify: app, store, APP_DOMAIN: 'example.test', process: { env: {} },
  escapeTelegramHtml, startReferral, URLSearchParams,
  originHubPhone: () => '',
  console: { warn() {}, error: (...args) => errors.push(args) },
  callTelegram: async (_token, method, body) => { messages.push({ method, body }); return {}; },
  fetch: async (_url, options) => { messages.push({ body: JSON.parse(options.body) }); return new Response('{"ok":true}'); },
};
// Register the production handlers without starting the server or touching real data/Telegram.
for (const [start, end] of [
  ['// Telegram Webhook Handler', '// 5. WMS Operations'],
  ["fastify.get<{ Params: { slug: string }; Querystring: { tgUserId?", '// Client MiniApp Auth Lookup'],
  ["fastify.post<{ Params: { slug: string }; Body: any }>('/api/o/:slug/customers'", "fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/customers/:id'"],
]) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(startIndex >= 0 && endIndex > startIndex);
  const snippet = source.slice(startIndex, endIndex);
  vm.runInNewContext(ts.transpileModule(snippet, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
try {
  for (const text of ['/start', '/start ref_NOOR/S2301', 'UNKNOWN123', 'track123']) {
    const response = await app.inject({
      method: 'POST', url: '/api/bot/webhook/noor', headers: { host: 'example.test' },
      payload: { message: { text, chat: { id: 1, type: 'private' }, from: { first_name: 'A & <B>' } } },
    });
    assert.equal(response.statusCode, 200, response.body);
  }
  assert.deepEqual(errors, []);
  assert.ok(messages.some(({ body }) => body.text?.includes('A &amp; &lt;B&gt;')));
  assert.ok(messages.some(({ body }) => body.text?.includes('TRACK123')));
  assert.ok(messages.some(({ body }) => body.reply_markup?.inline_keyboard[0][0].web_app));
  const beforeGroup = messages.length;
  const groupResponse = await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', headers: { host: 'example.test' }, payload: { message: { text: '/start ref_NOOR/S2301', chat: { id: -1, type: 'group' } } } });
  assert.equal(groupResponse.statusCode, 200);
  assert.equal(messages.length, beforeGroup + 1, 'Groups must not configure a private-chat menu');
  assert.equal(messages.at(-1).body.reply_markup.inline_keyboard[0][0].url, 'https://example.test/o/noor/app?ref=NOOR%2FS2301');
  const response = await app.inject('/api/app/noor/me?cargoCode=NOOR%2FS2301');
  assert.equal(response.statusCode, 200, response.body);
  const qr = new URL(response.json().pickupQr);
  assert.equal(qr.protocol, 'cargona:');
  assert.equal(qr.searchParams.get('t'), 'noor');
  assert.equal(qr.searchParams.get('c'), 'NOOR/S2301');
  assert.equal(qr.searchParams.get('b'), 'b');
  assert.ok(!response.json().warehouseAddressFor1688.includes('+86 138'));
  assert.ok(!response.json().warehouseAddressFor1688.includes('Yiwu International'));
  for (const url of ['/api/app/noor/me', '/api/app/noor/me?cargoCode=MISSING']) {
    const guest = await app.inject(url);
    assert.equal(guest.statusCode, 200);
    assert.equal(guest.json().customer, null, 'Do not substitute the first customer or a demo profile');
    assert.equal(guest.json().pickupQr, null);
    assert.deepEqual(guest.json().packages, []);
  }
  assert.equal((await app.inject('/api/app/missing/me')).statusCode, 404);
  customer.bonusBalance = 0;
  for (const bonus of [0, 7]) {
    store.tenantSettings.t = { loyaltySettings: { bonusPerNextReferral: bonus } };
    const created = await app.inject({ method: 'POST', url: '/api/o/noor/customers', payload: { cargoCode: `REF-${bonus}`, fullName: 'Invited', phone: '123', invitedByCustomerId: 'c' } });
    assert.equal(created.statusCode, 200, created.body);
    assert.equal(customer.bonusBalance, bonus, 'Registration bonus must use tenant settings, including zero');
  }
  const beforeIgnoredUpdate = messages.length;
  const ignored = await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', payload: { callback_query: { id: 'test' } } });
  assert.equal(ignored.statusCode, 200);
  assert.equal(messages.length, beforeIgnoredUpdate);
  store.botConfigs = [];
  const missingToken = await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', payload: { message: { text: '/start', chat: { id: 1 } } } });
  assert.equal(missingToken.statusCode, 503);
  console.log('API regression checks passed: /start, incomplete package records, tracking lookup, Mini App QR');
} finally {
  await app.close();
}
