import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import vm from 'node:vm';
import ts from 'typescript';
import { shippingDate } from '../apps/api/src/shipping-date.ts';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { RGBLuminanceSource, HybridBinarizer, BinaryBitmap, QRCodeReader } = require('@zxing/library');

const root = path.resolve('apps/web/dist');
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname.includes('.') ? pathname : '/index.html';
  try {
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(await readFile(path.join(root, file)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const cardNumber of ['', '1234 5678 9012 3456']) {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const customer = { id: 'c', cargoCode: 'ACME/S123', fullName: 'Test Customer', phone: '123', balanceUSD: -12, balance: -12, tenantSlug: 'acme', preferredBranchId: 'pickup-custom' };
    const settings = {
      botUsername: 'AcmeTestBot', baseCurrency: 'USD', freeStorageDays: 0,
      companyName: 'ACME', codePrefix: 'ACME/S',
      paymentRequisites: { cardNumber, bankName: 'Configured Bank' },
      loyaltySettings: { enabled: true, isModuleAllowed: true, clubName: 'ACME CLUB', activeReferralMinPackages: 3, requiredActiveReferralsForSpecialRate: 4, specialRatePerKg: 7, bonusPerNextReferral: 0 },
    };
    const warehouses = [{ id: 'warehouse-custom', name: 'Warehouse', country: 'USA', countryCode: 'US', city: 'Boston', address: 'Configured street {code}', isActive: true }];
    const data = {
      settings, loyalty: settings.loyaltySettings, customer, customers: [customer],
      tenant: { id: 't', slug: 'acme', name: 'ACME', codePrefix: 'ACME/S', baseCurrency: 'USD', botUsername: 'AcmeTestBot' },
      branches: [{ id: 'pickup-custom', name: 'Configured pickup', city: 'Boston', address: 'Street' }],
      warehouses, originWarehouses: warehouses,
      packages: [{ id: 'pkg', customerId: 'c', customerCargoCode: 'ACME/S123', trackingNumber: 'TRACK123', originWarehouseId: 'warehouse-custom', shippedAt: '2026-09-28T12:00:00Z', currentBranchId: 'pickup-custom', readyAt: '2026-10-01T12:00:00Z', cost: 12, costUSD: 12, weightKg: 1, status: 'READY_FOR_PICKUP', createdAt: '2026-10-01T00:00:00Z' }],
    };
    const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
    const bulkApi = apiRequire('fastify')();
    const apiSource = await readFile(new URL('../apps/api/src/server.ts', import.meta.url), 'utf8');
    const bulkStart = apiSource.indexOf('// Bulk Package Intake');
    const bulkEnd = apiSource.indexOf('// Package movement history', bulkStart);
    const fixtureStore = { tenants: [data.tenant], customers: [{ ...customer, tenantId: 't' }], packages: data.packages, originWarehouses: warehouses.map(w => ({ ...w, tenantId: 't' })), auditLogs: [], nextId: (prefix, items) => `${prefix}-${items.length + 1}`, saveToFile() {} };
    vm.runInNewContext(ts.transpileModule(apiSource.slice(bulkStart, bulkEnd), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { fastify: bulkApi, store: fixtureStore, shippingDate });
    let bulkRequest;
    let failBulk = false;
    let savedBranchTariffs;
    let failDelete = true;
    let broadcastStarts = 0;
    let broadcastPayload;
    let linkClaims = 0;
    await page.route('**/api/**', route => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.pathname.endsWith('/telegram-link')) return route.fulfill({ json: { url: 'https://t.me/AcmeTestBot?startapp=link_test', expiresAt: new Date(Date.now() + 1800000).toISOString() } });
      if (requestUrl.pathname.endsWith('/customer/link/preview')) return route.fulfill({ json: { fullName: customer.fullName, cargoCode: customer.cargoCode } });
      if (requestUrl.pathname.endsWith('/customer/link')) {
        linkClaims++;
        return route.fulfill({ json: { success: true, cargoCode: customer.cargoCode } });
      }
      if (requestUrl.pathname.endsWith('/broadcasts/preview')) return route.fulfill({ json: { recipientCount: 2, skipped: 1 } });
      if (requestUrl.pathname.endsWith('/broadcasts/test-job')) return route.fulfill({ json: { id: 'test-job', status: 'COMPLETED', total: 2, sent: 1, failed: 1, skipped: 1, errors: [] } });
      if (requestUrl.pathname.endsWith('/broadcasts')) {
        if (route.request().method() === 'GET') return route.fulfill({ json: [] });
        broadcastStarts++;
        broadcastPayload = route.request().postDataJSON();
        return route.fulfill({ status: 202, json: { id: 'test-job', status: 'RUNNING', total: 2, sent: 0, failed: 0, skipped: 1 } });
      }
      if (route.request().method() === 'DELETE' && route.request().url().endsWith('/customers/c')) {
        if (failDelete) return route.fulfill({ status: 500, json: { error: 'Ошибка удаления' } });
        data.customers = [];
        return route.fulfill({ json: { success: true } });
      }
      if (route.request().method() === 'PUT' && route.request().url().endsWith('/branches/pickup-custom')) {
        savedBranchTariffs = route.request().postDataJSON().deliveryTariffs;
        data.branches[0].deliveryTariffs = savedBranchTariffs;
        return route.fulfill({ json: { success: true } });
      }
      if (route.request().url().endsWith('/history')) return route.fulfill({ json: { package: data.packages.find(p => p.id === 'pkg'), branches: data.branches, trips: [{ id: 'trip-test', tripCode: 'TEST-TRIP' }], events: [{ id: 'move', createdAt: '2026-10-02T10:00:00Z', action: 'UPDATE', changes: [{ field: 'status', before: 'IN_TRANSIT', after: 'READY_FOR_PICKUP' }, { field: 'tripId', before: null, after: 'trip-test' }, { field: 'currentBranchId', before: null, after: 'pickup-custom' }] }] } });
      if (route.request().url().endsWith('/packages/bulk')) {
        bulkRequest = route.request().postDataJSON();
        if (failBulk) return route.fulfill({ status: 500, json: { error: 'Ошибка сохранения' } });
        return bulkApi.inject({ method: 'POST', url: '/api/o/acme/packages/bulk', payload: bulkRequest }).then(response => route.fulfill({ status: response.statusCode, json: response.json() }));
      }
      return route.fulfill({ json: data });
    });
    await page.route('https://telegram.org/**', route => route.abort());
    await page.addInitScript(({ settings, customer }) => {
      localStorage.setItem('cargona_active_tenant_slug', 'acme');
      localStorage.setItem('cargona_active_currency', 'USD');
      localStorage.setItem('cargona_settings_acme', JSON.stringify(settings));
      localStorage.setItem('cargona_customers_acme', JSON.stringify([customer]));
      localStorage.setItem('cargona_client_cargo_code_acme', customer.cargoCode);
    }, { settings, customer });
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/app`);
    await page.getByText('Бесплатное хранение: 0 дн.').waitFor();
    const text = await page.locator('body').innerText();
    assert.ok(text.includes('ПВЗ: Configured pickup · Street'));
    assert.ok(text.includes('Прибыло в ПВЗ: 01.10.2026'));
    assert.ok(text.includes('Добавлено: 01.10.2026'));
    assert.ok(text.includes('Отправлено: 28.09.2026'));
    assert.ok(text.includes('Откуда: Boston · Warehouse'));
    assert.ok(text.includes('Куда: Boston · Configured pickup'));
    assert.ok(text.includes('+0 USD/друг'));
    assert.ok(text.includes('Минимум выданных посылок у каждого друга: 3'));
    assert.ok(text.includes('Boston'));
    assert.ok(!text.includes('State: DE') && !text.includes('~10-14') && !text.includes('~3-5'));
    await page.getByRole('button', { name: 'QR-код', exact: true }).click();
    await page.locator('canvas').waitFor();
    const pixels = await page.locator('canvas').evaluate(canvas => {
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      return { width: canvas.width, height: canvas.height, rgba: Array.from(data) };
    });
    const rgb = Int32Array.from({ length: pixels.width * pixels.height }, (_, index) =>
      (pixels.rgba[index * 4] << 16) | (pixels.rgba[index * 4 + 1] << 8) | pixels.rgba[index * 4 + 2]);
    const decoded = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(rgb, pixels.width, pixels.height)))).getText();
    const qr = new URL(decoded);
    assert.equal(qr.searchParams.get('t'), 'acme');
    assert.equal(qr.searchParams.get('c'), 'ACME/S123');
    assert.equal(qr.searchParams.get('b'), 'pickup-custom');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Оплатить/ }).click();
    const confirm = page.getByRole('button', { name: 'Подтвердить оплату' });
    if (cardNumber) {
      await page.getByText(cardNumber, { exact: true }).waitFor();
      assert.equal(await confirm.isEnabled(), true);
    } else {
      await page.getByText('Реквизиты не указаны', { exact: true }).waitFor();
      assert.equal(await confirm.isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Копировать', exact: true }).last().isDisabled(), true);
    }
    assert.deepEqual(pageErrors, []);
    await page.keyboard.press('Escape');
    await page.locator('#client-tracks').fill('BULK1\nBULK2\nBULK1');
    await page.getByRole('button', { name: 'Добавить посылки (3)', exact: true }).click();
    await page.getByText('Повторы в списке: BULK1', { exact: true }).waitFor();
    assert.deepEqual(bulkRequest.trackingNumbers, ['BULK1', 'BULK2', 'BULK1']);
    assert.equal(bulkRequest.skipExisting, true);
    assert.equal(bulkRequest.status, 'PRE_REGISTERED');
    assert.equal(await page.locator('#client-tracks').inputValue(), '');
    assert.ok((await page.locator('body').innerText()).includes('Не взвешена'));
    assert.ok((await page.locator('body').innerText()).includes('Не рассчитана'));
    failBulk = true;
    await page.locator('#client-tracks').fill('FAILTRACK');
    await page.getByRole('button', { name: 'Добавить посылки (1)', exact: true }).click();
    await page.getByRole('alert').getByText('Ошибка сохранения', { exact: true }).waitFor();
    assert.equal(await page.locator('#client-tracks').inputValue(), 'FAILTRACK');
    assert.deepEqual(pageErrors, []);
    await page.evaluate(() => localStorage.setItem('cargona_auth_user', JSON.stringify({ id: 'owner', name: 'Owner', email: 'owner@example.test', role: 'OWNER', organizationSlug: 'acme' })));
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/packages`);
    failBulk = false;
    await page.getByRole('button', { name: 'Добавить списком', exact: true }).click();
    await page.locator('#bulk-tracks').fill('ORIGIN1\nORIGIN2');
    await page.locator('#bulk-shipping-date').fill('28-09-2026');
    await page.getByRole('button', { name: 'Не указан', exact: true }).last().click();
    await page.getByRole('button', { name: 'Boston · Warehouse', exact: true }).click();
    await page.getByRole('button', { name: 'Добавить посылки', exact: true }).click();
    await page.locator('#bulk-tracks').waitFor({ state: 'hidden' });
    assert.equal(bulkRequest.originWarehouseId, 'warehouse-custom');
    assert.equal(bulkRequest.shippedAt, '2026-09-28');
    await page.getByRole('button', { name: 'ORIGIN1', exact: true }).filter({ visible: true }).waitFor();
    assert.ok(fixtureStore.packages.some(p => p.trackingNumber === 'ORIGIN1' && p.shippedAt === '2026-09-28' && p.weightPending));
    await page.reload();
    await page.getByRole('button', { name: 'ORIGIN1', exact: true }).filter({ visible: true }).waitFor();
    await page.getByRole('button', { name: 'TRACK123', exact: true }).filter({ visible: true }).click();
    await page.getByText('История посылки TRACK123', { exact: true }).waitFor();
    await page.getByText('Статус: В пути → Готова к выдаче', { exact: true }).waitFor();
    await page.getByText('Рейс: Не указан → TEST-TRIP', { exact: true }).waitFor();
    await page.getByText('ПВЗ / склад: Не указан → Configured pickup', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/branches`);
    await page.getByTitle('Редактировать филиал ПВЗ', { exact: true }).click();
    await page.locator('#tariff-autoRate').fill('4.25');
    await page.locator('#tariff-airRate').fill('0');
    await page.locator('#tariff-minimumCost').fill('');
    await page.getByRole('button', { name: /Сохранить/ }).last().click();
    await page.getByText('Филиал «Configured pickup» успешно обновлен', { exact: true }).waitFor();
    assert.deepEqual(savedBranchTariffs, { autoRatePerKgUSD: 4.25, airRatePerKgUSD: 0, minPackageCostUSD: null });
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/app`);
    await page.getByText('4.25 USD/кг', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/customers`);
    await page.getByText('Test Customer', { exact: true }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: 'Привязать Telegram', exact: true }).click();
    await page.getByText('https://t.me/AcmeTestBot?startapp=link_test', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Привязка Telegram', exact: true }).locator('..').getByRole('button').click();
    await page.getByRole('button', { name: 'Удалить клиента', exact: true }).click();
    await page.getByRole('button', { name: 'Отмена', exact: true }).last().click();
    await page.getByRole('button', { name: 'Удалить клиента', exact: true }).click();
    await page.getByRole('button', { name: 'Удалить клиента навсегда', exact: true }).click();
    await page.getByText('Ошибка удаления', { exact: true }).waitFor();
    assert.ok(await page.getByText('Карточка клиента: ACME/S123', { exact: true }).isVisible());
    failDelete = false;
    await page.getByRole('button', { name: 'Удалить клиента навсегда', exact: true }).click();
    await page.getByText('Клиент удалён', { exact: true }).waitFor();
    await page.getByText('Test Customer', { exact: true }).waitFor({ state: 'hidden' });
    assert.deepEqual(pageErrors, []);
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/settings`);
    const broadcast = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Рассылка через бота', exact: true }) });
    await broadcast.locator('#broadcast-text').fill('Test broadcast');
    await broadcast.getByRole('button', { name: 'Все клиенты', exact: true }).click();
    await broadcast.getByRole('button', { name: 'Configured pickup', exact: true }).click();
    await broadcast.getByRole('button', { name: 'Подготовить рассылку', exact: true }).click();
    await page.getByText('Получателей: 2 · Configured pickup', { exact: true }).waitFor();
    assert.equal(broadcastStarts, 0, 'Preview must not send messages');
    await page.getByRole('button', { name: 'Отправить рассылку', exact: true }).click();
    await page.getByText('Рассылка завершена', { exact: true }).waitFor();
    assert.deepEqual(broadcastPayload, { text: 'Test broadcast', branchId: 'pickup-custom' });
    assert.equal(broadcastStarts, 1);
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/app?tgWebAppStartParam=link_test`);
    await page.getByText('Привязать ваш Telegram к клиенту Test Customer (ACME/S123)?', { exact: true }).waitFor();
    assert.equal(linkClaims, 0, 'Opening a link must not bind automatically');
    await page.getByRole('button', { name: 'Это мой кабинет — привязать', exact: true }).click();
    await page.getByRole('heading', { name: 'Привязать существующий кабинет', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(linkClaims, 1);
    assert.deepEqual(pageErrors, []);
    await page.close();
    await bulkApi.close();
  }
  console.log('Mini App configuration checks passed: custom tenant, zero settings, warehouse, payment details');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
