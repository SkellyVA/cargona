import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cargona-bootstrap-'));
const sha='a'.repeat(40);
try {
  const bin=path.join(root,'bin');fs.mkdirSync(bin);
  // An isolated PATH makes a missing Docker reproducible even on CI hosts with Docker.
  for(const name of ['bash','sh','mktemp','rm','cp','chmod','openssl','flock']){
    const found=spawnSync('/bin/bash',['-c',`command -v ${name}`],{encoding:'utf8'}).stdout.trim();
    fs.symlinkSync(found,path.join(bin,name));
  }
  const fixture=(name,body)=>fs.writeFileSync(path.join(root,name),body,{mode:0o755});
  fixture('bin/id','#!/bin/sh\nprintf "%s\\n" "$TEST_UID"\n');
  fixture('bin/uname','#!/bin/sh\necho Linux\n');
  fixture('install.sh',fs.readFileSync('install.sh','utf8'));
  fixture('version-select.sh',`#!/bin/sh\necho ${sha}\n`);
  fixture('bundle-install.sh','#!/bin/sh\necho bundled >"$TEST_ROOT/bundled"\n');
  fixture('docker-ready',`#!/bin/sh
case "$*" in
  'compose version') [ "$TEST_DOCKER_MODE" != compose-fail ] ;;
  info) [ "$TEST_DOCKER_MODE" != daemon-fail ] ;;
  *) exit 0 ;;
esac
`);
  fixture('docker-setup',`#!/bin/sh
[ "$TEST_DOCKER_MODE" != install-fail ] || exit 17
cp "$TEST_ROOT/docker-ready" "$TEST_ROOT/bin/docker"
chmod 755 "$TEST_ROOT/bin/docker"
echo setup >"$TEST_ROOT/setup-ran"
`);
  fixture('bin/curl',`#!/bin/bash
set -eu
url='';out=''
while [[ $# -gt 0 ]]; do
  [[ "$1" != https://* ]] || url="$1"
  if [[ "$1" == -o ]]; then out="$2";shift;fi
  shift
done
printf '%s\n' "$url" >>"$TEST_ROOT/downloads"
if [[ "$url" == https://get.docker.com ]]; then cp "$TEST_ROOT/docker-setup" "$out";
else cp "$TEST_ROOT/\${url##*/}" "$out";fi
`);
  const run=(uid='0',mode='',args=[])=>spawnSync('/bin/bash',[path.join(root,'install.sh'),...args],{
    env:{...process.env,PATH:bin,TEST_ROOT:root,TEST_UID:uid,TEST_DOCKER_MODE:mode},encoding:'utf8',timeout:10000});
  const reset=()=>{for(const n of ['bin/docker','setup-ran','bundled','downloads'])fs.rmSync(path.join(root,n),{force:true});};
  let r=run('1000');assert.notEqual(r.status,0);assert.match(r.stderr,/root/);assert.ok(!fs.existsSync(path.join(root,'downloads')));
  reset();r=run();assert.equal(r.status,0,r.stderr);assert.ok(fs.existsSync(path.join(root,'setup-ran')));assert.ok(fs.existsSync(path.join(root,'bundled')));
  assert.equal(fs.readFileSync(path.join(root,'downloads'),'utf8').split('\n')[0],'https://get.docker.com');
  reset();fs.copyFileSync(path.join(root,'docker-ready'),path.join(bin,'docker'));r=run('1000');assert.equal(r.status,0,r.stderr);assert.ok(!fs.existsSync(path.join(root,'setup-ran')));
  for(const [mode,message] of [['compose-fail',/Compose v2/],['daemon-fail',/демон недоступен/]]){
    reset();fs.copyFileSync(path.join(root,'docker-ready'),path.join(bin,'docker'));r=run('0',mode,[sha]);assert.notEqual(r.status,0);assert.match(r.stderr,message);assert.ok(!fs.existsSync(path.join(root,'bundled')));
  }
  reset();r=run('0','install-fail');assert.notEqual(r.status,0);assert.ok(!fs.existsSync(path.join(root,'bundled')));
  reset();r=run('0','',['invalid']);assert.notEqual(r.status,0);assert.ok(!fs.existsSync(path.join(root,'downloads')));
  reset();r=run('0','',[sha]);assert.equal(r.status,0,r.stderr);assert.ok(fs.existsSync(path.join(root,'setup-ran')));
  console.log('Docker bootstrap: missing Docker, root requirement, existing Docker preservation, Compose/daemon failures, failed installation, invalid SHA and explicit SHA passed.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
