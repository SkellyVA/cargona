import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unix = p => process.platform === 'win32' ? p.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : p;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-offsite-'));
try {
  for (const p of ['bin', 'data/backend', 'data/offsite']) fs.mkdirSync(path.join(directory, p), { recursive: true });
  fs.copyFileSync('offsite-backup.sh', path.join(directory, 'offsite-backup.sh'));
  fs.copyFileSync('scripts/fixtures/release-docker.sh', path.join(directory, 'bin/docker'));
  fs.chmodSync(path.join(directory, 'bin/docker'), 0o755);
  fs.writeFileSync(path.join(directory, 'data/backend/cargona-store.json'), JSON.stringify({ tenants: [], customers: [], packages: [], users: [] }));
  fs.writeFileSync(path.join(directory, 'docker-compose.yml'), 'services: {}');
  const config = path.join(directory, 'data/offsite/restic.env');
  fs.writeFileSync(config, 'RESTIC_REPOSITORY=b2:test:cargona\nRESTIC_PASSWORD=fixture-secret\n');
  fs.writeFileSync(path.join(directory, 'bin/restic'), `#!/usr/bin/env bash
set -eu
printf 'restic %s\\n' "$*" >>"$MOCK_ROOT/log"
if [[ "$1" == backup ]]; then
  [[ "$MOCK_UPLOAD_FAIL" != true ]] || exit 1
  (cd snapshot && sha256sum --check checksum >/dev/null)
  rm -rf "$MOCK_ROOT/uploaded"
  cp -r snapshot "$MOCK_ROOT/uploaded"
fi
`, { mode: 0o755 });
  if (process.platform === 'win32') fs.writeFileSync(path.join(directory, 'bin/flock'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  function run(operation, extra = {}, input = '') {
    const r = spawnSync(bash, ['-c', 'export PATH="$MOCK_ROOT/bin:$PATH"; bash "$MOCK_ROOT/offsite-backup.sh" "$@"', 'test', operation], {
      input, env: { ...process.env, MOCK_ROOT: unix(directory), MOCK_UPLOAD_FAIL: '', ...extra }, encoding: 'utf8', timeout: 30000, windowsHide: true,
    });
    assert.ifError(r.error);
    assert.ok(!`${r.stdout}${r.stderr}`.includes('fixture-secret'));
    return r;
  }
  let r = run('run');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(directory, 'uploaded/state.json')));
  assert.ok(fs.existsSync(path.join(directory, 'data/offsite/last-success')));
  let log = fs.readFileSync(path.join(directory, 'log'), 'utf8');
  assert.ok(log.includes('restic forget --tag cargona --host cargona --path'));
  assert.ok(!log.includes('stop frontend'));
  assert.equal(fs.readdirSync(path.join(directory, 'data/offsite/snapshot')).length, 0);
  const success = fs.readFileSync(path.join(directory, 'data/offsite/last-success'), 'utf8');
  r = run('run', { MOCK_UPLOAD_FAIL: 'true' });
  assert.notEqual(r.status, 0);
  assert.equal(fs.readFileSync(path.join(directory, 'data/offsite/last-success'), 'utf8'), success);
  assert.ok(fs.readFileSync(path.join(directory, 'data/offsite/last-attempt'), 'utf8').trim().endsWith(' 1'));
  assert.equal(fs.readdirSync(path.join(directory, 'data/offsite/snapshot')).length, 0);
  r = run('run', { MOCK_CORRUPT: 'true' });
  assert.notEqual(r.status, 0);
  r = run('run', { MOCK_MODE: 'postgres' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(directory, 'uploaded/database.dump')));
  assert.ok(!fs.existsSync(path.join(directory, 'uploaded/state.json')), 'No stale JSON in PostgreSQL snapshot');
  fs.appendFileSync(config, 'EVIL=$(touch hacked)\n');
  r = run('run');
  assert.notEqual(r.status, 0);
  assert.ok(!fs.existsSync(path.join(directory, 'hacked')));
  const hideRestic = path.join(directory, 'hide-restic.sh');
  fs.writeFileSync(hideRestic, 'command() { if [[ "$*" == "-v restic" ]]; then return 1; fi; builtin command "$@"; }\n');
  r = run('status', { BASH_ENV: unix(hideRestic) });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('Restic: не установлен'));
  fs.unlinkSync(config);
  r = run('status', { BASH_ENV: unix(hideRestic) });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('Хранилище: не настроено'));
  r = run('configure', { BASH_ENV: unix(hideRestic) });
  assert.notEqual(r.status, 0);
  assert.ok(r.stderr.includes('пункт 11'));
  assert.ok(!fs.existsSync(config), 'Missing dependency must not leave partial credentials');
  // Emulate elevation only in this disposable copy; apt is a logging stub.
  fs.writeFileSync(path.join(directory, 'offsite-backup.sh'), fs.readFileSync('offsite-backup.sh', 'utf8')
    .replace('[[ "$EUID" == 0 ]]', 'true'));
  fs.writeFileSync(path.join(directory, 'bin/apt-get'), '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >>"$MOCK_ROOT/apt-calls"\n[[ "${MOCK_APT_FAIL:-}" != true ]]\n', {mode:0o755});
  r = run('install-restic', { BASH_ENV: unix(hideRestic) }, 'n\n');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(directory, 'apt-calls')), 'Declined installation must not invoke apt');
  r = run('install-restic', { BASH_ENV: unix(hideRestic) }, 'y\n');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(directory, 'apt-calls'), 'utf8'), 'update\ninstall -y restic\n');
  fs.unlinkSync(path.join(directory, 'apt-calls'));
  r = run('install-restic', { BASH_ENV: unix(hideRestic), MOCK_APT_FAIL:'true' }, 'y\n');
  assert.notEqual(r.status, 0);
  assert.equal(fs.readFileSync(path.join(directory, 'apt-calls'), 'utf8'), 'update\n', 'Failed apt update must abort installation');
  console.log('Offsite backup orchestration checks passed (mock storage and Docker).');
  if (process.env.RESTIC_ROUNDTRIP === 'true') {
    const source = path.join(directory, 'plain');
    const repository = path.join(directory, 'encrypted');
    const restored = path.join(directory, 'restored');
    fs.mkdirSync(source);
    const marker = 'private-test-configuration-unique-cargona';
    fs.writeFileSync(path.join(source, 'state.json'), JSON.stringify({ customers: [{ name: marker }] }));
    const env = { ...process.env, RESTIC_REPOSITORY: repository, RESTIC_PASSWORD: 'local-test-encryption-password', RESTIC_CACHE_DIR: path.join(directory, 'cache') };
    for (const args of [['init'], ['backup', source], ['check', '--read-data'], ['restore', 'latest', '--target', restored]]) {
      const r = spawnSync('restic', args, { env, encoding: 'utf8', timeout: 60000 });
      assert.ifError(r.error);
      assert.equal(r.status, 0, r.stderr);
    }
    function files(root) {
      return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(root, e.name)) : [path.join(root, e.name)]);
    }
    const restoredState = files(restored).find(p => path.basename(p) === 'state.json');
    assert.ok(restoredState);
    assert.deepEqual(fs.readFileSync(restoredState), fs.readFileSync(path.join(source, 'state.json')));
    for (const file of files(repository)) assert.ok(!fs.readFileSync(file).includes(Buffer.from(marker)), 'Repository must not contain plaintext private records');
    console.log('Real Restic encryption, full repository check and isolated file restore passed.');
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}

