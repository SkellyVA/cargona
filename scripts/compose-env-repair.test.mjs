import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-env-repair-'));
try {
  const shell = fs.readFileSync('compose-env-repair.sh', 'utf8');
  const code = shell.split("<<'NODE'\n")[1].split('\nNODE\n')[0]
    .replace("const dir = '/repair';", `const dir = ${JSON.stringify(root)};`);
  fs.writeFileSync(path.join(root, 'convert.cjs'), code);
  const secret = "secret'quote$$dollar\\slash";
  const config = {name:'cargona',services:{
    backend:{image:'pinned-api',volumes:['/opt/cargona/data/backend:/app/data'],environment:{
      DATA_DIR:'/app/data',APP_DOMAIN:'example.com',SUPERADMIN_PASSWORD:secret,
      TELEGRAM_BOT_TOKEN:'token',DATABASE_URL:'postgres://user:pass@postgres:5432/db'}},
    postgres:{environment:{POSTGRES_USER:'user',POSTGRES_PASSWORD:'pass',POSTGRES_DB:'db'}},
    bot:{environment:{TELEGRAM_BOT_TOKEN:'token',WEBAPP_URL:'https://example.com/o/noor/app'}}}};
  fs.writeFileSync(path.join(root, 'env.before'), "# retain comment\nSUPERADMIN_PASSWORD=stale\nUNKNOWN_SETTING=keep\n");
  const run = () => {
    fs.writeFileSync(path.join(root, 'resolved.before.json'), JSON.stringify(config));
    return spawnSync(process.execPath, [path.join(root, 'convert.cjs')], {encoding:'utf8'});
  };
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(fs.readFileSync(path.join(root, 'compose.next')));
  const env = fs.readFileSync(path.join(root, 'env.next'), 'utf8');
  assert.equal(output.services.backend.environment.APP_DOMAIN, '${APP_DOMAIN}');
  assert.equal(output.services.backend.environment.DATA_DIR, '/app/data');
  assert.deepEqual(output.services.backend.volumes, config.services.backend.volumes);
  assert.equal(output.services.backend.image, 'pinned-api');
  assert.equal(output.services.backend.environment.DATABASE_URL,
    'postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}');
  assert.ok(env.includes("SUPERADMIN_PASSWORD='secret\\'quote$dollar\\slash'"));
  assert.ok(env.includes('UNKNOWN_SETTING=keep'));
  assert.ok(!env.includes('stale'));
  config.services.bot.environment.TELEGRAM_BOT_TOKEN = 'other-token';
  result = run();
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('Conflicting service values'));
  config.services.bot.environment.TELEGRAM_BOT_TOKEN = 'token';
  config.services.backend.environment.DATABASE_URL = 'postgres://external/db';
  result = run();
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('Custom DATABASE_URL'));
  console.log('Compose dotenv repair: paths/images retained, secrets escaped, conflicts refused.');
} finally { fs.rmSync(root, {recursive:true, force:true}); }
