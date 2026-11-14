import { Hono } from 'hono';
import { hashPassword, signAuthToken, verifyPassword } from '../lib/crypto';
import { checkRateLimit } from '../lib/rateLimit';
import { isValidEmail, validateTrackerPayload } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { PLAN_LIMITS, type AppVariables, type Env, type UserRow } from '../types';

export const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function getClientIp(headerFn: (name: string) => string | undefined): string {
  return (
    headerFn('CF-Connecting-IP') ||
    headerFn('X-Forwarded-For')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

authRoutes.use('*', async (c, next) => {
  if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 16) {
    console.error('Critical configuration failure: JWT_SECRET must be configured with at least 16 characters.');
    return c.json({ error: 'Server configuration error: Authentication service unconfigured.' }, 500);
  }
  await next();
});

authRoutes.post('/register', async (c) => {
  const ip = getClientIp((h) => c.req.header(h));
  const rateLimit = await checkRateLimit(c.env.DB, `register:${ip}`, 5, 60);
  c.header('X-RateLimit-Limit', '5');
  c.header('X-RateLimit-Remaining', String(rateLimit.remaining));

  if (!rateLimit.allowed) {
    c.header('Retry-After', String(rateLimit.retryAfterSeconds));
    return c.json(
      {
        error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      },
      429
    );
  }

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON request body.' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email)) {
    return c.json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (name.length < 2 || name.length > 60) {
    return c.json({ error: 'Name must be between 2 and 60 characters.' }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return c.json({ error: 'Password must be at least 8 characters long.' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    return c.json({ error: 'An account with this email already exists.' }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, password_salt, plan, created_at)
     VALUES (?, ?, ?, ?, ?, 'free', ?)`
  )
    .bind(userId, email, name, hash, salt, now)
    .run();

  // Optional migration of demo/local trackers created before signup
  let importedCount = 0;
  if (Array.isArray(body.importTrackers)) {
    const maxFree = PLAN_LIMITS.free.maxActiveTrackers;
    const candidates = body.importTrackers.slice(0, maxFree);
    for (const item of candidates) {
      if (!item || typeof item !== 'object') continue;
      const check = validateTrackerPayload(item as Record<string, unknown>);
      if (!check.ok) continue;
      const d = check.data;
      await c.env.DB.prepare(
        `INSERT INTO trackers (
          id, user_id, title, category, amount_inr, billing_cycle, expiry_date,
          reminder_days, auto_renews, status, notes, action_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          userId,
          d.title!,
          d.category!,
          d.amountInr ?? 0,
          d.billingCycle ?? 'one_time',
          d.expiryDate!,
          JSON.stringify(d.reminderDays ?? [7, 3, 1]),
          d.autoRenews ? 1 : 0,
          d.status ?? 'active',
          d.notes ?? '',
          d.actionUrl ?? '',
          now,
          now
        )
        .run();
      importedCount++;
    }
  }

  const authUser = { id: userId, email, name, plan: 'free' as const };
  const token = await signAuthToken(authUser, c.env.JWT_SECRET);

  return c.json({ token, user: authUser, importedCount }, 201);
});

authRoutes.post('/login', async (c) => {
  const ip = getClientIp((h) => c.req.header(h));
  const rateLimit = await checkRateLimit(c.env.DB, `login:${ip}`, 5, 60);
  c.header('X-RateLimit-Limit', '5');
  c.header('X-RateLimit-Remaining', String(rateLimit.remaining));

  if (!rateLimit.allowed) {
    c.header('Retry-After', String(rateLimit.retryAfterSeconds));
    return c.json(
      {
        error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      },
      429
    );
  }

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON request body.' }, 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return c.json({ error: 'Email and password are required.' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, password_hash, password_salt, plan FROM users WHERE email = ?'
  )
    .bind(email)
    .first<Pick<UserRow, 'id' | 'email' | 'name' | 'password_hash' | 'password_salt' | 'plan'>>();

  if (!user) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
  };
  const token = await signAuthToken(authUser, c.env.JWT_SECRET);

  return c.json({ token, user: authUser });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const authUser = c.get('authUser');

  const user = await c.env.DB.prepare(
    `SELECT id, email, name, plan, telegram_chat_id, telegram_link_code,
            email_alerts_enabled, telegram_alerts_enabled, created_at
     FROM users WHERE id = ?`
  )
    .bind(authUser.id)
    .first<Omit<UserRow, 'password_hash' | 'password_salt'>>();

  if (!user) return c.json({ error: 'User not found.' }, 404);

  const counts = await c.env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
       SUM(CASE WHEN attachment_key IS NOT NULL THEN 1 ELSE 0 END) AS attachment_count
     FROM trackers WHERE user_id = ?`
  )
    .bind(authUser.id)
    .first<{ active_count: number | null; attachment_count: number | null }>();

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      emailAlertsEnabled: user.email_alerts_enabled === 1,
      telegramAlertsEnabled: user.telegram_alerts_enabled === 1,
      telegramLinked: Boolean(user.telegram_chat_id),
      telegramLinkCode: user.telegram_link_code,
      telegramBotUsername: c.env.TELEGRAM_BOT_USERNAME || null,
      createdAt: user.created_at,
    },
    usage: {
      activeTrackers: counts?.active_count ?? 0,
      attachments: counts?.attachment_count ?? 0,
      limits: PLAN_LIMITS[user.plan],
    },
  });
});

authRoutes.patch('/settings', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON request body.' }, 400);

  const updates: string[] = [];
  const params: unknown[] = [];

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return c.json({ error: 'Name must be between 2 and 60 characters.' }, 400);
    }
    updates.push('name = ?');
    params.push(trimmed);
  }

  if (typeof body.emailAlertsEnabled === 'boolean') {
    updates.push('email_alerts_enabled = ?');
    params.push(body.emailAlertsEnabled ? 1 : 0);
  }

  if (typeof body.telegramAlertsEnabled === 'boolean') {
    updates.push('telegram_alerts_enabled = ?');
    params.push(body.telegramAlertsEnabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No valid settings provided.' }, 400);
  }

  params.push(authUser.id);
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  return c.json({ ok: true });
});
