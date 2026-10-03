import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import http from 'node:http';
import ts from 'typescript';
import { registerStorageLifecycle } from '../apps/api/src/storage-lifecycle.ts';
import { migrationConnection, transferState, openPostgresState, readMigratedState, inspectState } from '../packages/db/dist/index.mjs';

const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const helpers = {};
vm.runInNewContext(compile('apps/api/src/package-history.ts'), { exports: helpers });
let persisted = { tenants: [], customers: [], packages: [], users: [], future: { preserved: true } };
let failWrite = false;
let finishWrite;
let writes = 0;
let opened = 0;
const database = {
  document: structuredClone(persisted),
  async save(document) {
    writes++;
    await new Promise(resolve => { finishWrite = resolve; });
    if (failWrite) throw new Error('private connection error');
    persisted = structuredClone(document);
  },
  async check() {}, async close() {},
};
const exports = {};
const forbiddenFs = new Proxy({}, { get(_target, key) {
  if (key === '__esModule') return false;
  return () => { throw new Error('PostgreSQL mode must not touch JSON files'); };
} });
const storeContext = {
  exports, require: name => name === 'node:fs' ? forbiddenFs : name === 'node:path' ? path :
    name === './package-history.js' ? helpers : name === './credentials.js' ? { protectCredentials() {} } :
    name === './persistence.js' ? { writeState() { throw new Error('Unexpected JSON write'); } } :
    name === '@cargona/db' ? { async openPostgresState() { opened++; return database; } } : {},
  process: { env: { DATA_DIR: '/unused', STORAGE_BACKEND: 'postgres', DATABASE_URL: 'fixture' } },
  console, crypto: { randomUUID },
};
vm.runInNewContext(compile('apps/api/src/store.ts'), storeContext);
const store = exports.store;
assert.equal(store.tenants.length, 0);
await store.initialize();
await store.initialize();
assert.equal(opened, 1);
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
registerStorageLifecycle(app, store);
let handlers = 0;
app.post('/write', async () => {
  handlers++;
  store.customers.push({ id: `customer-${handlers}` });
  // Deliberately emulate a legacy unawaited call: the response barrier must protect it.
  store.saveToFile();
  return { success: true };
});
app.get('/read', async () => ({ count: store.customers.length }));
app.get('/error', async () => { throw new Error('handler error'); });
const waitFor = async condition => {
  for (let i = 0; i < 100 && !condition(); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.ok(condition(), 'Timed out waiting for asynchronous test state');
};
let firstDone = false;
const first = app.inject({ method: 'POST', url: '/write' }).then(result => { firstDone = true; return result; });
await waitFor(() => writes === 1);
const second = app.inject({ method: 'POST', url: '/write' });
const reader = app.inject('/read');
await new Promise(resolve => setTimeout(resolve, 25));
assert.equal(handlers, 1);
assert.equal(firstDone, false);
finishWrite();
assert.equal((await first).statusCode, 200);
await waitFor(() => writes === 2);
assert.equal(persisted.customers.length, 1);
finishWrite();
assert.equal((await second).statusCode, 200);
assert.equal((await reader).json().count, 2);
assert.equal(persisted.future.preserved, true);
assert.equal((await app.inject('/error')).statusCode, 500);
assert.equal((await app.inject('/read')).statusCode, 200, 'Errors must release the request lock');
const address = await app.listen({ port: 0, host: '127.0.0.1' });
const aborted = http.request(`${address}/write`, { method: 'POST' });
aborted.on('error', () => {});
aborted.end();
await waitFor(() => writes === 3);
aborted.destroy();
finishWrite();
const afterAbort = await Promise.race([app.inject('/read'), new Promise((_, reject) => setTimeout(() => reject(new Error('Aborted request retained the writer lock')), 2000))]);
assert.equal(afterAbort.statusCode, 200);
failWrite = true;
const failed = app.inject({ method: 'POST', url: '/write' });
await waitFor(() => writes === 4);
finishWrite();
assert.equal((await failed).statusCode, 503);
assert.equal(store.persistenceError, true);
assert.equal(persisted.customers.length, 3);
assert.equal((await app.inject('/read')).statusCode, 503);
assert.equal((await app.inject({ method: 'POST', url: '/write' })).statusCode, 503);
assert.equal(handlers, 4);
await app.close();
database.document = { ...database.document, storageFormat: 'cargona-state-v2' };
const futureExports = {};
vm.runInNewContext(compile('apps/api/src/store.ts'), { ...storeContext, exports: futureExports });
await assert.rejects(futureExports.store.initialize(), /Unsupported state format/);
console.log('PostgreSQL lifecycle: no JSON access, initialization, commit barrier, serialized requests, error unlock and fail-closed checks passed');

// Exercise the real adapter with a SQL double, including commit failure and lease loss.
const adapterExports = {};
let row = { document: { tenants: [], customers: [], packages: [], users: [] }, revision: '1' };
row.source_sha256 = inspectState(row.document).sha256;
let lease = true;
let commitFailure = false;
let options;
let hang = false;
let endCalls = 0;
function query(strings, ...values) {
  if (hang) return new Promise(() => {});
  const command = strings.join('?');
  if (command.includes('advisory')) return Promise.resolve([{ acquired: lease }]);
  if (command.includes('UPDATE')) {
    if (row.revision !== values[2]) return Promise.resolve([]);
    row = { document: structuredClone(values[0]), source_sha256: values[1], revision: String(BigInt(row.revision) + 1n) };
    return Promise.resolve([{ revision: row.revision }]);
  }
  return Promise.resolve([structuredClone(row)]);
}
query.json = value => value;
query.end = async () => { endCalls++; };
query.begin = async action => {
  const before = structuredClone(row);
  try { await action(query); if (commitFailure) throw new Error('Commit failed'); }
  catch (error) { row = before; throw error; }
};
vm.runInNewContext(compile('packages/db/src/postgres-state.ts'), {
  exports: adapterExports, require: name => name === 'postgres' ? (_url, opts) => { options = opts; return query; } : { inspectState },
  setTimeout: callback => setTimeout(callback, 20), clearTimeout,
});
const adapter = await adapterExports.openPostgresState('fixture');
assert.equal(options.max, 1);
assert.equal(options.max_lifetime, 0);
const changed = { ...adapter.document, customers: [{ id: 'new' }] };
commitFailure = true;
await assert.rejects(adapter.save(changed), /Commit failed/);
assert.equal(row.revision, '1');
commitFailure = false;
await adapter.save(changed);
await adapter.check();
assert.equal(row.revision, '2');
assert.equal(row.source_sha256, inspectState(changed).sha256);
lease = false;
await assert.rejects(adapter.save(changed), /lease lost/);
lease = true;
row.revision = '3';
await assert.rejects(adapter.save(changed), /revision changed/);
await assert.rejects(adapter.check(), /unavailable or changed/);
options.onclose();
await assert.rejects(adapter.save(changed), /connection lost/);
await adapter.close();
lease = false;
await assert.rejects(adapterExports.openPostgresState('fixture'), /Cannot open/);
lease = true;
row.source_sha256 = 'invalid';
await assert.rejects(adapterExports.openPostgresState('fixture'), /Cannot open/);
row.source_sha256 = inspectState(row.document).sha256;
const timeoutAdapter = await adapterExports.openPostgresState('fixture');
hang = true;
const endsBeforeTimeout = endCalls;
await assert.rejects(timeoutAdapter.check(), /timed out/);
assert.ok(endCalls > endsBeforeTimeout);
await assert.rejects(timeoutAdapter.save(changed), /connection lost/);
await timeoutAdapter.close();
console.log('PostgreSQL adapter: commit failure, revision guard, lease, connection loss, timeout and checksum checks passed');

if (process.env.MIGRATION_TEST_DATABASE_URL) {
  const sql = migrationConnection(process.env.MIGRATION_TEST_DATABASE_URL);
  let created = false;
  let writer;
  try {
    const [existing] = await sql`SELECT to_regclass('cargona_legacy_state') AS name`;
    assert.equal(existing.name, null, 'Use an empty disposable PostgreSQL database');
    await transferState(sql, { tenants: [], customers: [], packages: [], users: [], future: { preserved: true } }, true);
    created = true;
    writer = await openPostgresState(process.env.MIGRATION_TEST_DATABASE_URL);
    await assert.rejects(openPostgresState(process.env.MIGRATION_TEST_DATABASE_URL), /Cannot open/);
    const document = writer.document;
    document.customers.push({ id: 'durable' });
    await writer.save(document);
    await writer.check();
    assert.equal((await readMigratedState(sql)).customers[0].id, 'durable');
    await writer.close();
    writer = await openPostgresState(process.env.MIGRATION_TEST_DATABASE_URL);
    assert.equal(writer.document.customers[0].id, 'durable');
    await sql`UPDATE cargona_legacy_state SET revision = revision + 1 WHERE id = 1`;
    await assert.rejects(writer.save(document), /revision changed/);
    console.log('Live PostgreSQL: durable write, reopen, single writer and stale revision checks passed');
  } finally {
    await writer?.close();
    if (created) await sql`DROP TABLE cargona_legacy_state`;
    await sql.end({ timeout: 5 });
  }
}
