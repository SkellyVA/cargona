import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unix = p => process.platform === 'win32' ? p.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : p;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-runtime-'));
try {
  fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync('runtime-tools.sh', path.join(root, 'runtime-tools.sh'));
  fs.writeFileSync(path.join(root, 'cargona'), '#!/usr/bin/env bash\necho old\n');
  fs.writeFileSync(path.join(root, 'bin/curl'), `#!/usr/bin/env bash
set -eu
file='';output=''
while [[ $# -gt 0 ]]; do
  if [[ "$1" == https://* ]]; then file="$1"; fi
  if [[ "$1" == -o ]]; then output="$2"; shift; fi
  shift
done
[[ "$MOCK_DOWNLOAD_FAIL" != true ]] || exit 1
cp "$MOCK_REPO/$(basename "$file")" "$output"
`, { mode: 0o755 });
  if (process.platform === 'win32') fs.writeFileSync(path.join(root, 'bin/flock'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  const sha = 'a'.repeat(40);
  function run(script, args, extra = {}, input = '') {
    const r = spawnSync(bash, ['-c', 'export PATH="$MOCK_ROOT/bin:$PATH"; bash "$MOCK_ROOT/$1" "${@:2}"', 'test', script, ...args], { input, env: { ...process.env, MOCK_ROOT: unix(root), MOCK_REPO: unix(process.cwd()), MOCK_DOWNLOAD_FAIL: '', ...extra }, encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.ifError(r.error);
    return r;
  }
  let r = run('runtime-tools.sh', [sha], { MOCK_DOWNLOAD_FAIL: 'true' });
  assert.notEqual(r.status, 0);
  assert.ok(fs.readFileSync(path.join(root, 'cargona'), 'utf8').includes('echo old'));
  r = run('runtime-tools.sh', [sha]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'cargona'), 'utf8'), fs.readFileSync('cargona', 'utf8'));
  const previous = fs.readdirSync(path.join(root, 'data/tools')).find(p => p.startsWith('previous-'));
  assert.ok(fs.readFileSync(path.join(root, 'data/tools', previous, 'cargona'), 'utf8').includes('echo old'));
  fs.writeFileSync(path.join(root, 'bundle-install.sh'), fs.readFileSync('bundle-install.sh', 'utf8').replaceAll('</dev/tty', ''));
  fs.copyFileSync('scripts/fixtures/release-docker.sh', path.join(root, 'bin/docker'));
  fs.chmodSync(path.join(root, 'bin/docker'), 0o755);
  const target = `${unix(root)}/installation`;
  r = run('bundle-install.sh', [sha, target], {}, 'example.com\nadmin@example.com\n');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, 'installation/docker-compose.yml')));
  assert.ok(!fs.existsSync(path.join(root, 'installation/apps')));
  assert.ok(!fs.existsSync(path.join(root, 'installation/.git')));
  assert.ok(!fs.readFileSync(path.join(root, 'installation/docker-compose.yml'), 'utf8').includes('build:'));
  r = run('bundle-install.sh', [sha, target]);
  assert.notEqual(r.status, 0, 'Existing runtime installation must not be overwritten');
  const cli = fs.readFileSync('cargona', 'utf8');
  const functions = cli.slice(cli.indexOf('get_env_var() {'), cli.indexOf('# Docker compose command wrapper'));
  fs.writeFileSync(path.join(root, 'env-test.sh'), `#!/usr/bin/env bash\nset -e\nAPP_DIR="$MOCK_ROOT"\nENV_FILE="$MOCK_ROOT/installation/.env"\n${functions}\nread -r value\nset_env_var SUPERADMIN_PASSWORD "$value"\nget_env_var SUPERADMIN_PASSWORD\n`);
  const password = "synthetic'quote$dollar\\slash|literal";
  r = run('env-test.sh', [], {}, `${password}\n`);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), password, 'Dotenv values must round trip without execution or interpolation');
  if (process.env.RUNTIME_COMPOSE_CHECK === 'true') {
    const result = spawnSync('docker', ['compose', '--project-directory', path.join(root, 'installation'), '-f', path.join(root, 'installation/docker-compose.yml'), 'config', '--format', 'json'], { encoding: 'utf8', env: process.env });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).services.backend.environment.SUPERADMIN_PASSWORD, password);
  }
  console.log('Runtime-only bundle and atomic script download checks passed.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
