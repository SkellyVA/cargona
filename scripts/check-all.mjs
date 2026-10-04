// Reproducible local verification; synthetic fixtures only. Never deploys or restores production.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const timestamp = new Date().toISOString().replaceAll(':', '-');
const root = path.resolve('data/qa', timestamp);
fs.mkdirSync(root, { recursive: true, mode: 0o700 });
const results = [];
async function run(name, command, args, cwd = process.cwd()) {
  const start = Date.now();
  const child = spawn(command, args, { cwd, env: process.env, windowsHide: true, shell: process.platform === 'win32' && command === 'npm', stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  const timer = setTimeout(() => child.kill(), 240000);
  const code = await new Promise(resolve => { child.once('error', error => { output += error.message; resolve(-1); }); child.once('exit', code => resolve(code ?? -1)); });
  clearTimeout(timer);
  const result = { name, code, seconds: Math.round((Date.now() - start) / 1000) };
  fs.writeFileSync(path.join(root, `${name}.log`), output, { mode: 0o600 });
  results.push(result);
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${name} (${result.seconds}s)`);
  return code === 0;
}
if (process.argv.includes('--build')) {
  for (const workspace of ['packages/types', 'packages/db', 'apps/api', 'apps/web', 'apps/bot']) {
    if (!await run(`build-${workspace.replace('/', '-')}`, 'npm', ['run', 'build'], path.resolve(workspace))) {
      fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
      process.exit(1);
    }
  }
}
const tests = ['persistence', 'state-migration', 'postgres-runtime', 'package-history', 'package-weight', 'branch-tariffs', 'branch-create', 'shipping-input', 'sw', 'telegram', 'authentication', 'customer-links', 'client-security', 'finance', 'handover', 'broadcasts', 'api-client-regression', 'release', 'offsite-backup', 'operations', 'runtime-tools', 'compose-env-repair', 'cli-menu', 'system-smoke', 'miniapp-config'];
// Separate processes isolate filesystem doubles and API fixtures. Four at a time bounds resources.
for (let index = 0; index < tests.length; index += 4) {
  const names = tests.slice(index, index + 4);
  const settled = await Promise.allSettled(names.map(name => run(name, process.execPath, [`scripts/${name}.test.mjs`])));
  settled.forEach((result, offset) => {
    if (result.status === 'rejected') {
      results.push({ name: names[offset], code: -1, error: String(result.reason) });
      console.log(`FAIL ${names[offset]} (test runner error)`);
    }
  });
}
fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(results, null, 2), { mode: 0o600 });
console.log(`Detailed logs and results: ${root}`);
process.exitCode = results.some(r => r.code !== 0) ? 1 : 0;
