import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const listeners = new Map();
const deleted = [];
let claimed = false;
vm.runInNewContext(await readFile(new URL('../apps/web/public/sw.js', import.meta.url), 'utf8'), {
  self: {
    addEventListener: (name, callback) => listeners.set(name, callback),
    skipWaiting() {},
    clients: { claim: () => { claimed = true; } },
  },
  caches: {
    keys: async () => ['cargona-pwa-v3', 'unrelated-cache'],
    delete: async (key) => { deleted.push(key); return true; },
  },
});
assert.equal(listeners.has('fetch'), false, 'Network requests must pass through to the browser');
let activation;
listeners.get('activate')({ waitUntil: promise => { activation = promise; } });
await activation;
assert.deepEqual(deleted, ['cargona-pwa-v3']);
assert.equal(claimed, true);
console.log('Service worker checks passed');

