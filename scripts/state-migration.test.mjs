import assert from 'node:assert/strict';
import { inspectState, transferState, readMigratedState, migrationConnection } from '../packages/db/dist/index.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const state = {
  tenants: [{ id: 'tenant', slug: 'noor' }], users: [],
  customers: [{ id: '2256', balance: -17.25 }],
  packages: [{ id: 'pkg', weightKg: 0, weightPending: true, cost: 0 }],
  financialReceipts: [{ key: 'retry', response: { success: true } }],
  packageHistory: [{ id: 'event', createdAt: '2026-10-04T00:00:00Z' }],
  botConfigs: [{ id: 'bot', botToken: 'private-fixture' }],
  futureField: { nested: ['preserved', 1, null] },
};
const original = JSON.stringify(state);
assert.equal(inspectState(state).sha256, inspectState(Object.fromEntries(Object.entries(state).reverse())).sha256);
assert.throws(() => inspectState({ ...state, customers: [{ id: 'same' }, { id: 'same' }] }), /duplicate/);
assert.throws(() => inspectState({}), /Missing/);
assert.throws(() => inspectState({ ...state, packages: [null] }), /Invalid/);

// Transaction double checks rollback/error paths; live PostgreSQL is a separate opt-in check.
let stored;
let corrupt = false;
let commits = 0;
function sql(strings, ...values) {
  const query = strings.join('?');
  if (query.includes('SELECT id FROM')) return Promise.resolve(stored ? [{ id: 1 }] : []);
  if (query.includes('INSERT INTO')) { stored = { document: structuredClone(values[0]), source_sha256: values[1] }; return Promise.resolve([]); }
  if (query.includes('SELECT document')) return Promise.resolve(stored ? [{ ...stored, document: corrupt ? { ...stored.document, customers: [] } : stored.document }] : []);
  return Promise.resolve([]);
}
sql.json = value => value;
sql.begin = async action => {
  const before = structuredClone(stored);
  try { await action(sql); commits++; } catch (error) { stored = before; throw error; }
};
assert.equal((await transferState(sql, state)).mode, 'trial-rolled-back');
assert.equal(stored, undefined);
assert.equal(commits, 0);
corrupt = true;
await assert.rejects(transferState(sql, state, true), /verification failed/);
assert.equal(stored, undefined);
corrupt = false;
assert.equal((await transferState(sql, state, true)).mode, 'committed');
assert.deepEqual(await readMigratedState(sql), state);
assert.equal(commits, 1);
await assert.rejects(transferState(sql, state, true), /refusing to overwrite/);
assert.deepEqual(await readMigratedState(sql), state);
corrupt = true;
await assert.rejects(readMigratedState(sql), /checksum mismatch/);
assert.equal(JSON.stringify(state), original);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-migration-'));
try {
  const filename = path.join(directory, 'state.json');
  fs.writeFileSync(filename, original);
  const result = spawnSync(process.execPath, ['apps/api/dist/state-migration.mjs', 'inspect', filename], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), inspectState(state));
  assert.ok(!result.stdout.includes('private-fixture'));
  const invalid = spawnSync(process.execPath, ['apps/api/dist/state-migration.mjs', 'import', filename], { encoding: 'utf8', windowsHide: true });
  assert.equal(invalid.status, 1);
  assert.equal(fs.readFileSync(filename, 'utf8'), original);
} finally {
  fs.rmSync(directory, { recursive: true });
}
if (process.env.MIGRATION_TEST_DATABASE_URL) {
  // Explicit opt-in: use an empty disposable database, never production.
  const live = migrationConnection(process.env.MIGRATION_TEST_DATABASE_URL);
  try {
    assert.equal((await transferState(live, state)).mode, 'trial-rolled-back');
    const [row] = await live`SELECT to_regclass('cargona_legacy_state') AS name`;
    assert.equal(row.name, null, 'Trial must roll back table creation in an empty test database');
    console.log('Live PostgreSQL trial and rollback passed');
  } finally { await live.end({ timeout: 5 }); }
}
console.log('State migration: validation, full preservation, verification, rollback and overwrite protection passed');
