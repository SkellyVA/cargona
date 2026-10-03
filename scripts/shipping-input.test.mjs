import assert from 'node:assert/strict';
import { shippingInputToISO } from '../apps/web/src/utils/shippingInput.mjs';
assert.equal(shippingInputToISO('28-09-2026'), '2026-09-28');
assert.equal(shippingInputToISO(' 03-10-2026 '), '2026-10-03');
assert.equal(shippingInputToISO(''), undefined);
assert.equal(shippingInputToISO('29-02-2024'), '2024-02-29');
for (const value of ['2026-09-28', '31-02-2026', '29-02-2026', '03-13-2026']) assert.throws(() => shippingInputToISO(value));
console.log('Shipping input checks passed: DD-MM-YYYY, ISO conversion, empty/default, invalid dates');
