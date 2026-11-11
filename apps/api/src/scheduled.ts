import {
  diffDaysBetweenIsoDates,
  formatInr,
  getIstDateString,
  sendEmailAlert,
  sendTelegramMessage,
} from './lib/alerts';
import { escapeHtml, isSafeHttpUrl, parseReminderDays } from './lib/validation';
import type { Env, TrackerCategory, TrackerRow } from './types';

interface JoinedTrackerUserRow extends TrackerRow {
  user_email: string;
  user_name: string;
  telegram_chat_id: string | null;
  email_alerts_enabled: number;
  telegram_alerts_enabled: number;
}

const CATEGORY_LABELS: Record<TrackerCategory, string> = {
  trial: 'Free Trial',
  subscription: 'Subscription',
  return_window: 'Return Window',
  warranty: 'Warranty',
  recharge: 'Recharge',
  document: 'Document / ID',
  custom: 'Reminder',
};

async function wasAlreadySent(
  db: D1Database,
  trackerId: string,
  channel: 'email' | 'telegram',
  offset: number,
  sentForDate: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM notification_logs
       WHERE tracker_id = ? AND channel = ? AND trigger_day_offset = ? AND sent_for_date = ?`
    )
    .bind(trackerId, channel, offset, sentForDate)
    .first<{ id: string }>();
  return Boolean(row);
}

async function recordDelivery(
  db: D1Database,
  trackerId: string,
  userId: string,
  channel: 'email' | 'telegram',
  offset: number,
  sentForDate: string
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO notification_logs
       (id, tracker_id, user_id, channel, trigger_day_offset, sent_for_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      trackerId,
      userId,
      channel,
      offset,
      sentForDate,
      new Date().toISOString()
    )
    .run();
}

export async function runDailyExpiryReminders(env: Env): Promise<{
  checked: number;
  sentEmail: number;
  sentTelegram: number;
  dateIst: string;
}> {
  const todayIst = getIstDateString();

  const result = await env.DB.prepare(
    `SELECT t.*, u.email AS user_email, u.name AS user_name,
            u.telegram_chat_id, u.email_alerts_enabled, u.telegram_alerts_enabled
     FROM trackers t
     JOIN users u ON u.id = t.user_id
     WHERE t.status = 'active'`
  ).all<JoinedTrackerUserRow>();

  const rows = result.results ?? [];
  let sentEmail = 0;
  let sentTelegram = 0;

  for (const row of rows) {
    const daysLeft = diffDaysBetweenIsoDates(todayIst, row.expiry_date);
    if (daysLeft < 0) continue;

    const offsets = parseReminderDays(row.reminder_days);
    if (daysLeft !== 0 && !offsets.includes(daysLeft)) continue;

    const whenLabel =
      daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? 'TOMORROW (1 day left)' : `in ${daysLeft} days`;
    const categoryLabel = CATEGORY_LABELS[row.category] ?? 'Item';
    const amountText = row.amount_inr > 0 ? ` (${formatInr(row.amount_inr)})` : '';
    const appUrl = env.APP_BASE_URL || 'http://localhost:5173';

    const safeActionUrl =
      row.action_url && isSafeHttpUrl(row.action_url) ? row.action_url : null;

    if (row.email_alerts_enabled === 1) {
      const already = await wasAlreadySent(env.DB, row.id, 'email', daysLeft, todayIst);
      if (!already) {
        const subject = `[DueGuard] ${row.title}${amountText} due ${whenLabel}`;
        const safeTitle = escapeHtml(row.title);
        const actionBtn = safeActionUrl
          ? `<a href="${escapeHtml(safeActionUrl)}" style="display:inline-block;margin-left:8px;padding:10px 16px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Cancel / Manage Link</a>`
          : '';
        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
            <p style="font-size:12px;text-transform:uppercase;color:#0f766e;font-weight:700;margin:0 0 8px;">DueGuard ${escapeHtml(categoryLabel)} Alert</p>
            <h2 style="margin:0 0 12px;color:#0f172a;">${safeTitle}${escapeHtml(amountText)}</h2>
            <p style="margin:0 0 12px;color:#334155;">Deadline: <strong>${row.expiry_date}</strong> (${whenLabel})</p>
            ${row.auto_renews ? '<p style="margin:0 0 12px;color:#b45309;font-weight:600;">⚠️ Auto-renew is enabled — cancel before deadline if you do not want to be charged.</p>' : ''}
            ${row.notes ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;">Notes: ${escapeHtml(row.notes)}</p>` : ''}
            <a href="${appUrl}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Open DueGuard</a>${actionBtn}
          </div>
        `;
        const text = `${row.title}${amountText} (${categoryLabel}) is due on ${row.expiry_date} (${whenLabel}). Open ${appUrl}${safeActionUrl ? ` | Manage: ${safeActionUrl}` : ''}`;
        const res = await sendEmailAlert(env, row.user_email, subject, html, text);
        if (res.ok) {
          await recordDelivery(env.DB, row.id, row.user_id, 'email', daysLeft, todayIst);
          sentEmail++;
        }
      }
    }

    if (row.telegram_alerts_enabled === 1 && row.telegram_chat_id) {
      const already = await wasAlreadySent(env.DB, row.id, 'telegram', daysLeft, todayIst);
      if (!already) {
        const tgMsg = [
          `⏰ <b>DueGuard ${escapeHtml(categoryLabel)} Alert</b>`,
          `<b>${escapeHtml(row.title)}</b>${escapeHtml(amountText)}`,
          `📅 Due: <b>${row.expiry_date}</b> (${whenLabel})`,
          row.auto_renews ? '⚠️ <i>Auto-renew is ON — cancel in time if not needed.</i>' : '',
          safeActionUrl ? `🔗 <a href="${escapeHtml(safeActionUrl)}">Open Cancel / Order Page</a>` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const res = await sendTelegramMessage(env, row.telegram_chat_id, tgMsg);
        if (res.ok) {
          await recordDelivery(env.DB, row.id, row.user_id, 'telegram', daysLeft, todayIst);
          sentTelegram++;
        }
      }
    }
  }

  return {
    checked: rows.length,
    sentEmail,
    sentTelegram,
    dateIst: todayIst,
  };
}
