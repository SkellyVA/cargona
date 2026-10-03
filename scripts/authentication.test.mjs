import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import * as credentials from '../apps/api/src/credentials.ts';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const app = require('fastify')();
const source = await readFile(new URL('../apps/api/src/authentication.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: name => name === 'node:crypto' ? crypto : credentials, Buffer, URL, process });
let saved;
const store = { tenants: [{ id: 't', slug: 'noor', name: 'NOOR', status: 'ACTIVE', ownerEmail: 'owner@test', ownerPassword: 'owner-pass' }],
  users: [{ id: 'u', tenantId: 't', email: 'staff@test', password: 'staff-pass', fullName: 'Staff', role: 'OPERATOR', isActive: true }],
  tenantSettings: { t: { ownerPassword: 'copy' } }, sessions: [],
  saveToFile() { credentials.protectCredentials(this); saved = JSON.stringify(this); } };
exports.registerAuthentication(app, store, { NODE_ENV: 'production', SUPERADMIN_EMAIL: 'admin@test', SUPERADMIN_PASSWORD: 'admin-pass' });
app.get('/api/admin/test', () => ({ ownerPassword: 'secret', nested: { passwordHash: 'hidden' }, customers: [] }));
app.post('/api/test', () => ({ success: true }));
app.get('/api/o/:slug/settings', () => ({ botToken: 'hidden-token', password: 'hidden' }));
app.post('/api/o/:slug/staff', request => request.body);
try {
  assert.equal((await app.inject('/api/admin/test')).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'staff@test', password: 'wrong' } })).statusCode, 401);
  const staff = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'staff@test', password: 'staff-pass' } });
  assert.equal(staff.statusCode, 200, staff.body);
  assert.ok(!staff.body.includes('staff-pass'));
  assert.ok(store.users[0].password.startsWith('scrypt$'));
  assert.ok(credentials.verifyPassword('staff-pass', store.users[0].password));
  const cookies = staff.headers['set-cookie'];
  assert.ok(cookies[0].includes('HttpOnly') && cookies[0].includes('Secure'));
  const cookie = cookies.map(item => item.split(';')[0]).join('; ');
  const csrf = cookies[1].split(';')[0].split('=')[1];
  assert.ok(!saved.includes('staff-pass') && !saved.includes('owner-pass') && !saved.includes(csrf));
  assert.equal((await app.inject({ url: '/api/admin/test', headers: { cookie } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/api/o/noor/settings', headers: { cookie } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/api/auth/session', headers: { cookie } })).statusCode, 200);
  store.sessions = JSON.parse(saved).sessions;
  assert.equal((await app.inject({ url: '/api/auth/session', headers: { cookie } })).statusCode, 200, 'Persisted sessions survive restart');
  assert.equal((await app.inject({ method: 'POST', url: '/api/test', headers: { cookie } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/test', headers: { cookie, 'x-cargona-csrf': csrf } })).statusCode, 200);
  store.users[0].password = credentials.hashPassword('new-pass');
  assert.equal((await app.inject({ url: '/api/auth/session', headers: { cookie } })).statusCode, 401, 'Password changes revoke old sessions');
  const admin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@test', password: 'admin-pass' } });
  const adminCookie = admin.headers['set-cookie'].map(item => item.split(';')[0]).join('; ');
  const adminCsrf = admin.headers['set-cookie'][1].split(';')[0].split('=')[1];
  const overview = await app.inject({ url: '/api/admin/test', headers: { cookie: adminCookie } });
  assert.equal(overview.statusCode, 200);
  assert.deepEqual(overview.json(), { nested: {}, customers: [] });
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: adminCookie, 'x-cargona-csrf': adminCsrf } })).statusCode, 200);
  assert.equal((await app.inject({ url: '/api/admin/test', headers: { cookie: adminCookie } })).statusCode, 401);
  const outsider = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: 'https://outsider.test' }, payload: { email: 'admin@test', password: 'admin-pass' } });
  assert.equal(outsider.statusCode, 403);
  const owner = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'owner@test', password: 'owner-pass' } });
  const ownerCookie = owner.headers['set-cookie'].map(item => item.split(';')[0]).join('; ');
  const ownerCsrf = owner.headers['set-cookie'][1].split(';')[0].split('=')[1];
  assert.equal((await app.inject({ url: '/api/o/noor/settings', headers: { cookie: ownerCookie } })).statusCode, 200);
  assert.equal((await app.inject({ url: '/api/o/other/settings', headers: { cookie: ownerCookie } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/api/o/noor/staff', headers: { cookie: ownerCookie, 'x-cargona-csrf': ownerCsrf }, payload: { role: 'SUPERADMIN' } })).statusCode, 400);
  const staffUpdate = await app.inject({ method: 'POST', url: '/api/o/noor/staff', headers: { cookie: ownerCookie, 'x-cargona-csrf': ownerCsrf }, payload: { role: 'OPERATOR', tenantId: 'other', id: 'victim' } });
  assert.equal(staffUpdate.statusCode, 200);
  assert.deepEqual(staffUpdate.json(), { role: 'OPERATOR' });
  const insecure = require('fastify')();
  exports.registerAuthentication(insecure, { tenants: [], users: [], sessions: [], tenantSettings: {}, saveToFile() {} }, { SUPERADMIN_EMAIL: 'admin@test', SUPERADMIN_PASSWORD: 'password123' });
  try {
    assert.equal((await insecure.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@test', password: 'password123' } })).statusCode, 401, 'Known default administrator password must never grant access');
  } finally { await insecure.close(); }
  for (let i = 0; i < 10; i++) await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'missing@test', password: 'bad' } });
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'missing@test', password: 'bad' } })).statusCode, 429);
  console.log('Authentication checks passed: passwords, hashes, sessions, CSRF, admin permissions, revocation and rate limit');
} finally { await app.close(); }
