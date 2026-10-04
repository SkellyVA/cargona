import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cargona-menu-'));
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
try {
  fs.writeFileSync(path.join(root,'cargona'),fs.readFileSync('cargona','utf8')
    .replace('cmd_install_global 2>/dev/null || true','# disabled global installation for test'));
  fs.writeFileSync(path.join(root,'docker-compose.yml'),'services: {}\n');
  fs.writeFileSync(path.join(root,'.env'),'APP_DOMAIN=example.com\n');
  for(const name of ['postgres-migrate.sh','offsite-backup.sh','monitor.sh','release.sh','runtime-tools.sh','rehearse.sh','update.sh'])
    fs.writeFileSync(path.join(root,name),`#!/usr/bin/env bash\nprintf '%s ' '${name}' "$@" >>"$TEST_ROOT/calls"\nprintf '\\n' >>"$TEST_ROOT/calls"\n`);
  const sha='a'.repeat(40);
  fs.writeFileSync(path.join(root,'version-select.sh'),`#!/usr/bin/env bash\nprintf '%s\\n' '${sha}'\n`);
  const input=['17','1','2','3','4','5','0',
    '14','1','2','3','4','5','6','7','8','9','10','abcdef12','0',
    '15','1','2','3','4','5','0','6','',
    '12','release-id','13','16','/snapshot','image:sha','18','','0'].join('\n')+'\n';
  const r=spawnSync(bash,[path.join(root,'cargona')],{input,encoding:'utf8',
    env:{...process.env,TEST_ROOT:root.replaceAll('\\','/')},timeout:30000});
  assert.ifError(r.error);
  assert.equal(r.status,0,r.stdout + r.stderr);
  const calls=fs.readFileSync(path.join(root,'calls'),'utf8');
  for(const action of ['status','inspect','trial','rehearse','apply'])
    assert.ok(calls.includes(`postgres-migrate.sh ${action} `),action);
  for(const action of ['configure','init','run','enable','disable','status','list','check','prune','restore abcdef12'])
    assert.ok(calls.includes(`offsite-backup.sh ${action} `),action);
  for(const action of ['configure','run','enable','disable','status'])
    assert.ok(calls.includes(`monitor.sh ${action} `),action);
  assert.ok(calls.includes(`update.sh ${sha}`));
  assert.ok(calls.includes('release.sh list'));
  assert.ok(calls.includes('release.sh rollback release-id'));
  assert.ok(calls.includes(`runtime-tools.sh ${sha}`));
  assert.ok(calls.includes('rehearse.sh /snapshot image:sha'));
  assert.ok(r.stdout.includes('migration:status|inspect|trial|rehearse|apply'));
  console.log('Interactive menu routes: migration, backups, monitoring, update, rollback, tools and rehearsal passed.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
