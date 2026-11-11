import type {
  BillingCycle,
  TrackerCategory,
  TrackerRow,
  TrackerStatus,
} from '../types';

export const VALID_CATEGORIES: readonly TrackerCategory[] = [
  'trial',
  'subscription',
  'return_window',
  'warranty',
  'recharge',
  'document',
  'custom',
];

export const VALID_CYCLES: readonly BillingCycle[] = [
  'one_time',
  'monthly',
  'quarterly',
  'yearly',
];

export const VALID_STATUSES: readonly TrackerStatus[] = [
  'active',
  'cancelled',
  'completed',
];

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(parsed);
}

export function sanitizeReminderDays(input: unknown, fallback = [7, 3, 1]): number[] {
  if (!Array.isArray(input)) return fallback;
  const cleaned = new Set<number>();
  for (const val of input) {
    const num = Number(val);
    if (Number.isInteger(num) && num >= 0 && num <= 90) {
      cleaned.add(num);
    }
  }
  const sorted = Array.from(cleaned).sort((a, b) => b - a);
  return sorted.length > 0 ? sorted : fallback;
}

export function parseReminderDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return sanitizeReminderDays(parsed);
  } catch {
    return [7, 3, 1];
  }
}

export interface TrackerInputPayload {
  title: string;
  category: TrackerCategory;
  amountInr: number;
  billingCycle: BillingCycle;
  expiryDate: string;
  reminderDays: number[];
  autoRenews: boolean;
  status: TrackerStatus;
  notes: string;
  actionUrl: string;
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateTrackerPayload(
  body: Record<string, unknown>,
  isPartial = false
): { ok: true; data: Partial<TrackerInputPayload> } | { ok: false; error: string } {
  const data: Partial<TrackerInputPayload> = {};

  if (!isPartial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.trim().length > 100) {
      return { ok: false, error: 'Title must be between 1 and 100 characters.' };
    }
    data.title = body.title.trim();
  }

  if (!isPartial || body.category !== undefined) {
    const cat = body.category as TrackerCategory;
    if (!VALID_CATEGORIES.includes(cat)) {
      return { ok: false, error: 'Invalid category.' };
    }
    data.category = cat;
  }

  if (!isPartial || body.amountInr !== undefined) {
    const amt = Number(body.amountInr ?? 0);
    if (Number.isNaN(amt) || amt < 0 || amt > 10_000_000) {
      return { ok: false, error: 'Amount must be between ₹0 and ₹1,00,00,000.' };
    }
    data.amountInr = Math.round(amt * 100) / 100;
  }

  if (!isPartial || body.billingCycle !== undefined) {
    const cycle = (body.billingCycle ?? 'one_time') as BillingCycle;
    if (!VALID_CYCLES.includes(cycle)) {
      return { ok: false, error: 'Invalid billing cycle.' };
    }
    data.billingCycle = cycle;
  }

  if (!isPartial || body.expiryDate !== undefined) {
    if (typeof body.expiryDate !== 'string' || !isValidIsoDate(body.expiryDate)) {
      return { ok: false, error: 'Expiry date must be in YYYY-MM-DD format.' };
    }
    data.expiryDate = body.expiryDate;
  }

  if (!isPartial || body.reminderDays !== undefined) {
    data.reminderDays = sanitizeReminderDays(body.reminderDays);
  }

  if (!isPartial || body.autoRenews !== undefined) {
    data.autoRenews = Boolean(body.autoRenews);
  }

  if (body.status !== undefined) {
    const status = body.status as TrackerStatus;
    if (!VALID_STATUSES.includes(status)) {
      return { ok: false, error: 'Invalid status.' };
    }
    data.status = status;
  } else if (!isPartial) {
    data.status = 'active';
  }

  if (!isPartial || body.notes !== undefined) {
    if (body.notes !== undefined && typeof body.notes !== 'string') {
      return { ok: false, error: 'Notes must be text.' };
    }
    data.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
  }

  if (!isPartial || body.actionUrl !== undefined) {
    if (body.actionUrl !== undefined && typeof body.actionUrl !== 'string') {
      return { ok: false, error: 'Action link must be a URL string.' };
    }
    const trimmedUrl = typeof body.actionUrl === 'string' ? body.actionUrl.trim() : '';
    if (trimmedUrl.length > 0) {
      if (trimmedUrl.length > 500 || !isSafeHttpUrl(trimmedUrl)) {
        return { ok: false, error: 'Action link must start with http:// or https://.' };
      }
    }
    data.actionUrl = trimmedUrl;
  }

  return { ok: true, data };
}

export function serializeTracker(row: TrackerRow) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    amountInr: row.amount_inr,
    billingCycle: row.billing_cycle,
    expiryDate: row.expiry_date,
    reminderDays: parseReminderDays(row.reminder_days),
    autoRenews: row.auto_renews === 1,
    status: row.status,
    notes: row.notes,
    actionUrl: row.action_url || '',
    hasAttachment: Boolean(row.attachment_key),
    attachmentName: row.attachment_name,
    attachmentMime: row.attachment_mime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
