import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIR = path.resolve(process.cwd(), 'presentation');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const BASE_URL = 'https://cargona.akii.world';

async function run() {
  console.log('🚀 Starting Cargona (CRG) presentation screenshot capture...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  // 1. Desktop Context (1440x900 @2x Retina)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
  });

  const page = await desktopContext.newPage();

  // Seed demo presentation state for Cargona with CRG prefixes
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() => {
    const demoTenant = {
      id: 'tenant-001',
      name: 'Cargona',
      slug: 'cargona',
      codePrefix: 'CRG',
      ownerEmail: 'owner@cargona.com',
      ownerPassword: 'password123',
      baseCurrency: 'USD',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const demoBranches = [
      { id: 'b-1', tenantSlug: 'cargona', name: 'ПВЗ Cargona Душанбе Центр (Рудаки)', city: 'Душанбе', address: 'пр. Рудаки 104', phone: '+992 90 123 4567', cashBalanceUSD: 3420, isActive: true, cells: [
        { id: 'c-1', rack: 'Сектор A', shelf: 'Полка A-01', barcode: 'CELL-A-01', packageCount: 42 },
        { id: 'c-2', rack: 'Сектор A', shelf: 'Полка A-02', barcode: 'CELL-A-02', packageCount: 28 },
        { id: 'c-3', rack: 'Сектор B', shelf: 'Крупногабарит B-1', barcode: 'CELL-B-01', packageCount: 15 },
      ]},
      { id: 'b-2', tenantSlug: 'cargona', name: 'ПВЗ Cargona Худжанд Центр', city: 'Худжанд', address: 'ул. Ленина 45', phone: '+992 92 888 7766', cashBalanceUSD: 1850, isActive: true, cells: [] },
      { id: 'b-3', tenantSlug: 'cargona', name: 'ПВЗ Cargona Бохтар Самандар', city: 'Бохтар', address: 'ул. Борбад 12', phone: '+992 91 555 4433', cashBalanceUSD: 940, isActive: true, cells: [] },
    ];

    const demoWarehouses = [
      { id: 'wh-cn', tenantSlug: 'cargona', name: 'Центральный склад Cargona в Иу (Китай)', country: 'Китай', countryCode: 'CN', city: 'Иу (Yiwu)', address: '浙江省金华市义乌市稠江街道北苑工业区288号 (Cargona Hub)', phone: '+86 138 5798 8888', receiverName: 'CRG Warehouse Yiwu', zipCode: '322000', instructions: 'Для интернет-заказов с 1688, Taobao, Pinduoduo', isActive: true, cells: [
        { id: 'whc-1', rack: 'Сектор A', shelf: 'Паллет CN-01', barcode: 'CELL-CN-A01', packageCount: 150 },
        { id: 'whc-2', rack: 'Сектор B', shelf: 'Паллет CN-02', barcode: 'CELL-CN-B01', packageCount: 85 },
      ]},
      { id: 'wh-tr', tenantSlug: 'cargona', name: 'Склад Cargona Стамбул (Турция)', country: 'Турция', countryCode: 'TR', city: 'Стамбул (Güngören)', address: 'Mehmet Nezih Özmen Mh., Kasım Sk. No:14, Güngören/İstanbul', phone: '+90 532 000 9988', receiverName: 'CRG Istanbul HUB', zipCode: '34173', instructions: 'Для покупок с Trendyol, Zara, H&M, LC Waikiki', isActive: true, cells: [] },
      { id: 'wh-ae', tenantSlug: 'cargona', name: 'Склад Cargona Дубай (ОАЭ)', country: 'ОАЭ', countryCode: 'AE', city: 'Дубай (Deira)', address: 'Al Sabkha Road, Deira, Dubai, UAE', phone: '+971 50 123 4567', receiverName: 'CRG Dubai Express', zipCode: '00000', instructions: 'Для техники Apple, электроники и парфюмерии', isActive: true, cells: [] },
    ];

    const demoCustomers = [
      { id: 'cust-001', tenantSlug: 'cargona', cargoCode: 'CRG-001', fullName: 'Алишер Каримов', phone: '+992 90 111 2233', telegramUsername: '@alisher_k', balanceUSD: 140, isBlocked: false, preferredBranchId: 'b-1' },
      { id: 'cust-002', tenantSlug: 'cargona', cargoCode: 'CRG-002', fullName: 'Мадина Саидова', phone: '+992 92 333 4455', telegramUsername: '@madina_shop', balanceUSD: -25.5, isBlocked: false, preferredBranchId: 'b-1' },
      { id: 'cust-003', tenantSlug: 'cargona', cargoCode: 'CRG-003', fullName: 'Рустам Собиров', phone: '+992 91 777 8899', telegramUsername: '@rustam_auto', balanceUSD: 450, isBlocked: false, preferredBranchId: 'b-2' },
      { id: 'cust-004', tenantSlug: 'cargona', cargoCode: 'CRG-004', fullName: 'Фарход Назаров', phone: '+992 93 444 5566', telegramUsername: '@farhod_dushanbe', balanceUSD: 0, isBlocked: false, preferredBranchId: 'b-1' },
      { id: 'cust-005', tenantSlug: 'cargona', cargoCode: 'CRG-005', fullName: 'Зарина Олимова', phone: '+992 98 666 7788', telegramUsername: '@zarina_style', balanceUSD: 85, isBlocked: false, preferredBranchId: 'b-3' },
    ];

    const demoTrips = [
      { id: 'trip-001', tenantSlug: 'cargona', tripCode: 'TRIP-CRG-882', route: 'Иу (Китай) → Душанбе (Центр)', type: 'AUTO', vehiclePlate: '01 777 TJ / DAF XF', driverName: 'Искандар Рахимов (тел: +992 90 999 1122)', status: 'IN_TRANSIT', totalWeightKg: 18450, totalVolumeM3: 84.5, sackCount: 240, departureDate: '21.09.2026', etaDate: '28.09.2026', manifestItems: [
        { id: 'm-001', sackNumber: 'SACK-CN-001', category: 'Одежда и текстиль', weightKg: 85, volumeM3: 0.45, packageCount: 38, sealNumber: 'PL-4821', description: 'Сборный текстиль 1688' },
        { id: 'm-002', sackNumber: 'SACK-CN-002', category: 'Обувь и аксессуары', weightKg: 64, volumeM3: 0.38, packageCount: 24, sealNumber: 'PL-4822', description: 'Кроссовки и сумки Taobao' },
        { id: 'm-003', sackNumber: 'SACK-CN-003', category: 'Электроника и гаджеты', weightKg: 42, volumeM3: 0.22, packageCount: 65, sealNumber: 'PL-4823', description: 'Чехлы, наушники, зарядные блоки' },
      ]},
      { id: 'trip-002', tenantSlug: 'cargona', tripCode: 'TRIP-CRG-881', route: 'Гуанчжоу → Душанбе (Авиа)', type: 'AIR', vehiclePlate: 'Рейс SZ-412 (FlyDubai Cargo)', driverName: 'Авиа-фрахт', status: 'CUSTOMS', totalWeightKg: 2450, totalVolumeM3: 12.0, sackCount: 45, departureDate: '22.09.2026', etaDate: '24.09.2026', manifestItems: [] },
      { id: 'trip-003', tenantSlug: 'cargona', tripCode: 'TRIP-CRG-880', route: 'Иу → Худжанд', type: 'AUTO', vehiclePlate: '02 444 TJ / Volvo FH', driverName: 'Бахтиёр Самадов', status: 'ARRIVED', totalWeightKg: 14200, totalVolumeM3: 72.0, sackCount: 195, departureDate: '14.09.2026', etaDate: '21.09.2026', manifestItems: [] },
    ];

    const demoPackages = [
      { id: 'pkg-001', tenantSlug: 'cargona', trackingNumber: 'YT849201948201', customerCargoCode: 'CRG-001', description: 'Одежда детская и игрушки (1688)', weightKg: 4.8, costUSD: 13.44, lengthCm: 40, widthCm: 30, heightCm: 25, volumeM3: 0.03, shelfLocation: 'Полка A-01', branchId: 'b-1', status: 'READY_FOR_PICKUP', createdAt: '22.09.2026', tripId: 'trip-003' },
      { id: 'pkg-002', tenantSlug: 'cargona', trackingNumber: 'SF948201482019', customerCargoCode: 'CRG-001', description: 'Кроссовки Nike Air (Taobao)', weightKg: 2.1, costUSD: 5.88, lengthCm: 35, widthCm: 25, heightCm: 15, volumeM3: 0.013, shelfLocation: 'Полка A-01', branchId: 'b-1', status: 'READY_FOR_PICKUP', createdAt: '22.09.2026', tripId: 'trip-003' },
      { id: 'pkg-003', tenantSlug: 'cargona', trackingNumber: 'JT391820492810', customerCargoCode: 'CRG-002', description: 'Косметика и уходовые средства', weightKg: 1.5, costUSD: 4.20, lengthCm: 20, widthCm: 15, heightCm: 10, volumeM3: 0.003, shelfLocation: 'Полка A-02', branchId: 'b-1', status: 'READY_FOR_PICKUP', createdAt: '22.09.2026', tripId: 'trip-003' },
      { id: 'pkg-004', tenantSlug: 'cargona', trackingNumber: 'DP820194820194', customerCargoCode: 'CRG-003', description: 'Автозапчасти для Toyota Camry', weightKg: 18.5, costUSD: 51.80, lengthCm: 80, widthCm: 50, heightCm: 30, volumeM3: 0.12, shelfLocation: '', branchId: 'b-2', status: 'IN_TRANSIT', createdAt: '21.09.2026', tripId: 'trip-001' },
      { id: 'pkg-005', tenantSlug: 'cargona', trackingNumber: 'ST748201948201', customerCargoCode: 'CRG-004', description: 'Чехлы и защитные стекла (Pinduoduo)', weightKg: 3.2, costUSD: 8.96, lengthCm: 30, widthCm: 20, heightCm: 15, volumeM3: 0.009, shelfLocation: 'Паллет CN-01', branchId: 'wh-cn', status: 'RECEIVED_AT_ORIGIN', createdAt: '23.09.2026' },
      { id: 'pkg-006', tenantSlug: 'cargona', trackingNumber: 'TR948201948201', customerCargoCode: 'CRG-005', description: 'Одежда из Турции (Trendyol)', weightKg: 6.4, costUSD: 28.80, lengthCm: 45, widthCm: 35, heightCm: 20, volumeM3: 0.031, shelfLocation: '', branchId: 'b-3', status: 'CUSTOMS', createdAt: '22.09.2026', tripId: 'trip-002' },
    ];

    const demoStaff = [
      { id: 'emp-001', tenantSlug: 'cargona', fullName: 'Администратор Cargona', email: 'owner@cargona.com', role: 'OWNER', phone: '+992 90 000 1111', branchId: 'b-1', branchName: 'Главный офис', isActive: true },
      { id: 'emp-002', tenantSlug: 'cargona', fullName: 'Джамшед Расулов', email: 'jamshed@cargona.com', role: 'OPERATOR', phone: '+992 90 222 3344', branchId: 'b-1', branchName: 'ПВЗ Душанбе Центр', isActive: true },
      { id: 'emp-003', tenantSlug: 'cargona', fullName: 'Фарход (Склад Иу)', email: 'farhod_cn@cargona.com', role: 'SORTER', phone: '+86 138 5798 8888', branchId: 'wh-cn', branchName: 'Склад в Иу (Китай)', isActive: true },
    ];

    localStorage.setItem('cargona_tenants', JSON.stringify([demoTenant]));
    localStorage.setItem('cargona_active_tenant_slug', 'cargona');
    localStorage.setItem('cargona_branches', JSON.stringify(demoBranches));
    localStorage.setItem('cargona_warehouses', JSON.stringify(demoWarehouses));
    localStorage.setItem('cargona_customers', JSON.stringify(demoCustomers));
    localStorage.setItem('cargona_trips', JSON.stringify(demoTrips));
    localStorage.setItem('cargona_packages', JSON.stringify(demoPackages));
    localStorage.setItem('cargona_staff', JSON.stringify(demoStaff));
    localStorage.setItem('cargona_settings_cargona', JSON.stringify({
      companyName: 'Cargona',
      codePrefix: 'CRG',
      ownerEmail: 'owner@cargona.com',
      baseCurrency: 'USD',
      autoDeliveryRatePerKgUSD: 2.80,
      airDeliveryRatePerKgUSD: 5.50,
      minPackageCostUSD: 1.50,
      botUsername: 'cargona_bot',
      managerUsername: '@cargona_manager',
      channelId: '@cargona_official',
      chinaWarehouseAddress: '浙江省金华市义乌市稠江街道北苑工业区288号 (Cargona)',
      chinaContactName: 'CRG Warehouse Yiwu',
      chinaContactPhone: '+86 138 5798 8888',
    }));
    localStorage.setItem('cargona_auth_user', JSON.stringify({
      id: 'owner-001',
      name: 'Администратор Cargona',
      email: 'owner@cargona.com',
      role: 'OWNER',
      organizationSlug: 'cargona',
      organizationName: 'Cargona',
    }));
  });

  const screenshots = [];

  const captureList = [
    {
      name: '01-dashboard-overview',
      route: '/o/cargona/dashboard',
      description: 'Главный аналитический дашборд руководителя Cargona: сводные KPI, объем принятых грузов, баланс касс филиалов, активные рейсы и быстрые действия',
    },
    {
      name: '02-wms-intake-scanner',
      route: '/o/cargona/wms',
      description: 'Модуль WMS и адресного склада: высокоскоростной сканер штрихкодов, расчет веса, кубатуры, площади и плотности, назначение ячеек и полок хранения',
    },
    {
      name: '03-packages-tracking-table',
      route: '/o/cargona/packages',
      description: 'Журнал посылок и трекинг: фильтры по статусам (В пути, Готов к выдаче, На складе), быстрый поиск по трек-номерам, карго-кодам CRG и ячейкам',
    },
    {
      name: '04-trips-manifest-management',
      route: '/o/cargona/trips',
      description: 'Управление рейсами и манифестами: отслеживание авто-фур и авиа-рейсов (Китай → Таджикистан), весовые лимиты, погрузка тарных мест и пломб',
    },
    {
      name: '05-customers-crm-balances',
      route: '/o/cargona/customers',
      description: 'Клиентская база и Cargo ID: карточки клиентов с персональными кодами (CRG-001...), история балансов, Telegram-привязка и выбор ПВЗ',
    },
    {
      name: '06-branches-storage-cells',
      route: '/o/cargona/branches',
      description: 'Сеть филиалов ПВЗ и международные хабы: склады в Китае (Иу), Турции (Стамбул) и ОАЭ (Дубай), управление кассой и адресной сеткой ячеек',
    },
    {
      name: '07-finance-cash-analytics',
      route: '/o/cargona/finance',
      description: 'Финансы и аналитика доходности: учет касс всех филиалов в реальном времени, графики выручки и кнопка мгновенной инкассации',
    },
    {
      name: '08-settings-byob-bot',
      route: '/o/cargona/settings',
      description: 'Настройки компании Cargona и BYOB Telegram-бота (@cargona_bot): подключение токена, тарифные ставки за кг, международные склады отправки',
    },
    {
      name: '09-superadmin-platform-panel',
      route: '/admin',
      beforeCapture: async (pg) => {
        await pg.evaluate(() => {
          localStorage.setItem('cargona_auth_user', JSON.stringify({
            id: 'superadmin-1',
            name: 'Суперадминистратор CargonaOS',
            email: 'admin@cargona.io',
            role: 'SUPERADMIN',
            organizationSlug: 'cargona-platform',
            organizationName: 'CargonaOS Platform',
          }));
        });
      },
      description: 'Панель управления платформой CargonaOS для супер-администратора: подключение новых карго-компаний, управление тарифами SaaS и лимитами',
    },
  ];

  for (const item of captureList) {
    console.log(`📸 Capturing: ${item.name} (${item.route})...`);
    if (item.beforeCapture) {
      await item.beforeCapture(page);
    }
    await page.goto(`${BASE_URL}${item.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const filePath = path.join(OUTPUT_DIR, `${item.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    screenshots.push({
      filename: `${item.name}.png`,
      description: item.description,
      route: item.route,
      viewport: '1440x900',
    });
  }

  // 2. Mobile Context for Telegram Mini App (iPhone 15 Pro viewport: 393x852)
  console.log('📱 Capturing Telegram Mini App client screens for Cargona (CRG)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/o/cargona/app`);
  await mobilePage.evaluate(() => {
    localStorage.setItem('cargona_client_cargo_code_cargona', 'CRG-001');
    localStorage.setItem('cargona_customers', JSON.stringify([
      { id: 'cust-001', tenantSlug: 'cargona', cargoCode: 'CRG-001', fullName: 'Алишер Каримов', phone: '+992 90 111 2233', telegramUsername: '@alisher_k', balanceUSD: 140, isBlocked: false, preferredBranchId: 'b-1' }
    ]));
    localStorage.setItem('cargona_packages', JSON.stringify([
      { id: 'pkg-001', tenantSlug: 'cargona', trackingNumber: 'YT849201948201', customerCargoCode: 'CRG-001', description: 'Одежда детская и игрушки (1688)', weightKg: 4.8, costUSD: 13.44, lengthCm: 40, widthCm: 30, heightCm: 25, volumeM3: 0.03, shelfLocation: 'Полка A-01', branchId: 'b-1', status: 'READY_FOR_PICKUP', createdAt: '22.09.2026' },
      { id: 'pkg-002', tenantSlug: 'cargona', trackingNumber: 'SF948201482019', customerCargoCode: 'CRG-001', description: 'Кроссовки Nike Air (Taobao)', weightKg: 2.1, costUSD: 5.88, lengthCm: 35, widthCm: 25, heightCm: 15, volumeM3: 0.013, shelfLocation: 'Полка A-01', branchId: 'b-1', status: 'READY_FOR_PICKUP', createdAt: '22.09.2026' },
    ]));
    localStorage.setItem('cargona_tenants', JSON.stringify([
      { id: 'tenant-001', name: 'Cargona', slug: 'cargona', codePrefix: 'CRG', baseCurrency: 'USD', isActive: true }
    ]));
  });

  // Client Dashboard in MiniApp
  await mobilePage.goto(`${BASE_URL}/o/cargona/app`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  const mobile1Path = path.join(OUTPUT_DIR, '10-miniapp-client-dashboard.png');
  await mobilePage.screenshot({ path: mobile1Path });
  screenshots.push({
    filename: '10-miniapp-client-dashboard.png',
    description: 'Telegram Mini App клиента Cargona: персональный код CRG-001, баланс, готовые к выдаче посылки, адреса складов в Китае и Турции для 1688, Taobao, Trendyol',
    route: '/o/cargona/app',
    viewport: '393x852 (Mobile)',
  });

  // QR Code Modal for Warehouse Pickup
  const qrButton = mobilePage.locator('button:has-text("Показать QR-код")').first();
  if (await qrButton.isVisible()) {
    await qrButton.click();
    await mobilePage.waitForTimeout(600);
    const mobileQrPath = path.join(OUTPUT_DIR, '11-miniapp-pickup-qr-modal.png');
    await mobilePage.screenshot({ path: mobileQrPath });
    screenshots.push({
      filename: '11-miniapp-pickup-qr-modal.png',
      description: 'Telegram Mini App: персональный защищенный QR-код клиента Cargona для бесконтактной мгновенной выдачи и оплаты в ПВЗ',
      route: '/o/cargona/app (QR Modal)',
      viewport: '393x852 (Mobile)',
    });
  }

  // Registration & Apple-Style Phone picker screen
  await mobilePage.evaluate(() => {
    localStorage.removeItem('cargona_client_cargo_code_cargona');
  });
  await mobilePage.goto(`${BASE_URL}/o/cargona/app`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  const mobileRegPath = path.join(OUTPUT_DIR, '12-miniapp-registration-apple-flag.png');
  await mobilePage.screenshot({ path: mobileRegPath });
  screenshots.push({
    filename: '12-miniapp-registration-apple-flag.png',
    description: 'Telegram Mini App: форма регистрации нового клиента Cargona с Apple-style выбором кода страны/флага (+992, +998, +7, +86...) и удобного ПВЗ',
    route: '/o/cargona/app (Register)',
    viewport: '393x852 (Mobile)',
  });

  // 3. Write manifest.json
  const manifest = {
    capturedAt: new Date().toISOString(),
    url: BASE_URL,
    context: 'Скриншоты для презентации продукта Cargona (демонстрация возможностей WMS, CRM, логистики и клиентского Telegram Mini App под брендом Cargona и кодами CRG)',
    screenshotsCount: screenshots.length,
    screenshots,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // 4. Write capture-report.md
  let report = `# 📦 Cargona — Презентационный фото-отчёт продукта\n\n`;
  report += `**Цель презентации:** наглядная демонстрация экосистемы Cargona для потенциальных клиентов (карго-компаний, логистических хабов и фулфилментов).\n`;
  report += `**Бренд:** Cargona  \n`;
  report += `**Префикс кодов клиентов:** \`CRG\` (\`CRG-001\`, \`CRG-002\`...)  \n`;
  report += `**URL сервиса:** [${BASE_URL}](${BASE_URL})\n`;
  report += `**Дата создания:** ${new Date().toLocaleString('ru-RU')}\n`;
  report += `**Количество материалов:** ${screenshots.length} скриншотов высокой чёткости (@2x/@3x Retina)\n\n`;
  report += `---\n\n## 🖥 Разделы системы и скриншоты\n\n`;

  screenshots.forEach((s, idx) => {
    report += `### ${idx + 1}. ${s.description.split(':')[0]}\n`;
    report += `**Файл:** \`${s.filename}\`  \n`;
    report += `**Маршрут:** \`${s.route}\`  \n`;
    report += `**Разрешение:** \`${s.viewport}\`  \n`;
    report += `**Назначение:** ${s.description}  \n\n`;
    report += `![${s.filename}](./${s.filename})\n\n---\n\n`;
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'capture-report.md'), report, 'utf8');

  await browser.close();
  console.log(`✅ Success! ${screenshots.length} presentation screenshots saved to ${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error('❌ Capture error:', err);
  process.exit(1);
});
