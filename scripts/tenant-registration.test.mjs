import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('apps/web/dist');
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=pathname.includes('.')?pathname:'/index.html';
  try {
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
    res.end(await readFile(path.join(root,file)));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHANNEL==='bundled'?{}:{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),headless:true});
  const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  const ghost={id:'browser-only',slug:'test',name:'Ghost company',codePrefix:'TEST',isActive:true,ownerEmail:'ghost@example.test'};
  await page.addInitScript(tenant=>{
    localStorage.setItem('cargona_auth_user',JSON.stringify({id:'admin',name:'Admin',email:'admin@example.test',role:'SUPERADMIN'}));
    localStorage.setItem('cargona_tenants',JSON.stringify([tenant]));
  },ghost);
  let mode='network';
  const requests=[];
  await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/api/admin/tenants'&&request.method()==='GET')
      return route.fulfill({json:{tenants:[],maxTenantsLimit:null}});
    if(url.pathname==='/api/admin/tenants'&&request.method()==='POST'){
      requests.push(request.postDataJSON());
      if(mode==='network')return route.abort('failed');
      if(mode==='http')return route.fulfill({status:502,body:'Gateway failure'});
      if(mode==='invalid')return route.fulfill({json:{success:true}});
      return route.fulfill({json:{success:true,tenant:{id:'server-tenant-17',slug:'test',name:'Actual company',codePrefix:'TEST',ownerEmail:'owner@example.test',status:'ACTIVE'}}});
    }
    if(url.pathname==='/api/o/test/all')return route.fulfill({status:404,json:{error:'Компания не найдена'}});
    return route.fulfill({json:{}});
  });
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/admin`);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cargona_tenants')||'[]').length===0);
  assert.equal(await page.getByText('Ghost company',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Подключить карго'}).click();
  await page.getByPlaceholder('Express Cargo',{exact:true}).fill('Actual company');
  await page.getByPlaceholder('express-cargo',{exact:true}).fill('test');
  await page.getByPlaceholder('owner@express.com',{exact:true}).fill('owner@example.test');
  await page.getByPlaceholder('••••••••',{exact:true}).fill('private-synthetic-password');
  for(const failure of ['network','http','invalid']){
    mode=failure;
    await page.getByRole('button',{name:'Создать',exact:true}).click();
    await page.locator('[role="alert"]').waitFor();
    await page.waitForFunction(()=>!document.querySelector('button[disabled]')||!document.body.textContent.includes('Создание…'));
    assert.equal(await page.getByPlaceholder('express-cargo',{exact:true}).inputValue(),'test');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cargona_tenants')||'[]')),[]);
  }
  mode='success';
  await page.getByRole('button',{name:'Создать',exact:true}).click();
  await page.getByText('Компания Actual company подключена!',{exact:false}).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cargona_tenants')||'[]'));
  assert.equal(saved.length,1);
  assert.equal(saved[0].id,'server-tenant-17');
  assert.equal(saved[0].isActive,true);
  assert.ok(!JSON.stringify(saved).includes('private-synthetic-password'));
  assert.equal(requests.length,4);
  await page.goto(`${base}/o/test/packages`);
  await page.getByRole('heading',{name:'Компания не найдена',exact:true}).waitFor();
  assert.ok(await page.getByRole('link',{name:'К списку организаций'}).isVisible());
  await page.getByRole('button',{name:'Повторить загрузку'}).click();
  await page.getByRole('heading',{name:'Компания не найдена',exact:true}).waitFor();
  console.log('Tenant registration: failed requests preserve form, server-only IDs, authoritative list and visible 404 passed.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
