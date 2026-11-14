import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { accountRoutes } from './routes/account';
import { attachmentRoutes } from './routes/attachments';
import { authRoutes } from './routes/auth';
import { telegramRoutes } from './routes/telegram';
import { trackerRoutes } from './routes/trackers';
import { runDailyExpiryReminders } from './scheduled';
import { sanitizeSecretText } from './lib/alerts';
import type { AppVariables, Env } from './types';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Security Headers (Check 4)
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none';");
});

// Environment & Critical Service Verification (Check 1)
app.use('*', async (c, next) => {
  if (!c.env.DB) {
    console.error('Critical configuration failure: D1 database binding "DB" is not set.');
    return c.json({ error: 'Server configuration error: Database unavailable.' }, 500);
  }
  await next();
});

// Strict Whitelist CORS Configuration (Check 6)
const ALLOWED_EXACT_ORIGINS = new Set([
  'https://getdueguard.pages.dev',
  'capacitor://localhost',
  'https://localhost',
]);

function resolveAllowedOrigin(origin: string | undefined, appBaseUrl?: string): string {
  if (!origin) {
    return appBaseUrl || '';
  }
  if (appBaseUrl && origin === appBaseUrl) {
    return origin;
  }
  if (ALLOWED_EXACT_ORIGINS.has(origin)) {
    return origin;
  }
  // Allow DueGuard preview deployments on Cloudflare Pages only
  if (/^https:\/\/[a-z0-9-]+\.getdueguard\.pages\.dev$/i.test(origin)) {
    return origin;
  }
  // Local development
  if (
    /^http:\/\/localhost(:\d+)?$/i.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)
  ) {
    return origin;
  }
  return '';
}

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => resolveAllowedOrigin(origin, c.env.APP_BASE_URL),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'dueguard-api',
    timestamp: new Date().toISOString(),
  });
});

app.route('/api/auth', authRoutes);
app.route('/api/trackers', trackerRoutes);
app.route('/api/trackers', attachmentRoutes);
app.route('/api/telegram', telegramRoutes);
app.route('/api/account', accountRoutes);

app.notFound((c) => {
  return c.json({ error: 'Endpoint not found.' }, 404);
});

app.onError((err, c) => {
  const correlationId = crypto.randomUUID();
  const rawMessage = err instanceof Error ? err.stack || err.message : String(err);
  let sanitized = sanitizeSecretText(rawMessage, [
    c.env?.JWT_SECRET,
    c.env?.RESEND_API_KEY,
    c.env?.TELEGRAM_BOT_TOKEN,
    c.env?.TELEGRAM_WEBHOOK_SECRET,
  ]);
  // Redact any user email addresses in error traces
  sanitized = sanitized.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]');
  console.error(`[Correlation-ID: ${correlationId}] Unhandled API error:`, sanitized);
  c.header('X-Correlation-ID', correlationId);
  return c.json({ error: 'Internal server error.', correlationId }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runDailyExpiryReminders(env).then((stats) => {
        console.info('DueGuard daily reminder run:', JSON.stringify(stats));
      })
    );
  },
};
