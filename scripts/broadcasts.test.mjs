import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const source = await readFile(new URL('../apps/api/src/broadcasts.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => name === 'node:crypto' ? { randomUUID } : {}, setTimeout, Date, console });
const store = { tenants: [{ id: 't', slug: 'noor' }, { id: 'other', slug: 'other' }], branches: [{ id: 'b', tenantId: 't' }], customers: [
  { tenantId: 't', telegramUserId: 1, preferredBranchId: 'b' }, { tenantId: 't', telegramUserId: 1, preferredBranchId: 'b' },
  { tenantId: 't', telegramUserId: 2 }, { tenantId: 't', telegramUserId: -100 }, { tenantId: 't' },
  { tenantId: 'other', telegramUserId: 3 }, { tenantId: 't', telegramUserId: 4, isBlocked: true },
], botConfigs: [{ tenantId: 't', botToken: 'test', isActive: true }], auditLogs: [], saveToFile() {} };
const sent = [];
exports.registerBroadcasts(app, store, async (_token, method, body) => { assert.equal(method, 'sendMessage'); sent.push(body); if (body.chat_id === 2) throw new Error('Forbidden'); }, async () => {});
try {
  const preview = await app.inject('/api/o/noor/broadcasts/preview');
  assert.equal(preview.json().recipientCount, 2);
  assert.equal((await app.inject('/api/o/noor/broadcasts/preview?branchId=b')).json().recipientCount, 1);
  const branch = await app.inject({ method: 'POST', url: '/api/o/noor/broadcasts', payload: { text: 'Branch message', branchId: 'b' } });
  assert.equal(branch.statusCode, 202, branch.body);
  for (let i = 0; i < 10 && store.botBroadcasts[0].status === 'RUNNING'; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.botBroadcasts[0].sent, 1);
  assert.equal(sent[0].chat_id, 1);
  const all = await app.inject({ method: 'POST', url: '/api/o/noor/broadcasts', payload: { text: 'All clients' } });
  assert.equal(all.statusCode, 202, all.body);
  for (let i = 0; i < 10 && store.botBroadcasts[1].status === 'RUNNING'; i++) await new Promise(resolve => setImmediate(resolve));
  const result = await app.inject('/api/o/noor/broadcasts/' + all.json().id);
  assert.equal(result.json().sent, 1);
  assert.equal(result.json().failed, 1);
  assert.ok(sent.every(m => m.chat_id === 1 || m.chat_id === 2));
  assert.equal((await app.inject('/api/o/other/broadcasts/' + all.json().id)).statusCode, 404);
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/broadcasts', payload: { text: '' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/broadcasts', payload: { text: 'Test', branchId: 'missing' } })).statusCode, 400);
  console.log('Broadcast checks passed: all/branch audience, deduplication, private chats, tenant scope, send failures');
} finally { await app.close(); }
