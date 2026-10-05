import assert from 'node:assert/strict';
import {matchesSearch} from '../apps/web/src/utils/search.mjs';
const customer=['NOOR/S2256','Алишер Сёмин','+992 90 001-12-34','@alisher'];
for(const query of ['2256','noor-s2256','992900011234','+992 (90) 001 12 34','семин алишер','СЁМИН','alisher','2256 Алишер',''])
  assert.equal(matchesSearch(query,customer),true,query);
for(const query of ['2257','другой клиент','!!!','неизвестный'])assert.equal(matchesSearch(query,customer),false,query);
assert.equal(matchesSearch('2256',[null,undefined,2256]),true);
console.log('Customer search: formatted phones and Cargo IDs, reordered names, ё/е, multiple fields and missing data passed.');
