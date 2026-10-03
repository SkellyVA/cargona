import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: unknown): boolean {
  if (typeof stored !== 'string' || !stored) return false;
  if (!stored.startsWith('scrypt$')) {
    const actual = Buffer.from(password);
    const expected = Buffer.from(stored);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  const [, salt, encoded] = stored.split('$');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  const expected = Buffer.from(encoded, 'hex');
  return timingSafeEqual(scryptSync(password, salt, 64), expected);
}

export function protectCredentials(store: any) {
  for (const tenant of store.tenants) {
    if (typeof tenant.ownerPassword === 'string' && tenant.ownerPassword && !tenant.ownerPassword.startsWith('scrypt$')) tenant.ownerPassword = hashPassword(tenant.ownerPassword);
  }
  for (const user of store.users) {
    if (typeof user.password === 'string' && user.password && !user.password.startsWith('scrypt$')) user.password = hashPassword(user.password);
  }
  for (const settings of Object.values(store.tenantSettings) as any[]) {
    delete settings.ownerPassword;
    delete settings.ownerPasswordHash;
  }
}

export function publicCredentials(value: any): any {
  if (Array.isArray(value)) return value.map(publicCredentials);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(password|passwordHash|ownerPassword|ownerPasswordHash|sessions)$/i.test(key))
    .map(([key, item]) => [key, publicCredentials(item)]));
  return value;
}
