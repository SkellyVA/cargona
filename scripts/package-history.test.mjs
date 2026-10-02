import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

const helperSource = await readFile(new URL('../apps/api/src/package-history.ts', import.meta.url), 'utf8');
const helpers = { exports: {} };
vm.runInNewContext(ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helpers.exports });
const storeSource = await readFile(new URL('../apps/api/src/store.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(storeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const original = { id: 'old', tenantId: 't', trackingNumber: 'OLD', status: 'IN_TRANSIT', weightKg: 1, createdAt: '2025-01-01T00:00:00Z' };
let saved = JSON.stringify({ packages: [original] });
const fakeFs = { existsSync: () => true, readFileSync: () => saved, mkdirSync() {}, writeFileSync: (_file, contents) => { saved = contents; } };
function loadStore() {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => name === 'node:fs' ? fakeFs : name === 'node:path' ? path : name === './package-history.js' ? helpers.exports : {},
    process: { env: { DATA_DIR: '/isolated-test' } }, console: { log() {}, error: error => { throw error; } }, crypto: { randomUUID },
  });
  return exports.store;
}
let store = loadStore();
store.saveToFile();
assert.equal(store.packageHistory.length, 0, 'Loading old packages must not invent events');
store.packages.push({ id: 'new', tenantId: 't', trackingNumber: 'NEW', status: 'RECEIVED_AT_ORIGIN' });
store.saveToFile();
assert.equal(store.packageHistory.length, 1);
assert.equal(store.packageHistory[0].action, 'CREATE');
store.packages[1].status = 'IN_TRANSIT';
store.packages[1].tripId = 'trip-1';
store.saveToFile();
assert.equal(store.packageHistory.length, 2);
assert.deepEqual(JSON.parse(JSON.stringify(store.packageHistory[1].changes.map(c => c.field))), ['status', 'tripId', 'shippedAt']);
assert.ok(store.packages[1].shippedAt);
store.saveToFile();
assert.equal(store.packageHistory.length, 2, 'Unchanged save must not duplicate history');
store = loadStore();
assert.equal(store.packageHistory.length, 2, 'History must survive restart');
store.packages[1].status = 'RELEASED';
store.packages[1].releasedAt = '2026-10-02T10:00:00Z';
store.saveToFile();
assert.equal(store.packageHistory.length, 3);
assert.equal(store.packageHistory[2].snapshot.releasedAt, '2026-10-02T10:00:00Z');
console.log('Package history checks passed: creation, movement, no duplicate events, persistence, issuance');
