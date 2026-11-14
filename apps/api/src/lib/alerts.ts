import type { Env } from '../types';

export function getIstDateString(date = new Date()): string {
  // Shift to Asia/Kolkata (+05:30) cleanly without relying on host ICU quirks
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffsetMs);
  return ist.toISOString().slice(0, 10);
}

export function diffDaysBetweenIsoDates(fromDate: string, toDate: string): number {
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function sanitizeSecretText(text: string, secrets: Array<string | undefined> = []): string {
  let result = text;
  for (const s of secrets) {
    if (s && s.length >= 4) {
      result = result.replaceAll(s, '[REDACTED]');
    }
  }
  // Mask Telegram bot tokens (e.g. bot123456789:ABCdef-ghI_jkl)
  result = result.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED]');
  // Mask Bearer tokens
  result = result.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  return result;
}

export async function sendTelegramMessage(
  env: Env,
  chatId: string,
  text: string
): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log('[DueGuard Telegram Preview] Simulated alert to chatId=[REDACTED] (bot token not configured)');
    return { ok: true, simulated: true };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      const sanitized = sanitizeSecretText(`Telegram API ${res.status}: ${body}`, [
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_WEBHOOK_SECRET,
      ]);
      return { ok: false, error: sanitized };
    }
    return { ok: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Telegram request failed';
    const sanitized = sanitizeSecretText(raw, [
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_WEBHOOK_SECRET,
    ]);
    return { ok: false, error: sanitized };
  }
}

export async function sendEmailAlert(
  env: Env,
  toEmail: string,
  subject: string,
  html: string,
  text: string
): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    console.log('[DueGuard Email Preview] Simulated alert to toEmail=[REDACTED] (Resend key not configured)');
    return { ok: true, simulated: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'DueGuard Alerts <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const sanitized = sanitizeSecretText(`Resend API ${res.status}: ${body}`, [
        env.RESEND_API_KEY,
      ]);
      return { ok: false, error: sanitized };
    }
    return { ok: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Email request failed';
    const sanitized = sanitizeSecretText(raw, [env.RESEND_API_KEY]);
    return { ok: false, error: sanitized };
  }
}
