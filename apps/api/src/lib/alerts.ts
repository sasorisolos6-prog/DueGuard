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

export async function sendTelegramMessage(
  env: Env,
  chatId: string,
  text: string
): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log(`[DueGuard Telegram Preview] -> chatId=${chatId}\n${text}`);
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
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Telegram request failed' };
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
    console.log(`[DueGuard Email Preview] -> to=${toEmail} | subject=${subject}\n${text}`);
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
      return { ok: false, error: `Resend API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email request failed' };
  }
}
