import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source = await readFile(new URL('../apps/web/src/stores/useCargoStore.ts', import.meta.url), 'utf8');
const start = source.indexOf('  function deliveryRatesForBranch(');
const end = source.indexOf('  const deliveryRates = computed', start);
assert.ok(start >= 0 && end > start);
const context = {
  branches: { value: [{ id: 'a', deliveryTariffs: { autoRatePerKgUSD: 4, airRatePerKgUSD: 0, minPackageCostUSD: 3 } }, { id: 'b', deliveryTariffs: { autoRatePerKgUSD: null } }] },
  settings: { value: { autoDeliveryRatePerKgUSD: 2, airDeliveryRatePerKgUSD: 5, minPackageCostUSD: 1, freeStorageDays: 3 } },
  ratesToUSD: { value: { USD: 1, TJS: 10 } }, activeCurrency: { value: 'USD' },
};
vm.createContext(context);
vm.runInContext(ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
assert.equal(context.deliveryRatesForBranch('a').autoRatePerKg, 4);
assert.equal(context.deliveryRatesForBranch('a').airRatePerKg, 0);
assert.equal(context.deliveryRatesForBranch('a').minPackageCost, 3);
assert.equal(context.deliveryRatesForBranch('b').autoRatePerKg, 2);
assert.equal(context.deliveryRatesForBranch('missing').autoRatePerKg, 2);
context.activeCurrency.value = 'TJS';
assert.equal(context.deliveryRatesForBranch('a').autoRatePerKg, 40);
assert.equal(context.deliveryRatesForBranch('b').airRatePerKg, 50);
console.log('Branch tariff checks passed: distinct rates, zero, fallback, currency conversion');
