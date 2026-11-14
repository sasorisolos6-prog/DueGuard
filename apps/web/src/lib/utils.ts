import type { Tracker } from '../types';

export function getTodayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToTodayIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToIso(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function addMonthsClampedIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(d, lastDay)))
    .toISOString()
    .slice(0, 10);
}

export function computeNextRenewalDateLocal(tracker: Tracker): string {
  const today = getTodayLocalIso();
  const baseDate = tracker.expiryDate < today ? today : tracker.expiryDate;
  if (tracker.billingCycle === 'monthly') return addMonthsClampedIso(baseDate, 1);
  if (tracker.billingCycle === 'quarterly') {
    return tracker.category === 'recharge'
      ? addDaysToIso(baseDate, 84)
      : addMonthsClampedIso(baseDate, 3);
  }
  if (tracker.billingCycle === 'yearly') return addMonthsClampedIso(baseDate, 12);
  return addDaysToIso(baseDate, 30);
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function daysUntil(expiryIsoDate: string): number {
  const todayIso = getTodayLocalIso();
  const start = Date.parse(`${todayIso}T00:00:00Z`);
  const end = Date.parse(`${expiryIsoDate}T00:00:00Z`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatFriendlyDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getUrgencyBadge(daysLeft: number, status: Tracker['status']) {
  if (status === 'cancelled') {
    return {
      text: 'Cancelled',
      classes:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (status === 'completed') {
    return {
      text: 'Completed',
      classes:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
  }
  if (daysLeft < 0) {
    return {
      text: `${Math.abs(daysLeft)}d overdue`,
      classes:
        'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
    };
  }
  if (daysLeft === 0) {
    return {
      text: 'Due Today',
      classes:
        'bg-rose-600 text-white border-rose-600 shadow-xs',
    };
  }
  if (daysLeft <= 3) {
    return {
      text: `${daysLeft}d left`,
      classes:
        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    };
  }
  if (daysLeft <= 7) {
    return {
      text: `${daysLeft}d left`,
      classes:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    };
  }
  return {
    text: `${daysLeft}d left`,
    classes:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
  };
}

export async function compressImageToWebp(file: File, maxDim = 1200): Promise<File> {
  const TARGET_MAX_BYTES = 320 * 1024;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    function encodeAttempt(limitDim: number, quality: number): Promise<File> {
      return new Promise((res) => {
        let { width, height } = img;
        if (width > limitDim || height > limitDim) {
          if (width >= height) {
            height = Math.round((height * limitDim) / width);
            width = limitDim;
          } else {
            width = Math.round((width * limitDim) / height);
            height = limitDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          res(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              res(file);
              return;
            }
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'invoice';
            const outMime = blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
            const ext = outMime === 'image/webp' ? 'webp' : 'jpg';
            res(new File([blob], `${baseName}.${ext}`, { type: outMime }));
          },
          'image/webp',
          quality
        );
      });
    }

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let out = await encodeAttempt(maxDim, 0.8);
      if (out.size > TARGET_MAX_BYTES) {
        out = await encodeAttempt(960, 0.68);
      }
      if (out.size > TARGET_MAX_BYTES) {
        out = await encodeAttempt(760, 0.56);
      }
      resolve(out);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read selected image.'));
    };

    img.src = objectUrl;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function downloadIcsFile(trackers: Tracker[], filename = 'dueguard-reminders.ics'): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DueGuard//Expiry Reminders//EN',
    'CALSCALE:GREGORIAN',
  ];

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  for (const t of trackers) {
    const dateCompact = t.expiryDate.replace(/-/g, '');
    const amountLabel = t.amountInr > 0 ? ` (${formatInr(t.amountInr)})` : '';
    const summary = escapeIcsText(`DueGuard: ${t.title}${amountLabel}`);
    const desc = escapeIcsText(
      [
        `Category: ${t.category}`,
        t.autoRenews ? 'Auto-renew enabled' : '',
        t.notes ? `Notes: ${t.notes}` : '',
      ]
        .filter(Boolean)
        .join(' | ')
    );

    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@dueguard.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateCompact}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
