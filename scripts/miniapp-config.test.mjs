import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
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
      packages: [{ id: 'pkg', customerId: 'c', customerCargoCode: 'ACME/S123', trackingNumber: 'TRACK123', currentBranchId: 'pickup-custom', readyAt: '2026-10-01T12:00:00Z', cost: 12, costUSD: 12, weightKg: 1, status: 'READY_FOR_PICKUP', createdAt: '2026-10-01T00:00:00Z' }],
    };
    let bulkRequest;
    let failBulk = false;
    await page.route('**/api/**', route => {
      if (route.request().url().endsWith('/history')) return route.fulfill({ json: { package: data.packages[0], branches: data.branches, trips: [{ id: 'trip-test', tripCode: 'TEST-TRIP' }], events: [{ id: 'move', createdAt: '2026-10-02T10:00:00Z', action: 'UPDATE', changes: [{ field: 'status', before: 'IN_TRANSIT', after: 'READY_FOR_PICKUP' }, { field: 'tripId', before: null, after: 'trip-test' }, { field: 'currentBranchId', before: null, after: 'pickup-custom' }] }] } });
      if (route.request().url().endsWith('/packages/bulk')) {
        bulkRequest = route.request().postDataJSON();
        if (failBulk) return route.fulfill({ status: 500, json: { error: 'Ошибка сохранения' } });
        return route.fulfill({ json: { success: true, createdCount: 2, skippedCount: 1, skippedTrackingNumbers: ['BULK1'], packages: ['BULK1', 'BULK2'].map((trackingNumber, i) => ({ id: `bulk-${i}`, trackingNumber, customerCargoCode: customer.cargoCode, status: 'PRE_REGISTERED', weightKg: 0, cost: 0 })) } });
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
    failBulk = true;
    await page.locator('#client-tracks').fill('FAILTRACK');
    await page.getByRole('button', { name: 'Добавить посылки (1)', exact: true }).click();
    await page.getByRole('alert').getByText('Ошибка сохранения', { exact: true }).waitFor();
    assert.equal(await page.locator('#client-tracks').inputValue(), 'FAILTRACK');
    assert.deepEqual(pageErrors, []);
    await page.evaluate(() => localStorage.setItem('cargona_auth_user', JSON.stringify({ id: 'owner', name: 'Owner', email: 'owner@example.test', role: 'OWNER', organizationSlug: 'acme' })));
    await page.goto(`http://127.0.0.1:${server.address().port}/o/acme/packages`);
    await page.getByRole('button', { name: 'TRACK123', exact: true }).filter({ visible: true }).click();
    await page.getByText('История посылки TRACK123', { exact: true }).waitFor();
    await page.getByText('Статус: В пути → Готова к выдаче', { exact: true }).waitFor();
    await page.getByText('Рейс: Не указан → TEST-TRIP', { exact: true }).waitFor();
    await page.getByText('ПВЗ / склад: Не указан → Configured pickup', { exact: true }).waitFor();
    assert.deepEqual(pageErrors, []);
    await page.close();
  }
  console.log('Mini App configuration checks passed: custom tenant, zero settings, warehouse, payment details');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
