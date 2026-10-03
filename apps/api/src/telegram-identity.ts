import { createHmac, timingSafeEqual } from 'node:crypto';

export function telegramIdentity(initData: string, token: string, now = Date.now()) {
  if (!initData || initData.length > 16384 || !token) return null;
  const params = new URLSearchParams(initData);
  if ([...new Set(params.keys())].some(key => params.getAll(key).length !== 1)) return null;
  const hash = params.get('hash') || '';
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token.trim().replace(/^bot/i, '')).digest();
  const expected = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(authDate) || authDate > now / 1000 + 30 || now / 1000 - authDate > 86400) return null;
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isSafeInteger(user.id) && user.id > 0 ? user : null;
  } catch { return null; }
}

export function webhookSecret(token: string) {
  return createHmac('sha256', token.trim().replace(/^bot/i, '')).update('CargonaOS webhook v1').digest('hex');
}
