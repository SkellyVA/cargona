import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unix = value => process.platform === 'win32' ? value.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`) : value;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-release-tests-'));
const sha = 'a'.repeat(40);
const docker = fs.readFileSync('scripts/fixtures/release-docker.sh', 'utf8');
function fixture(name) {
  const directory = path.join(root, name);
  fs.mkdirSync(path.join(directory, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'data/backend'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'data/backend/cargona-store.json'), JSON.stringify({ tenants: [], customers: [], packages: [], users: [], balance: 17 }));
  fs.writeFileSync(path.join(directory, 'docker-compose.yml'), 'services: {}\n');
  fs.writeFileSync(path.join(directory, '.env'), 'SECRET=fixture-secret\n');
  fs.copyFileSync('release.sh', path.join(directory, 'release.sh'));
  fs.writeFileSync(path.join(directory, 'bin/docker'), docker, { mode: 0o755 });
  fs.writeFileSync(path.join(directory, 'bin/sleep'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  // Git Bash has no flock; production and Linux CI use real util-linux flock.
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(directory, 'bin/flock'), '#!/usr/bin/env bash\n[[ "${MOCK_LOCK_FAIL:-}" != true ]]\n', { mode: 0o755 });
    // MSYS cannot fsync these Windows handles; Linux CI uses real sync.
    fs.writeFileSync(path.join(directory, 'bin/sync'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  }
  return directory;
}
function run(directory, args, extra = {}) {
  const script = 'export PATH="$MOCK_ROOT/bin:$PATH"; bash "$MOCK_ROOT/release.sh" "$@"';
  const result = spawnSync(bash, ['-c', script, 'release-test', ...args], {
    env: { ...process.env, MOCK_ROOT: unix(directory), ...extra }, encoding: 'utf8', windowsHide: true, timeout: 45000,
  });
  assert.ok(!result.error, result.error?.message);
  assert.ok(!`${result.stdout}${result.stderr}`.includes('fixture-secret'), 'Configuration secrets must not be printed');
  return result;
}
const log = directory => fs.readFileSync(path.join(directory, 'log'), 'utf8');
const points = directory => fs.readdirSync(path.join(directory, 'data/releases')).filter(name => name.startsWith('release-'));
try {
  let directory = fixture('success');
  let result = run(directory, ['update', sha]);
  assert.equal(result.status, 0, result.stderr);
  const point = points(directory)[0];
  const saved = path.join(directory, 'data/releases', point);
  assert.ok(fs.existsSync(path.join(saved, 'backup.ok')));
  assert.ok(fs.existsSync(path.join(directory, 'data/releases/active.yml')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(saved, 'state.json'))).balance, 17);
  assert.ok(log(directory).includes('--no-build --pull never backend'));
  assert.ok(!log(directory).includes('--build'));
  assert.ok(fs.readFileSync(path.join(saved, 'candidate.yml'), 'utf8').includes('sha256:'));
  assert.ok(log(directory).indexOf('stop frontend bot caddy backend') < log(directory).indexOf('candidate.yml up'));
  result = run(directory, ['rollback', point]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'data/backend/cargona-store.json'))).balance, 17);
  assert.equal(points(directory).length, 2, 'Rollback must save a fresh recovery point');
  fs.appendFileSync(path.join(saved, 'state.json'), '\n ');
  result = run(directory, ['rollback', point]);
  assert.notEqual(result.status, 0, 'Tampered backup must block rollback before changes');
  fs.writeFileSync(path.join(saved, 'state.json'), JSON.stringify({ tenants: [], customers: [], packages: [], users: [], balance: 17 }));
  result = run(directory, ['rollback', '../../escape']);
  assert.notEqual(result.status, 0);
  result = run(directory, ['rollback', point], { MOCK_MODE: 'postgres' });
  assert.notEqual(result.status, 0, 'Storage switching cannot be an application rollback');
  for (const [name, extra] of Object.entries({ pull: { MOCK_PULL_FAIL: 'true' }, incompatible: { MOCK_TARGET_COMPAT: 'false' }, config: { MOCK_CONFIG_MODE: 'postgres' } })) {
    directory = fixture(name);
    result = run(directory, ['update', sha], extra);
    assert.notEqual(result.status, 0);
    assert.ok(!log(directory).includes('stop frontend'), `${name}: preflight must fail before downtime`);
  }
  directory = fixture('failed-health');
  result = run(directory, ['update', sha], { MOCK_UNHEALTHY: 'true', MOCK_NEW_DATA: 'true' });
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('Previous application images restored'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'data/backend/cargona-store.json'))).newRecord, true, 'Automatic application rollback must preserve current data');
  directory = fixture('legacy-failure');
  result = run(directory, ['update', sha], { MOCK_FAIL_UP: 'true', MOCK_OLD_COMPAT: 'false' });
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('Automatic recovery unavailable'));
  directory = fixture('backup-failure');
  result = run(directory, ['update', sha], { MOCK_CORRUPT: 'true', MOCK_OLD_COMPAT: 'false' });
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('Previous application images restored'), 'Unchanged original images can restart after backup failure');
  assert.ok(!fs.existsSync(path.join(directory, 'new')));
  directory = fixture('postgres');
  result = run(directory, ['backup'], { MOCK_MODE: 'postgres' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(directory, 'data/releases', points(directory)[0], 'database.dump')));
  const cli = fs.readFileSync('cargona', 'utf8');
  const restoreFunction = cli.slice(cli.indexOf('cmd_backup_restore() ('), cli.indexOf('# 6. UPDATE SYSTEM'));
  for (const corrupt of [false, true]) {
    directory = fixture(`restore-${corrupt}`);
    fs.mkdirSync(path.join(directory, 'data/backups'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'data/backups/source.json'), JSON.stringify({ tenants: [], customers: [], packages: [], users: [], balance: 3 }));
    fs.writeFileSync(path.join(directory, 'restore-test.sh'), `#!/usr/bin/env bash\nset -eu\numask 077\nAPP_DIR="$MOCK_ROOT"\nBACKUP_DIR="$MOCK_ROOT/data/backups"\nRED='' CYAN='' BOLD='' GREEN='' YELLOW='' NC=''\ndc_cmd() { docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yml" "$@"; }\n${restoreFunction}\ncmd_backup_restore\n`);
    result = spawnSync(bash, ['-c', 'export PATH="$MOCK_ROOT/bin:$PATH"; bash "$MOCK_ROOT/restore-test.sh"'], {
      env: { ...process.env, MOCK_ROOT: unix(directory), MOCK_CORRUPT: String(corrupt) }, input: '1\ny\n', encoding: 'utf8', windowsHide: true, timeout: 45000,
    });
    assert.equal(result.status, corrupt ? 1 : 0, result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'data/backend/cargona-store.json'))).balance, corrupt ? 17 : 3);
    if (!corrupt) {
      const safety = fs.readdirSync(path.join(directory, 'data/backups')).find(name => name.startsWith('before_restore'));
      assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'data/backups', safety))).balance, 17);
    }
  }
  if (process.platform !== 'win32') {
    directory = fixture('lock');
    fs.mkdirSync(path.join(directory, 'data/releases'), { recursive: true });
    const holder = spawn(bash, ['-c', 'set -e; exec 9>"$MOCK_ROOT/data/releases/.lock"; flock 9; echo ready; read -r done'], {
      env: { ...process.env, MOCK_ROOT: directory }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    try {
      await new Promise((resolve, reject) => { holder.stdout.once('data', resolve); holder.once('error', reject); holder.once('exit', code => reject(new Error(`Lock holder exited: ${code}`))); });
      result = run(directory, ['update', sha]);
      assert.notEqual(result.status, 0);
      assert.ok(result.stderr.includes('Another release operation'));
    } finally {
      const ended = new Promise(resolve => holder.once('exit', resolve));
      holder.stdin.end();
      await ended;
    }
  }
  console.log('Release checks passed: pinned versions, snapshots, backup verification, rollback without data restore, health failures, incompatible storage, private config and PostgreSQL backup');
} finally { fs.rmSync(root, { recursive: true }); }
