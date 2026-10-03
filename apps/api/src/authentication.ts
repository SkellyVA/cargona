import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { protectCredentials, publicCredentials, verifyPassword } from './credentials.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookie = (request: any, name: string) => (request.headers.cookie || '').split(';').map((item: string) => item.trim()).find((item: string) => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
function same(a: string, b: string) {
  return !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function registerAuthentication(app: any, store: any, environment = process.env) {
  store.sessions ||= [];
  const secure = environment.NODE_ENV === 'production' ? '; Secure' : '';
  const cookieHeaders = (token: string, csrf: string, maxAge: number) => [
    `cargona_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    `cargona_csrf=${csrf}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  ];
  const identity = (session: any) => {
    if (session.kind === 'superadmin') {
      const password = environment.SUPERADMIN_PASSWORD || '';
      if (!password || session.credential !== digest(password)) return null;
      return { id: 'superadmin-1', name: environment.SUPERADMIN_NAME || 'Администратор', email: environment.SUPERADMIN_EMAIL || 'admin@cargona.io', role: 'SUPERADMIN', organizationSlug: 'cargona-platform', organizationName: 'CargonaOS Platform' };
    }
    const tenant = store.tenants.find((t: any) => t.id === session.tenantId);
    if (!tenant || tenant.status === 'SUSPENDED') return null;
    const user = session.kind === 'owner' ? tenant : store.users.find((u: any) => u.id === session.userId && u.tenantId === tenant.id);
    if (!user || user.isActive === false) return null;
    if (session.kind === 'staff' && ['SUPERADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;
    const password = session.kind === 'owner' ? user.ownerPassword : user.password || user.passwordHash;
    if (session.credential !== digest(password || '')) return null;
    return { id: session.userId, name: session.kind === 'owner' ? `Владелец (${tenant.name})` : user.fullName, email: session.kind === 'owner' ? tenant.ownerEmail : user.email, role: session.kind === 'owner' ? 'OWNER' : user.role === 'TENANT_OWNER' ? 'OWNER' : user.role, organizationSlug: tenant.slug, organizationName: tenant.name };
  };
  const activeSession = (request: any) => {
    const token = cookie(request, 'cargona_session');
    const session = token && store.sessions.find((s: any) => s.tokenHash === digest(token) && s.expiresAt > Date.now());
    return session && identity(session) ? session : null;
  };
  const attempts = new Map<string, { count: number; expiresAt: number }>();
  app.post('/api/auth/login', async (request: any, reply: any) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body?.password === 'string' ? request.body.password.trim() : '';
    if (!email || !password || email.length > 255 || password.length > 1024) return reply.status(400).send({ error: 'Укажите email и пароль' });
    if (request.headers.origin) {
      try { if (new URL(request.headers.origin).host !== request.headers.host) return reply.status(403).send({ error: 'Недопустимый источник запроса' }); }
      catch { return reply.status(403).send({ error: 'Недопустимый источник запроса' }); }
    }
    const key = request.ip;
    const now = Date.now();
    let entry = attempts.get(key);
    if (!entry || entry.expiresAt <= now) {
      for (const [ip, attempt] of attempts) if (attempt.expiresAt <= now) attempts.delete(ip);
      if (attempts.size >= 10000) return reply.status(429).send({ error: 'Повторите вход позже' });
      entry = { count: 0, expiresAt: now + 15 * 60 * 1000 };
      attempts.set(key, entry);
    }
    if (entry.count >= 10) return reply.status(429).send({ error: 'Слишком много попыток. Повторите через 15 минут.' });
    entry.count++;
    let session: any;
    const adminEmail = (environment.SUPERADMIN_EMAIL || 'admin@cargona.io').toLowerCase().trim();
    if (email === adminEmail && environment.SUPERADMIN_PASSWORD && verifyPassword(password, environment.SUPERADMIN_PASSWORD)) {
      session = { kind: 'superadmin', userId: 'superadmin-1', credential: digest(environment.SUPERADMIN_PASSWORD) };
    } else {
      const tenant = store.tenants.find((t: any) => t.ownerEmail?.toLowerCase().trim() === email);
      if (tenant && tenant.status !== 'SUSPENDED' && verifyPassword(password, tenant.ownerPassword)) {
        protectCredentials(store);
        session = { kind: 'owner', tenantId: tenant.id, userId: `owner-${tenant.id}`, credential: digest(tenant.ownerPassword) };
      } else if (!tenant) {
        const user = store.users.find((u: any) => u.email?.toLowerCase().trim() === email);
        const company = user && store.tenants.find((t: any) => t.id === user.tenantId);
        if (user && user.isActive !== false && company && company.status !== 'SUSPENDED' && verifyPassword(password, user.password || user.passwordHash)) {
          protectCredentials(store);
          session = { kind: 'staff', tenantId: company.id, userId: user.id, credential: digest(user.password || user.passwordHash) };
        }
      }
    }
    if (!session) return reply.status(401).send({ error: 'Неверный email или пароль' });
    const token = randomBytes(32).toString('hex');
    const csrf = randomBytes(32).toString('hex');
    session = { ...session, tokenHash: digest(token), csrfHash: digest(csrf), expiresAt: now + 12 * 60 * 60 * 1000 };
    const oldToken = cookie(request, 'cargona_session');
    store.sessions = store.sessions.filter((s: any) => s.expiresAt > now && (!oldToken || s.tokenHash !== digest(oldToken)));
    const sameAccount = store.sessions.filter((s: any) => s.kind === session.kind && s.userId === session.userId && s.tenantId === session.tenantId);
    const expiredTokens = new Set(sameAccount.slice(0, Math.max(0, sameAccount.length - 9)).map((s: any) => s.tokenHash));
    store.sessions = store.sessions.filter((s: any) => !expiredTokens.has(s.tokenHash));
    store.sessions.push(session);
    await store.saveToFile();
    attempts.delete(key);
    reply.header('set-cookie', cookieHeaders(token, csrf, 12 * 60 * 60));
    const user = identity(session);
    const tenant = store.tenants.find((t: any) => t.id === session.tenantId);
    return { success: true, user, tenant: tenant ? publicCredentials(tenant) : null };
  });
  app.get('/api/auth/session', async (request: any, reply: any) => {
    const session = activeSession(request);
    if (!session) return reply.status(401).send({ error: 'Требуется вход' });
    return { user: identity(session) };
  });
  app.post('/api/auth/logout', async (request: any, reply: any) => {
    const token = cookie(request, 'cargona_session');
    const previousCount = store.sessions.length;
    store.sessions = store.sessions.filter((s: any) => !token || s.tokenHash !== digest(token));
    if (store.sessions.length !== previousCount) await store.saveToFile();
    reply.header('set-cookie', cookieHeaders('', '', 0));
    return { success: true };
  });
  app.addHook('preHandler', async (request: any, reply: any) => {
    const session = activeSession(request);
    request.authUser = session ? identity(session) : null;
    if (session && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.url !== '/api/auth/login') {
      if (!same(digest(String(request.headers['x-cargona-csrf'] || '')), session.csrfHash)) return reply.status(403).send({ error: 'Недействительный защитный токен. Обновите страницу.' });
    }
    if (request.url.startsWith('/api/admin/')) {
      if (!request.authUser) return reply.status(401).send({ error: 'Требуется вход' });
      if (!['SUPERADMIN', 'SUPER_ADMIN'].includes(request.authUser.role)) return reply.status(403).send({ error: 'Недостаточно прав' });
    }
    const protectedCompany = request.url.match(/^\/api\/o\/([^/]+)\/(settings|staff|bot-settings|broadcasts|import|finance)(?:\/|\?|$)/);
    if (protectedCompany) {
      const user = request.authUser;
      if (!user) return reply.status(401).send({ error: 'Требуется вход' });
      if (['SUPERADMIN', 'SUPER_ADMIN'].includes(user.role)) return;
      if (decodeURIComponent(protectedCompany[1]) !== user.organizationSlug) return reply.status(403).send({ error: 'Нет доступа к этой компании' });
      const owner = ['OWNER', 'TENANT_OWNER'].includes(user.role);
      if (protectedCompany[2] === 'staff' && request.body) {
        if (request.body.role && !['OWNER', 'TENANT_OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'CASHIER', 'SORTER', 'WAREHOUSE', 'PVZ_OPERATOR'].includes(request.body.role)) return reply.status(400).send({ error: 'Недопустимая роль сотрудника' });
        for (const key of Object.keys(request.body)) if (!['fullName', 'email', 'password', 'role', 'phone', 'branchId', 'assignedBranchId', 'branchName', 'isActive'].includes(key)) delete request.body[key];
      }
      if (protectedCompany[2] === 'finance') {
        if (!owner && !['ADMIN', 'MANAGER', 'CASHIER'].includes(user.role)) return reply.status(403).send({ error: 'Недостаточно прав' });
      } else if (!owner) return reply.status(403).send({ error: 'Доступно только владельцу' });
    }
  });
  app.addHook('onSend', async (request: any, reply: any, payload: any) => {
    reply.header('cache-control', 'no-store');
    if (typeof payload === 'string' && String(reply.getHeader('content-type') || '').includes('application/json')) {
      const data = publicCredentials(JSON.parse(payload));
      const canReadBotToken = ['SUPERADMIN', 'SUPER_ADMIN'].includes(request.authUser?.role) ||
        (['OWNER', 'TENANT_OWNER'].includes(request.authUser?.role) && request.params?.slug === request.authUser.organizationSlug);
      if (!canReadBotToken) {
        const hideTokens = (value: any): any => Array.isArray(value) ? value.map(hideTokens) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'botToken').map(([key, item]) => [key, hideTokens(item)])) : value;
        return JSON.stringify(hideTokens(data));
      }
      return JSON.stringify(data);
    }
    return payload;
  });
}
