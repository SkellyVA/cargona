import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './credentials.js';

async function main() {
  if (process.argv.slice(2).join(' ') !== 'owner-reset --confirm-stopped') throw new Error('Invalid command');
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (typeof input.slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(input.slug) ||
      typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 1024 || input.password.trim() !== input.password) throw new Error('Invalid credentials');
  if ((process.env.STORAGE_BACKEND || 'json') === 'json' && !fs.existsSync(path.join(process.env.DATA_DIR || '/app/data', 'cargona-store.json'))) throw new Error('Missing store');
  const { store } = await import('./store.js');
  try {
    await store.initialize();
    const tenant = store.tenants.find(t => t.slug === input.slug);
    if (!tenant) throw new Error('Tenant not found');
    if (store.tenants.some(t => t.id !== tenant.id && t.ownerEmail?.toLowerCase() === input.email.toLowerCase()) ||
        store.users.some(u => u.email?.toLowerCase() === input.email.toLowerCase())) throw new Error('Email already used');
    tenant.ownerEmail = input.email.trim().toLowerCase();
    tenant.ownerPassword = hashPassword(input.password);
    store.sessions = store.sessions.filter(s => s.tenantId !== tenant.id);
    store.auditLogs.push({ id: store.nextId('audit', store.auditLogs), tenantId: tenant.id, entityType: 'TENANT', entityId: tenant.id,
      action: 'OWNER_CREDENTIAL_RESET', details: 'Local operator reset credentials; tenant sessions invalidated', userName: 'Local operator', userRole: 'SUPERADMIN', createdAt: new Date().toISOString() } as any);
    await store.saveToFile();
    console.log('Owner credentials updated; previous tenant sessions revoked.');
  } finally { await store.close(); }
}
main().catch(() => { console.error('Maintenance failed. Verify the tenant, unique email, password (12+ characters), storage and stopped API.'); process.exitCode = 1; });
