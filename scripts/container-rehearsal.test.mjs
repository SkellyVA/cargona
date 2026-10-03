// Linux/Docker CI only. Synthetic data, new internal network, no production secrets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const image = process.env.REHEARSAL_API_IMAGE;
assert.ok(image, 'Set REHEARSAL_API_IMAGE to a trusted built API image');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-real-restore-'));
try {
  fs.copyFileSync('rehearse.sh', path.join(root, 'rehearse.sh'));
  const snapshot = path.join(root, 'input');
  fs.mkdirSync(snapshot);
  const document = { tenants: [{ id: 'tenant', slug: 'test', name: 'Synthetic test' }], users: [], customers: [{ id: 'customer', tenantId: 'tenant', cargoCode: 'T/2256', balance: -17.25 }], packages: [{ id: 'pkg', tenantId: 'tenant', trackingNumber: 'SYNTHETIC1', weightKg: 0, weightPending: true, cost: 0 }], financialReceipts: [{ key: 'retry', response: { success: true } }], futureField: { preserved: true } };
  fs.writeFileSync(path.join(snapshot, 'state.json'), JSON.stringify(document));
  fs.writeFileSync(path.join(snapshot, 'storage'), 'json\n');
  function manifest() {
    const lines = fs.readdirSync(snapshot).filter(name => name !== 'checksum').map(name => `${createHash('sha256').update(fs.readFileSync(path.join(snapshot, name))).digest('hex')}  ${name}`);
    fs.writeFileSync(path.join(snapshot, 'checksum'), `${lines.join('\n')}\n`);
  }
  function run() {
    const result = spawnSync('bash', [path.join(root, 'rehearse.sh'), snapshot, image], { encoding: 'utf8', timeout: 240000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const reports = fs.readdirSync(path.join(root, 'data/rehearsals')).map(name => path.join(root, 'data/rehearsals', name));
    return reports.find(p => fs.readFileSync(path.join(p, 'restored-inspection.json'), 'utf8') && fs.existsSync(path.join(p, 'result')) && !fs.existsSync(path.join(p, 'used')));
  }
  manifest();
  const json = run();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(json, 'restored.json'))), document);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(json, 'after-restart.json'))), document);
  fs.writeFileSync(path.join(json, 'used'), '');
  fs.copyFileSync(path.join(json, 'rehearsed.dump'), path.join(snapshot, 'database.dump'));
  fs.unlinkSync(path.join(snapshot, 'state.json'));
  fs.writeFileSync(path.join(snapshot, 'storage'), 'postgres\n');
  manifest();
  const pg = run();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(pg, 'restored.json'))), document);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(pg, 'after-restart.json'))), document);
  const resources = spawnSync('docker', ['network', 'ls', '-q', '--filter', 'name=cargona-rehearsal-'], { encoding: 'utf8' });
  assert.equal(resources.status, 0);
  assert.equal(resources.stdout.trim(), '', 'Rehearsal networks must be removed');
  console.log('Real container JSON migration, full pg_restore and API restarts passed.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
