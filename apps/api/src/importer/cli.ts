#!/usr/bin/env node
/**
 * CargonaOS Universal Migration CLI
 * Usage:
 *   npx tsx apps/api/src/importer/cli.ts --mongo "mongodb://..." --tenant "cargona" [--dry-run]
 *   npx tsx apps/api/src/importer/cli.ts --dir "./dumps" --tenant "cargona" [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { runSmartMigration } from './migrationEngine.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mongo' && args[i + 1]) {
      options.mongo = args[++i];
    } else if (arg === '--db' && args[i + 1]) {
      options.db = args[++i];
    } else if (arg === '--dir' && args[i + 1]) {
      options.dir = args[++i];
    } else if (arg === '--tenant' && args[i + 1]) {
      options.tenant = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

async function main() {
  const opts = parseArgs();

  if (opts.help || (!opts.mongo && !opts.dir)) {
    console.log(`
===========================================================
  CargonaOS — Universal Smart Migration & Importer CLI
===========================================================

Команды:
  --mongo <URI>     Строка подключения MongoDB (например: mongodb://localhost:27017/cargodb)
  --db <name>       Имя базы данных MongoDB (необязательно, если указано в URI)
  --dir <path>      Путь к директории с файлами JSON/JSONL экспортов
  --tenant <slug>   Slug карго-компании в CargonaOS (например: cargona, noor, mir)
  --dry-run         Тестовый прогон без записи в БД (показывает статистику и структуру)

Примеры:
  # 1. Проверить миграцию из MongoDB (Dry Run):
  npx tsx apps/api/src/importer/cli.ts --mongo "mongodb+srv://..." --tenant cargona --dry-run

  # 2. Выполнить импорт из MongoDB:
  npx tsx apps/api/src/importer/cli.ts --mongo "mongodb+srv://..." --tenant cargona

  # 3. Выполнить импорт из папки с JSON файлами:
  npx tsx apps/api/src/importer/cli.ts --dir ./dumps --tenant cargona
`);
    process.exit(0);
  }

  const tenantSlug = opts.tenant || 'cargona';
  const dryRun = !!opts.dryRun;

  console.log('\n🚀 [CargonaOS Importer] Запуск умной миграции...');
  console.log(`   Тенант: ${tenantSlug}`);
  console.log(`   Режим: ${dryRun ? '🔍 DRY RUN (Предпросмотр без записи)' : '💾 РЕАЛЬНАЯ ЗАПИСЬ В БАЗУ'}`);

  let source: any;

  if (opts.mongo) {
    console.log(`   Источник: MongoDB (${opts.mongo.replace(/\/\/.*@/, '//<auth>@')})`);
    source = {
      type: 'mongo',
      mongoUri: opts.mongo,
      dbName: opts.db,
    };
  } else if (opts.dir) {
    console.log(`   Источник: Директория с JSON файлами (${opts.dir})`);
    const resolvedDir = path.resolve(process.cwd(), opts.dir);
    if (!fs.existsSync(resolvedDir)) {
      console.error(`❌ Ошибка: Директория '${resolvedDir}' не найдена!`);
      process.exit(1);
    }

    const files = fs.readdirSync(resolvedDir);
    const jsonCollections: Record<string, any[]> = {};

    for (const f of files) {
      if (f.endsWith('.json') || f.endsWith('.jsonl')) {
        const colName = path.basename(f, path.extname(f));
        const fullPath = path.join(resolvedDir, f);
        const content = fs.readFileSync(fullPath, 'utf8').trim();

        if (f.endsWith('.jsonl') || content.startsWith('{')) {
          // Parse lines
          const lines = content.split('\n').filter((l) => l.trim().length > 0);
          jsonCollections[colName] = lines.map((l) => JSON.parse(l));
        } else {
          jsonCollections[colName] = JSON.parse(content);
        }
      }
    }
    source = {
      type: 'json',
      jsonCollections,
    };
  }

  try {
    const result = await runSmartMigration(source, {
      tenantSlug,
      dryRun,
    });

    console.log('\n================ РЕЗУЛЬТАТ АНАЛИЗА И МИГРАЦИИ ================');
    console.log('\n📁 Распознанные коллекции:');
    for (const col of result.analyzedCollections) {
      console.log(`   • ${col.name.padEnd(20)} -> Тип: [${col.type}] (Образцов: ${col.sampleCount})`);
    }

    console.log('\n📊 Статистика сущностей:');
    console.log(`   👤 Клиенты:          ${result.stats.importedCustomersCount.toLocaleString()}`);
    console.log(`   📦 Посылки (треки):  ${result.stats.importedPackagesCount.toLocaleString()}`);
    console.log(`   🔗 Связи из заказов: ${result.stats.totalOrdersFound.toLocaleString()}`);
    console.log(`   🚚 Рейсы/Партии:     ${result.stats.importedTripsCount.toLocaleString()}`);
    console.log(`   ⚠️ Непривязанных:   ${result.stats.unassignedPackagesCount.toLocaleString()}`);

    console.log('\n🏷️ Распределение статусов посылок:');
    for (const [status, count] of Object.entries(result.stats.statusBreakdown)) {
      if (count > 0) {
        console.log(`   • ${status.padEnd(20)}: ${count.toLocaleString()} шт.`);
      }
    }

    if (result.sampleCustomers.length > 0) {
      console.log('\n👤 Образцы клиентов (первые 3):');
      for (const c of result.sampleCustomers.slice(0, 3)) {
        console.log(`   [${c.cargoCode}] ${c.fullName} | Телефон: ${c.phone || '—'} | TG ID: ${c.telegramId || '—'}`);
      }
    }

    if (result.samplePackages.length > 0) {
      console.log('\n📦 Образцы посылок (первые 3):');
      for (const p of result.samplePackages.slice(0, 3)) {
        console.log(`   [${p.trackingNumber}] -> Клиент: ${p.customerCargoCode || 'Не привязан'} | Статус: ${p.status} | Вес: ${p.weightKg} кг`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Предупреждения:');
      for (const w of result.warnings) {
        console.log(`   - ${w}`);
      }
    }

    if (dryRun) {
      console.log('\n✨ [DRY RUN ЗАВЕРШЕН] Данные проверены и готовы к загрузке. Запустите без флага --dry-run для записи в БД.\n');
    } else {
      console.log('\n🎉 [МИГРАЦИЯ УСПЕШНО ВЫПОЛНЕНА] Все данные сохранены в базу CargonaOS!\n');
    }
  } catch (err: any) {
    console.error('\n❌ Ошибка миграции:', err.message || err);
    process.exit(1);
  }
}

main();
