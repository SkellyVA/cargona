import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cargona-versions-'));
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const unix=p=>p.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,d)=>`/${d.toLowerCase()}`);
try {
  fs.mkdirSync(path.join(root,'bin'));
  fs.writeFileSync(path.join(root,'version-select.sh'),fs.readFileSync('version-select.sh','utf8').replaceAll('</dev/tty',''));
  fs.copyFileSync('install.sh',path.join(root,'install.sh'));
  fs.writeFileSync(path.join(root,'bundle-install.sh'),'#!/usr/bin/env bash\nprintf "%s\\n" "$@" >"$TEST_ROOT/installed"\n');
  fs.writeFileSync(path.join(root,'bin/curl'),`#!/usr/bin/env bash
set -eu
url=''; out=''
while [[ $# -gt 0 ]]; do
  if [[ "$1" == https://* ]]; then url="$1"; fi
  if [[ "$1" == -o ]]; then out="$2"; shift; fi
  shift
done
if [[ "$url" == *api.github.com* ]]; then cp "$TEST_ROOT/runs.json" "$out";
else cp "$TEST_ROOT/$(basename "$url")" "$out"; fi
`,{mode:0o755});
  fs.writeFileSync(path.join(root,'bin/docker'),`#!/usr/bin/env bash
set -eu
while [[ $# -gt 0 ]]; do
  if [[ "$1" == -e ]]; then exec "$TEST_NODE" -e "$2"; fi
  shift
done
exit 99
`,{mode:0o755});
  const sha='a'.repeat(40), older='b'.repeat(40);
  const good=(head_sha,title)=>({head_sha,display_title:title,head_branch:'main',status:'completed',conclusion:'success',created_at:'2026-10-04T10:00:00Z'});
  const runs=[{...good('c'.repeat(40),'failed'),conclusion:'failure'},good(sha,'Current\nversion'),good(sha,'duplicate'),good(older,'Earlier'),{...good('d'.repeat(40),'other branch'),head_branch:'feature'}];
  const save=workflow_runs=>fs.writeFileSync(path.join(root,'runs.json'),JSON.stringify({workflow_runs}));
  const run=(script,input,args=[])=>spawnSync(bash,['-c','export PATH="$TEST_ROOT/bin:$PATH"; bash "$TEST_ROOT/$1" "${@:2}"','test',script,...args],
    {input,encoding:'utf8',timeout:30000,env:{...process.env,TEST_ROOT:unix(root),TEST_NODE:unix(process.execPath)}});
  save(runs);
  let r=run('version-select.sh','\n');
  assert.equal(r.status,0,r.stderr); assert.equal(r.stdout.trim(),sha);
  assert.ok(r.stderr.includes('Current version')); assert.ok(!r.stderr.includes('failed'));
  r=run('version-select.sh','99\n2\n');
  assert.equal(r.status,0,r.stderr); assert.equal(r.stdout.trim(),older);
  r=run('version-select.sh',`m\ninvalid\nm\n${older}\n`);
  assert.equal(r.status,0,r.stderr); assert.equal(r.stdout.trim(),older);
  r=run('version-select.sh','0\n'); assert.notEqual(r.status,0); assert.equal(r.stdout,'');
  r=run('install.sh','2\n'); assert.equal(r.status,0,r.stderr);
  assert.equal(fs.readFileSync(path.join(root,'installed'),'utf8'),`${older}\n/opt/cargona\n`);
  fs.unlinkSync(path.join(root,'installed'));
  r=run('install.sh','0\n'); assert.notEqual(r.status,0); assert.ok(!fs.existsSync(path.join(root,'installed')));
  r=run('install.sh','',[sha,'/opt/other']); assert.equal(r.status,0,r.stderr);
  assert.equal(fs.readFileSync(path.join(root,'installed'),'utf8'),`${sha}\n/opt/other\n`);
  save([]); r=run('version-select.sh','\n'); assert.notEqual(r.status,0);
  console.log('Version menu: successful runs only, deduplication, latest/older/manual choice, cancellation and installer routing passed.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
