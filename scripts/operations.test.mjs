import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/api/src/bot-health.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({}), Date });
const app = require('fastify')();
let calls = 0;
let info = { url: 'https://example.com/api/bot/webhook/test', pending_update_count: 0 };
exports.registerBotHealth(app, { tenants: [{ id: 't', slug: 'test' }], botConfigs: [{ tenantId: 't', botToken: 'private-fixture', isActive: true }] }, 'example.com', async (_token, method) => { calls++; assert.equal(method, 'getWebhookInfo'); return info; });
try {
  assert.equal((await app.inject({ url: '/health/bots', remoteAddress: '172.18.0.1' })).statusCode, 403);
  assert.equal(calls, 0);
  assert.equal((await app.inject({ url: '/health/bots' })).statusCode, 200);
  info.pending_update_count = 200;
  assert.equal((await app.inject({ url: '/health/bots' })).statusCode, 503);
  info = { url: 'https://other.invalid/api/bot/webhook/test', pending_update_count: 0 };
  const response = await app.inject({ url: '/health/bots' });
  assert.equal(response.statusCode, 503);
  assert.ok(!response.body.includes('private-fixture'));
} finally { await app.close(); }

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-operations-'));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unix = p => process.platform === 'win32' ? p.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : p;
try {
  const data = path.join(root, 'state');
  fs.mkdirSync(data);
  const file = path.join(data, 'cargona-store.json');
  const state = { tenants: [{ id: 't', slug: 'test', ownerEmail: 'old@example.com', ownerPassword: 'old-password' }], customers: [], packages: [], users: [], sessions: [{ tenantId: 't', tokenHash: 'old' }, { tenantId: 'other', tokenHash: 'retained' }], futureField: { preserved: true } };
  fs.writeFileSync(file, JSON.stringify(state));
  function reset(input) {
    return spawnSync(process.execPath, ['apps/api/dist/maintenance.mjs', 'owner-reset', '--confirm-stopped'], { input: JSON.stringify(input), env: { ...process.env, DATA_DIR: data, STORAGE_BACKEND: 'json' }, encoding: 'utf8', windowsHide: true });
  }
  const credentials = { slug: 'test', email: 'new@example.com', password: 'correct-private-password' };
  let r = reset({ ...credentials, slug: 'missing' });
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), state);
  r = reset(credentials);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes(credentials.password));
  const saved = JSON.parse(fs.readFileSync(file));
  assert.equal(saved.tenants[0].ownerEmail, credentials.email);
  assert.ok(saved.tenants[0].ownerPassword.startsWith('scrypt$'));
  assert.equal(saved.sessions.length, 1);
  assert.deepEqual(saved.futureField, state.futureField);
  assert.ok(saved.auditLogs.some(e => e.action === 'OWNER_CREDENTIAL_RESET'));

  fs.mkdirSync(path.join(root, 'bin'));
  fs.mkdirSync(path.join(root, 'data/monitor'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/backend'), { recursive: true });
  fs.copyFileSync('monitor.sh', path.join(root, 'monitor.sh'));
  fs.copyFileSync('scripts/fixtures/release-docker.sh', path.join(root, 'bin/docker-fixture'));
  fs.chmodSync(path.join(root, 'bin/docker-fixture'), 0o755);
  fs.writeFileSync(path.join(root, 'bin/docker'), '#!/usr/bin/env bash\nif [[ "$*" == *State.Status* ]]; then echo "running false"; else exec "$MOCK_ROOT/bin/docker-fixture" "$@"; fi\n', { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'bin/df'), '#!/usr/bin/env bash\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted\\nfixture 9999999 0 9999999 0%% /\\n"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'bin/curl'), '#!/usr/bin/env bash\ncat >/dev/null\n[[ "$MOCK_NOTIFY_FAIL" != true ]] || exit 1\nprintf "notified\\n" >>"$MOCK_ROOT/notifications"\n', { mode: 0o755 });
  if (process.platform === 'win32') fs.writeFileSync(path.join(root, 'bin/flock'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'data/monitor/telegram.env'), '123:private_monitor_token\n456\n');
  fs.writeFileSync(path.join(root, 'new'), '');
  function monitor(extra = {}) {
    const r = spawnSync(bash, ['-c', 'export PATH="$MOCK_ROOT/bin:$PATH"; bash "$MOCK_ROOT/monitor.sh" run'], { env: { ...process.env, MOCK_ROOT: unix(root), MOCK_NOTIFY_FAIL: '', ...extra }, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.ifError(r.error);
    assert.ok(!`${r.stdout}${r.stderr}`.includes('private_monitor_token'));
    return r;
  }
  r = monitor();
  assert.equal(r.status, 0, r.stderr);
  r = monitor();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'notifications'), 'utf8').trim().split('\n').length, 1, 'Unchanged health must not spam notifications');
  r = monitor({ MOCK_UNHEALTHY: 'true', MOCK_NOTIFY_FAIL: 'true' });
  assert.notEqual(r.status, 0);
  r = monitor({ MOCK_UNHEALTHY: 'true' });
  assert.notEqual(r.status, 0, 'An unhealthy probe must have nonzero status');
  assert.equal(fs.readFileSync(path.join(root, 'notifications'), 'utf8').trim().split('\n').length, 2, 'Failed delivery must retry');
  r = monitor();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'notifications'), 'utf8').trim().split('\n').length, 3, 'Recovery must notify');
  console.log('Bot probes, offline credential reset, monitoring deduplication and retry checks passed.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
