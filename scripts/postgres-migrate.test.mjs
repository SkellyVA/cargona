// Real Linux Docker integration: isolated synthetic Compose project only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const image = process.env.REHEARSAL_API_IMAGE;
assert.ok(image, 'REHEARSAL_API_IMAGE required');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cargona-migrate-'));
const project = path.basename(root).toLowerCase();
function command(exe, args, input = '', timeout = 30000) {
  const r = spawnSync(exe, args, {cwd:root, input, encoding:'utf8', timeout});
  assert.ifError(r.error);
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
const dc = (...args) => command('docker', ['compose', '-p', project, ...args]);
try {
  for (const name of ['postgres-migrate.sh', 'release.sh', 'rehearse.sh'])
    fs.copyFileSync(name, path.join(root, name));
  fs.mkdirSync(path.join(root, 'data/backend'), {recursive:true});
  const document = {tenants:[],users:[],customers:[{id:'customer',balance:-18.25}],
    packages:[{id:'package',weightPending:true,weightKg:0,cost:0}], futureField:{kept:true}};
  fs.writeFileSync(path.join(root, 'data/backend/cargona-store.json'), JSON.stringify(document));
  fs.writeFileSync(path.join(root, '.env'), 'STORAGE_BACKEND=json\n');
  const idle = {image,entrypoint:['node','-e','setInterval(()=>{},1000)'],networks:['isolated']};
  fs.writeFileSync(path.join(root, 'docker-compose.yml'), JSON.stringify({name:project,
    services:{postgres:{image:'postgres:16-alpine',environment:{POSTGRES_USER:'cargona',
      POSTGRES_PASSWORD:'synthetic_password',POSTGRES_DB:'cargona'},networks:['isolated']},
    backend:{image,environment:{DATA_DIR:'/app/data',STORAGE_BACKEND:'${STORAGE_BACKEND}',
      DATABASE_URL:'postgres://cargona:synthetic_password@postgres:5432/cargona',APP_DOMAIN:'rehearsal.invalid'},
      volumes:['./data/backend:/app/data'],networks:['isolated']},
    frontend:idle,bot:idle,caddy:idle},networks:{isolated:{internal:true}}}));
  dc('up','-d','postgres');
  let ready = false;
  for (let i=0;i<60;i++) {
    const r=spawnSync('docker',['compose','-p',project,'exec','-T','postgres','pg_isready','-h','127.0.0.1','-U','cargona','-d','cargona'],{cwd:root,encoding:'utf8'});
    if(r.status===0){ready=true;break;}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(ready);
  dc('up','-d','backend','frontend','bot','caddy');
  command('bash',['-c',`for n in {1..60}; do docker compose -p "$1" exec -T backend node -e 'fetch("http://127.0.0.1:4000/health/ready").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1 && exit 0; sleep 1; done; exit 1`,'test',project],'',90000);
  const migrate = (action,input='') => command('bash',[path.join(root,'postgres-migrate.sh'),action],input,360000);
  assert.ok(migrate('status').includes('json'));
  migrate('trial');
  assert.ok(migrate('status').includes('json'));
  assert.ok(migrate('apply','MIGRATE\n').includes('Migration complete'));
  assert.ok(migrate('status').includes('postgres'));
  const reportDir = fs.readdirSync(path.join(root,'data/releases')).find(name=>name.startsWith('migration-') && fs.existsSync(path.join(root,'data/releases',name,'roundtrip.json')));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/releases',reportDir,'roundtrip.json'))),document);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/backend/cargona-store.json'))),document);
  const mode=dc('exec','-T','backend','node','-e','console.log(process.env.STORAGE_BACKEND)');
  assert.equal(mode.trim(),'postgres');
  const retry=spawnSync('bash',[path.join(root,'postgres-migrate.sh'),'apply'],{cwd:root,input:'MIGRATE\n',encoding:'utf8'});
  assert.notEqual(retry.status,0,'A second import must be refused');
  console.log('JSON → PostgreSQL: trial, verified backup, isolated rehearsal, export equality, API restart and repeat refusal passed.');
} finally {
  spawnSync('docker',['compose','-p',project,'down','-v','--remove-orphans'],{cwd:root,encoding:'utf8',timeout:30000});
  fs.rmSync(root,{recursive:true,force:true});
}
