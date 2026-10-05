import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=pathname.includes('.')?pathname:'/index.html';
  try {res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(path.resolve('apps/web/dist'),file)));}
  catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHANNEL==='bundled'?{}:{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),headless:true});
  const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  await page.addInitScript(()=>{window.Telegram={WebApp:{initData:'signed-test',initDataUnsafe:{user:{id:124,first_name:'Test'}},ready(){},expand(){}}};});
  await page.route('https://telegram.org/**',route=>route.abort());
  const customer={id:'manual',cargoCode:'NOOR/S2256',fullName:'Manual client',phone:'+992900011234',telegramUserId:124};
  let logged=false,bootstrapCount=0;
  const data={tenant:{id:'t',slug:'noor',name:'NOOR',codePrefix:'NOOR/S'},settings:{companyName:'NOOR',codePrefix:'NOOR/S',loyaltySettings:{enabled:true,isModuleAllowed:true,clubName:'NOOR CLUB',requiredActiveReferralsForSpecialRate:4}},branches:[],packages:[],customers:[]};
  data.branches=[{id:'b',name:'Pickup',city:'Test'}];
  data.originWarehouses=[{id:'w',name:'Warehouse',city:'Test',country:'China',isActive:true}];
  data.warehouses=data.originWarehouses;
  await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/api/o/noor/customers'&&request.method()==='POST'){
      assert.equal(request.headers()['x-telegram-init-data'],'signed-test');
      assert.equal(request.postDataJSON().invitedByCustomerId,'NOOR/S7');
      logged=true;return route.fulfill({json:{success:true,customer}});
    }
    if(url.pathname==='/api/app/noor/auth/login'){
      assert.equal(request.headers()['x-telegram-init-data'],'signed-test');
      assert.equal(request.postDataJSON().cargoCode,'2256');
      if(request.postDataJSON().phoneLast4!=='1234')return route.fulfill({status:401,json:{error:'Cargo ID или последние 4 цифры телефона неверны'}});
      logged=true;return route.fulfill({json:{success:true,customer}});
    }
    if(url.pathname==='/api/app/noor/bootstrap'){
      assert.equal(request.headers()['x-telegram-init-data'],'signed-test');bootstrapCount++;
      return route.fulfill({json:{...data,customer:logged?customer:null,customers:logged?[customer]:[],referralStats:logged?{cargoCode:customer.cargoCode,total:1,active:0}:null}});
    }
    return route.fulfill({json:{...data,customer:logged?customer:null}});
  });
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/app/noor?ref=NOOR%2FS7`);
  await page.waitForFunction(()=>sessionStorage.getItem('cargona_pending_referral_noor')==='NOOR/S7');
  await page.goto(`${base}/app/noor`);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('cargona_pending_referral_noor')),'NOOR/S7');
  await page.getByRole('button',{name:'Вход по Cargo ID',exact:true}).click();
  await page.getByPlaceholder('Например: CRG-001 или 001').fill('2256');
  await page.getByRole('button',{name:/Продолжить/}).click();
  const phone=page.getByPlaceholder('••••',{exact:true});
  await phone.fill('0000');
  await page.getByRole('button',{name:'Войти в аккаунт',exact:true}).click();
  await page.getByText('Cargo ID или последние 4 цифры телефона неверны',{exact:true}).waitFor();
  assert.equal(await phone.inputValue(),'0000');
  const before=bootstrapCount;
  await phone.fill('1234');
  await page.getByRole('button',{name:'Войти в аккаунт',exact:true}).click();
  await page.locator('[aria-label="Приглашённые друзья"]').getByText('1 чел.',{exact:true}).waitFor();
  assert.ok(bootstrapCount>before,'Successful login must refresh authoritative club statistics');
  await page.reload();
  await page.locator('[aria-label="Приглашённые друзья"]').getByText('1 чел.',{exact:true}).waitFor();
  logged=false;
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto(`${base}/app/noor?ref=NOOR%2FS7`);
  await page.getByPlaceholder('Алишер Валиев').fill('New friend');
  await page.locator('input[type="tel"]').fill('900011234');
  const beforeRegistration=bootstrapCount;
  await page.getByRole('button',{name:'Получить карго-код и адрес склада',exact:true}).click();
  await page.locator('[aria-label="Приглашённые друзья"]').getByText('1 чел.',{exact:true}).waitFor();
  assert.ok(bootstrapCount>beforeRegistration,'Registration must reload server club data');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('cargona_pending_referral_noor')),null);
  console.log('Cargo ID browser login, server errors, signed alias routes, club refresh and pending invitation persistence passed.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
