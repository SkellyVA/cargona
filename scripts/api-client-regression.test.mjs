import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { escapeTelegramHtml, startReferral } from '../apps/api/src/telegram.ts';
import { parseTrackList } from '../apps/web/src/utils/trackList.mjs';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const source = await readFile(new URL('../apps/api/src/server.ts', import.meta.url), 'utf8');
const messages = [];
const errors = [];
let telegramFailure = false;
const tenant = { id: 't', slug: 'noor', name: 'NOOR & <CLUB>' };
const customer = { id: 'c', tenantId: 't', cargoCode: 'NOOR/S2301', fullName: 'Test', phone: '123' };
const store = {
  tenants: [tenant], customers: [customer], tenantSettings: {},
  botConfigs: [{ tenantId: 't', isActive: true, botToken: 'test-token' }],
  branches: [{ id: 'b', tenantId: 't', type: 'PVZ', name: 'Office' }],
  originWarehouses: [],
  auditLogs: [],
  packages: [
    { id: 'incomplete', tenantId: 't' },
    { id: 'without-barcode', tenantId: 't', trackingNumber: 'OTHER' },
    { id: 'found', tenantId: 't', customerId: 'c', trackingNumber: 'TRACK123', status: 'IN_TRANSIT' },
  ],
  saveToFile() {},
  nextId: (prefix, items) => `${prefix}-${items.length}`,
};
const context = {
  fastify: app, store, APP_DOMAIN: 'example.test', process: { env: {} },
  escapeTelegramHtml, startReferral, URLSearchParams,
  originHubPhone: () => '',
  console: { warn() {}, error: (...args) => errors.push(args) },
  callTelegram: async (_token, method, body) => { messages.push({ method, body }); return {}; },
  fetch: async (_url, options) => { messages.push({ url: _url, body: options.body instanceof FormData ? Object.fromEntries(options.body) : JSON.parse(options.body) }); return new Response(JSON.stringify(telegramFailure ? { ok: false, description: 'Forbidden: bot is not an administrator' } : { ok: true, result: { message_id: 123 } })); },
  Response, FormData, Blob, Buffer, AbortSignal,
};
// Register the production handlers without starting the server or touching real data/Telegram.
for (const [start, end] of [
  ['// Submit Package Review & Post to Reviews Channel', '// Telegram Webhook Handler'],
  ['// Bulk Package Intake', "fastify.put<{ Params: { slug: string; id: string }; Body: any }>('/api/o/:slug/packages/:id'"],
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
  store.botConfigs[0].reviewsChannelId = '@reviews';
  for (const photos of [[], ['https://example.test/photo.jpg'], ['data:image/jpeg;base64,aGVsbG8=']]) {
    const review = await app.inject({ method: 'POST', url: '/api/o/noor/packages/found/review', payload: { rating: 5, comment: 'Great <&>', customerName: 'A <B>', photos } });
    assert.equal(review.statusCode, 200, review.body);
    assert.equal(review.json().published, true);
    const sent = messages.at(-1).body;
    assert.equal(sent.chat_id, '@reviews');
    assert.ok((sent.text || sent.caption).includes('Great &lt;&amp;&gt;'));
  }
  telegramFailure = true;
  const failedReview = await app.inject({ method: 'POST', url: '/api/o/noor/packages/found/review', payload: { rating: 4, comment: 'Saved despite channel failure' } });
  assert.equal(failedReview.json().success, true);
  assert.equal(failedReview.json().published, false);
  assert.match(failedReview.json().publicationError, /administrator/);
  assert.equal(store.packages.find(p => p.id === 'found').reviewRating, 4);
  telegramFailure = false;
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/packages/missing/review', payload: { rating: 5 } })).statusCode, 404);
  assert.deepEqual(parseTrackList(' NEW1\r\n\n NEW2 \nnew1'), ['NEW1', 'NEW2', 'new1']);
  const existing = JSON.stringify(store.packages.find(p => p.id === 'found'));
  const bulkPayload = { trackingNumbers: ['NEW1', 'NEW2', 'new1', 'track123'], skipExisting: true, status: 'PRE_REGISTERED', customerCargoCode: 'NOOR/S2301' };
  const bulk = await app.inject({ method: 'POST', url: '/api/o/noor/packages/bulk', payload: bulkPayload });
  assert.equal(bulk.statusCode, 200, bulk.body);
  assert.equal(bulk.json().createdCount, 2);
  assert.equal(bulk.json().skippedCount, 2);
  assert.equal(JSON.stringify(store.packages.find(p => p.id === 'found')), existing);
  assert.equal(new Set(bulk.json().packages.map(p => p.id)).size, 2);
  const repeat = await app.inject({ method: 'POST', url: '/api/o/noor/packages/bulk', payload: bulkPayload });
  assert.equal(repeat.json().createdCount, 0);
  assert.equal(repeat.json().skippedCount, 4);
  const count = store.packages.length;
  for (const trackingNumbers of [['GOOD', 123], ['GOOD', 'bad track'], Array(501).fill('TRACK'), []]) {
    const invalid = await app.inject({ method: 'POST', url: '/api/o/noor/packages/bulk', payload: { trackingNumbers } });
    assert.equal(invalid.statusCode, 400);
    assert.equal(store.packages.length, count);
  }
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
  assert.ok(messages.some(({ body }) => body.reply_markup?.inline_keyboard?.[0][0].web_app));
  assert.ok(messages.some(({ body }) => body.reply_markup?.remove_keyboard === true));
  const beforeGroup = messages.length;
  for (const type of ['group', 'supergroup', 'channel']) {
    for (const text of ['/start ref_NOOR/S2301', 'TRACK123']) {
      const groupResponse = await app.inject({ method: 'POST', url: '/api/bot/webhook/noor', headers: { host: 'example.test' }, payload: { message: { text, chat: { id: -1, type } } } });
      assert.equal(groupResponse.statusCode, 200);
      assert.equal(messages.length, beforeGroup, 'Non-private chats must not trigger any Telegram messages or menu changes');
    }
  }
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
