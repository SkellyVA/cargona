import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source = await readFile(new URL('../apps/web/src/stores/useCargoStore.ts', import.meta.url), 'utf8');
const start = source.indexOf('  async function addBranch(');
const end = source.indexOf('  function deleteBranch(', start);
assert.ok(start >= 0 && end > start);
const requests = [];
let failCreate = false;
let missing = false;
let refreshed = 0;
const context = {
  activeTenantSlug: { value: 'noor' }, rawBranches: { value: [] }, safeStorageSet() {}, addAudit() {},
  syncTenantData: async () => { refreshed++; },
  fetch: async (url, options) => {
    requests.push({ url, options });
    if (options.method === 'POST') return new Response(JSON.stringify(failCreate ? { error: 'Creation failed' } : { success: true, branch: { id: 'branch-100', name: 'Test', cashBalance: 0, cells: [] } }), { status: failCreate ? 500 : 200 });
    return new Response(JSON.stringify(missing ? { error: 'Branch not found' } : { success: true }), { status: missing ? 404 : 200 });
  },
};
vm.createContext(context);
vm.runInContext(ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const branch = await context.addBranch({ name: 'Test', city: 'City' });
assert.equal(branch.id, 'branch-100');
assert.equal(context.rawBranches.value[0].id, 'branch-100');
await context.updateBranch(branch.id, { name: 'Updated' });
assert.equal(requests.at(-1).url, '/api/o/noor/branches/branch-100');
assert.equal(branch.name, 'Updated');
failCreate = true;
await assert.rejects(context.addBranch({ name: 'Failed' }), /Creation failed/);
assert.equal(context.rawBranches.value.length, 1);
missing = true;
await assert.rejects(context.updateBranch(branch.id, { name: 'Bad' }), /Список обновлён/);
assert.equal(refreshed, 1);
assert.equal(branch.name, 'Updated');
console.log('Branch creation checks passed: server IDs, immediate editing, failure handling, stale list refresh');
