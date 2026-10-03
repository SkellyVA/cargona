// Real built API in an isolated temporary JSON directory; no external bot calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-system-smoke-'));
const token = 'MOCK_PRIVATE_TEST_TOKEN';
const state = { tenants: [{ id: 't', slug: 'test', name: 'Test', codePrefix: 'TEST/S', status: 'ACTIVE', baseCurrency: 'USD', timezone: 'UTC', ownerEmail: 'owner@example.com', ownerPassword: 'owner-private-test' }], users: [], customers: [], packages: [],
  branches: [{ id: 'b', tenantId: 't', name: 'Test PVZ', type: 'DESTINATION_PVZ', isActive: true, cashBalance: 0, deliveryTariffs: { autoRatePerKgUSD: 4, minPackageCostUSD: 2 } }],
  tenantSettings: { t: { customerIdStart: 2500 } }, botConfigs: [{ id: 'bot', tenantId: 't', botToken: token, isActive: true }], futureField: { preserved: true } };
fs.writeFileSync(path.join(root, 'cargona-store.json'), JSON.stringify(state));
const server = net.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const child = spawn(process.execPath, ['apps/api/dist/server.mjs'], { env: { ...process.env, DATA_DIR: root, STORAGE_BACKEND: 'json', PORT: String(port), TELEGRAM_BOT_TOKEN: '', SUPERADMIN_PASSWORD: 'admin-private-test', APP_DOMAIN: 'test.invalid' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', b => logs += b); child.stderr.on('data', b => logs += b);
const base = `http://127.0.0.1:${port}`;
const json = async response => { const data = await response.json(); assert.ok(response.ok, `${response.status}: ${JSON.stringify(data)}`); return data; };
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${base}/health/ready`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Built API must become ready');
  assert.equal((await fetch(`${base}/api/admin/overview`)).status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password: state.tenants[0].ownerPassword }) });
  await json(login);
  const cookies = login.headers.getSetCookie();
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  const csrf = cookies.find(c => c.startsWith('cargona_csrf=')).split(';')[0].slice('cargona_csrf='.length);
  const headers = { 'content-type': 'application/json', cookie, 'x-cargona-csrf': csrf };
  const post = (resource, body, custom = headers) => fetch(`${base}/api/o/test/${resource}`, { method: 'POST', headers: custom, body: JSON.stringify(body) });
  const manual = await json(await post('customers', { cargoCode: 'TEST/S2256', fullName: 'Manual', phone: '123' }));
  assert.equal(manual.customer.cargoCode, 'TEST/S2256');
  assert.equal((await post('customers', { cargoCode: 'TEST/S2256', fullName: 'Duplicate' })).status, 409);
  const signed = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123, first_name: 'Synthetic' }) });
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  signed.set('hash', createHmac('sha256', secret).update([...signed.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')).digest('hex'));
  const automatic = await json(await post('customers', { cargoCode: 'TEST/S1', fullName: 'Automatic', phone: '123' }, { 'content-type': 'application/json', 'x-telegram-init-data': signed.toString() }));
  assert.ok(Number(automatic.customer.cargoCode.replace(/\D/g, '')) >= 2500);
  const tracks = Array.from({ length: 601 }, (_, n) => `SMOKE${n}`);
  const bulk = await json(await post('packages/bulk', { trackingNumbers: tracks, shippedAt: '2026-10-03' }));
  assert.equal(bulk.createdCount, 601);
  assert.ok(bulk.packages.every(p => p.weightPending && p.weightKg === 0 && p.cost === 0 && p.shippedAt.startsWith('2026-10-03')));
  const pkg = bulk.packages[0];
  const weighed = await json(await fetch(`${base}/api/o/test/packages/${pkg.id}`, { method: 'PUT', headers, body: JSON.stringify({ weightKg: 2, costUSD: 999, currentBranchId: 'b', status: 'READY_FOR_PICKUP' }) }));
  assert.equal(weighed.package.cost, 8);
  assert.equal(weighed.package.weightPending, false);
  const repeat = await json(await post('packages/bulk', { trackingNumbers: tracks, skipExisting: true }));
  assert.equal(repeat.createdCount, 0);
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'cargona-store.json')));
  assert.equal(saved.packages.find(p => p.id === pkg.id).cost, 8);
  assert.equal(saved.packages.find(p => p.id === pkg.id).weightKg, 2);
  assert.deepEqual(saved.futureField, state.futureField);
  assert.ok(saved.packageHistory.some(e => e.packageId === pkg.id));
  console.log('Built API smoke passed: access control, manual/automatic IDs, 601 tracks, dates, first-weigh tariff, duplicate preservation and history.');
} finally {
  child.kill();
  if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
  fs.rmSync(root, { recursive: true, force: true });
}
