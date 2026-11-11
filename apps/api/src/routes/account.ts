import { Hono } from 'hono';
import { serializeTracker } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import type { AppVariables, Env, TrackerRow, UserRow } from '../types';

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

accountRoutes.use('*', requireAuth);

accountRoutes.get('/export', async (c) => {
  const authUser = c.get('authUser');

  const user = await c.env.DB.prepare(
    `SELECT id, email, name, plan, email_alerts_enabled, telegram_alerts_enabled, created_at
     FROM users WHERE id = ?`
  )
    .bind(authUser.id)
    .first<Omit<UserRow, 'password_hash' | 'password_salt' | 'telegram_chat_id' | 'telegram_link_code'>>();

  const trackers = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE user_id = ? ORDER BY expiry_date ASC'
  )
    .bind(authUser.id)
    .all<TrackerRow>();

  return c.json({
    exportedAt: new Date().toISOString(),
    app: 'DueGuard',
    user,
    trackers: (trackers.results ?? []).map(serializeTracker),
  });
});

accountRoutes.delete('/', async (c) => {
  const authUser = c.get('authUser');

  await c.env.DB.prepare('DELETE FROM tracker_attachments WHERE user_id = ?')
    .bind(authUser.id)
    .run();
  await c.env.DB.prepare('DELETE FROM notification_logs WHERE user_id = ?')
    .bind(authUser.id)
    .run();
  await c.env.DB.prepare('DELETE FROM trackers WHERE user_id = ?').bind(authUser.id).run();
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(authUser.id).run();

  return c.json({ ok: true });
});
