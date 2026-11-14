import { Hono } from 'hono';
import { sendTelegramMessage } from '../lib/alerts';
import { generateLinkCode } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { AppVariables, Env, UserRow } from '../types';

export const telegramRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

telegramRoutes.post('/link-code', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const code = generateLinkCode(6);

  await c.env.DB.prepare('UPDATE users SET telegram_link_code = ? WHERE id = ?')
    .bind(code, authUser.id)
    .run();

  return c.json({
    code,
    botUsername: c.env.TELEGRAM_BOT_USERNAME || null,
    command: `/start ${code}`,
  });
});

// Useful on localhost or when webhooks aren't registered yet: checks recent getUpdates
telegramRoutes.post('/sync', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const user = await c.env.DB.prepare(
    'SELECT telegram_link_code, telegram_chat_id FROM users WHERE id = ?'
  )
    .bind(authUser.id)
    .first<Pick<UserRow, 'telegram_link_code' | 'telegram_chat_id'>>();

  if (!user) return c.json({ error: 'User not found.' }, 404);
  if (user.telegram_chat_id) return c.json({ linked: true });
  if (!user.telegram_link_code) {
    return c.json({ error: 'Generate a link code first.' }, 400);
  }
  if (!c.env.TELEGRAM_BOT_TOKEN) {
    return c.json(
      {
        linked: false,
        configured: false,
        message: 'Set TELEGRAM_BOT_TOKEN in .dev.vars / Worker secrets to link live Telegram.',
      },
      200
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/getUpdates?limit=30`
    );
    if (!res.ok) {
      return c.json({ error: 'Failed to poll Telegram updates.' }, 502);
    }

    const data = (await res.json()) as {
      ok: boolean;
      result?: Array<{ message?: { text?: string; chat?: { id?: number } } }>;
    };

    const targetCode = user.telegram_link_code.toUpperCase();
    for (const update of data.result ?? []) {
      const text = update.message?.text?.trim().toUpperCase() ?? '';
      const chatId = update.message?.chat?.id;
      if (!chatId) continue;

      if (text === targetCode || text === `/START ${targetCode}`) {
        await c.env.DB.prepare(
          'UPDATE users SET telegram_chat_id = ?, telegram_link_code = NULL, telegram_alerts_enabled = 1 WHERE id = ?'
        )
          .bind(String(chatId), authUser.id)
          .run();

        await sendTelegramMessage(
          c.env,
          String(chatId),
          '✅ <b>DueGuard linked!</b> You will now get expiry alerts here before trials, returns, or warranties lapse.'
        );
        return c.json({ linked: true });
      }
    }

    return c.json({ linked: false, configured: true });
  } catch {
    return c.json({ error: 'Failed to connect to Telegram service.' }, 502);
  }
});

telegramRoutes.post('/unlink', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  await c.env.DB.prepare(
    'UPDATE users SET telegram_chat_id = NULL, telegram_link_code = NULL WHERE id = ?'
  )
    .bind(authUser.id)
    .run();
  return c.json({ ok: true });
});

telegramRoutes.post('/send-sample', requireAuth, async (c) => {
  const authUser = c.get('authUser');
  const user = await c.env.DB.prepare('SELECT telegram_chat_id FROM users WHERE id = ?')
    .bind(authUser.id)
    .first<Pick<UserRow, 'telegram_chat_id'>>();

  if (!user?.telegram_chat_id) {
    return c.json({ error: 'Telegram is not linked yet.' }, 400);
  }

  const result = await sendTelegramMessage(
    c.env,
    user.telegram_chat_id,
    '🔔 <b>DueGuard Sample Alert:</b> Your Telegram reminder channel is working!'
  );

  if (!result.ok) {
    return c.json({ error: result.error || 'Failed to send Telegram test.' }, 502);
  }
  return c.json({ ok: true, simulated: Boolean(result.simulated) });
});

// Public webhook endpoint for production Telegram Bot API
telegramRoutes.post('/webhook', async (c) => {
  if (c.env.TELEGRAM_WEBHOOK_SECRET) {
    const incomingSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (incomingSecret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
      return c.json({ error: 'Unauthorized webhook' }, 401);
    }
  }

  const update = await c.req
    .json<{ message?: { text?: string; chat?: { id?: number } } }>()
    .catch(() => null);

  const text = update?.message?.text?.trim() ?? '';
  const chatId = update?.message?.chat?.id;
  if (!chatId || !text) {
    return c.json({ ok: true });
  }

  const match = text.match(/^(?:\/start\s+)?([A-Z0-9]{6})$/i);
  if (!match) {
    await sendTelegramMessage(
      c.env,
      String(chatId),
      'Send <code>/start YOUR_CODE</code> from your DueGuard Alerts settings to connect this chat.'
    );
    return c.json({ ok: true });
  }

  const code = match[1].toUpperCase();
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE telegram_link_code = ?'
  )
    .bind(code)
    .first<{ id: string }>();

  if (!user) {
    await sendTelegramMessage(
      c.env,
      String(chatId),
      '❌ Code not recognized or expired. Generate a fresh code in DueGuard.'
    );
    return c.json({ ok: true });
  }

  await c.env.DB.prepare(
    'UPDATE users SET telegram_chat_id = ?, telegram_link_code = NULL, telegram_alerts_enabled = 1 WHERE id = ?'
  )
    .bind(String(chatId), user.id)
    .run();

  await sendTelegramMessage(
    c.env,
    String(chatId),
    '✅ <b>DueGuard connected!</b> You will now receive reminders before deadlines expire.'
  );

  return c.json({ ok: true });
});
