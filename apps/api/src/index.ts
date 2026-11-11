import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { accountRoutes } from './routes/account';
import { attachmentRoutes } from './routes/attachments';
import { authRoutes } from './routes/auth';
import { telegramRoutes } from './routes/telegram';
import { trackerRoutes } from './routes/trackers';
import { runDailyExpiryReminders } from './scheduled';
import type { AppVariables, Env } from './types';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (!origin) return '*';
      // Allow Vite dev, Capacitor Android WebView origins, and configured APP_BASE_URL
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('capacitor://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin === c.env.APP_BASE_URL
      ) {
        return origin;
      }
      return origin.endsWith('.pages.dev') ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
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

app.onError((err, c) => {
  console.error('Unhandled API error:', err);
  return c.json({ error: 'Internal server error.' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runDailyExpiryReminders(env).then((stats) => {
        console.log('DueGuard daily reminder run:', JSON.stringify(stats));
      })
    );
  },
};
