import { Hono } from 'hono';
import { diffDaysBetweenIsoDates, getIstDateString } from '../lib/alerts';
import { serializeTracker, validateTrackerPayload } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { PLAN_LIMITS, type AppVariables, type Env, type PlanTier, type TrackerRow } from '../types';

export const trackerRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

trackerRoutes.use('*', requireAuth);

async function ensureActiveQuotaAvailable(
  db: D1Database,
  userId: string,
  plan: PlanTier
): Promise<string | null> {
  const countRes = await db
    .prepare("SELECT COUNT(*) as total FROM trackers WHERE user_id = ? AND status = 'active'")
    .bind(userId)
    .first<{ total: number }>();

  const maxActive = PLAN_LIMITS[plan].maxActiveTrackers;
  if ((countRes?.total ?? 0) >= maxActive) {
    return `Account limit reached (max ${maxActive} active trackers). Mark completed items done to free slots.`;
  }
  return null;
}

function computeSummary(rows: TrackerRow[]) {
  const todayIst = getIstDateString();
  let monthlyBurnInr = 0;
  let annualSpendInr = 0;
  let urgentCount = 0;
  let overdueCount = 0;
  let savedInr = 0;
  let activeCount = 0;
  let attachmentCount = 0;

  for (const row of rows) {
    if (row.attachment_key) attachmentCount++;

    if (row.status === 'cancelled') {
      savedInr += row.amount_inr;
      continue;
    }

    if (row.status !== 'active') continue;
    activeCount++;

    const daysLeft = diffDaysBetweenIsoDates(todayIst, row.expiry_date);
    if (daysLeft < 0) overdueCount++;
    else if (daysLeft <= 7) urgentCount++;

    if (row.billing_cycle === 'monthly') {
      monthlyBurnInr += row.amount_inr;
      annualSpendInr += row.amount_inr * 12;
    } else if (row.billing_cycle === 'quarterly') {
      monthlyBurnInr += row.amount_inr / 3;
      annualSpendInr += row.amount_inr * 4;
    } else if (row.billing_cycle === 'yearly') {
      monthlyBurnInr += row.amount_inr / 12;
      annualSpendInr += row.amount_inr;
    }
  }

  return {
    monthlyBurnInr: Math.round(monthlyBurnInr),
    annualSpendInr: Math.round(annualSpendInr),
    urgentCount,
    overdueCount,
    savedInr: Math.round(savedInr),
    activeCount,
    attachmentCount,
  };
}

trackerRoutes.get('/', async (c) => {
  const authUser = c.get('authUser');
  const rowsResult = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE user_id = ? ORDER BY expiry_date ASC, created_at DESC'
  )
    .bind(authUser.id)
    .all<TrackerRow>();

  const rows = rowsResult.results ?? [];
  return c.json({
    trackers: rows.map(serializeTracker),
    summary: computeSummary(rows),
    limits: PLAN_LIMITS[authUser.plan],
  });
});

trackerRoutes.post('/', async (c) => {
  const authUser = c.get('authUser');
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON request body.' }, 400);

  const check = validateTrackerPayload(body);
  if (!check.ok) return c.json({ error: check.error }, 400);
  const d = check.data;

  if (d.status === 'active') {
    const quotaErr = await ensureActiveQuotaAvailable(c.env.DB, authUser.id, authUser.plan);
    if (quotaErr) {
      return c.json({ error: quotaErr, code: 'PLAN_LIMIT_REACHED' }, 403);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO trackers (
      id, user_id, title, category, amount_inr, billing_cycle, expiry_date,
      reminder_days, auto_renews, status, notes, action_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      authUser.id,
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

  const created = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(created!) }, 201);
});

trackerRoutes.patch('/:id', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<TrackerRow>();

  if (!existing) {
    return c.json({ error: 'Tracker not found.' }, 404);
  }

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON request body.' }, 400);

  const check = validateTrackerPayload(body, true);
  if (!check.ok) return c.json({ error: check.error }, 400);
  const d = check.data;

  // Enforce active tracker quota if transitioning back to active
  if (d.status === 'active' && existing.status !== 'active') {
    const quotaErr = await ensureActiveQuotaAvailable(c.env.DB, authUser.id, authUser.plan);
    if (quotaErr) {
      return c.json({ error: quotaErr, code: 'PLAN_LIMIT_REACHED' }, 403);
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE trackers SET
       title = ?,
       category = ?,
       amount_inr = ?,
       billing_cycle = ?,
       expiry_date = ?,
       reminder_days = ?,
       auto_renews = ?,
       status = ?,
       notes = ?,
       action_url = ?,
       updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      d.title ?? existing.title,
      d.category ?? existing.category,
      d.amountInr ?? existing.amount_inr,
      d.billingCycle ?? existing.billing_cycle,
      d.expiryDate ?? existing.expiry_date,
      d.reminderDays ? JSON.stringify(d.reminderDays) : existing.reminder_days,
      d.autoRenews !== undefined ? (d.autoRenews ? 1 : 0) : existing.auto_renews,
      d.status ?? existing.status,
      d.notes ?? existing.notes,
      d.actionUrl !== undefined ? d.actionUrl : existing.action_url,
      now,
      id,
      authUser.id
    )
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(updated!) });
});

trackerRoutes.delete('/:id', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<Pick<TrackerRow, 'id'>>();

  if (!existing) {
    return c.json({ error: 'Tracker not found.' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM tracker_attachments WHERE tracker_id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .run();
  await c.env.DB.prepare('DELETE FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .run();

  return c.json({ ok: true });
});

function addMonthsClampedUtc(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay)).toISOString().slice(0, 10);
}

function addDaysUtc(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function computeNextRenewalDate(row: TrackerRow): string {
  const todayIst = getIstDateString();
  const baseDate = row.expiry_date < todayIst ? todayIst : row.expiry_date;

  if (row.billing_cycle === 'monthly') return addMonthsClampedUtc(baseDate, 1);
  if (row.billing_cycle === 'quarterly') {
    return row.category === 'recharge'
      ? addDaysUtc(baseDate, 84)
      : addMonthsClampedUtc(baseDate, 3);
  }
  if (row.billing_cycle === 'yearly') return addMonthsClampedUtc(baseDate, 12);
  return addDaysUtc(baseDate, 30);
}

trackerRoutes.post('/:id/renew', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<TrackerRow>();

  if (!existing) return c.json({ error: 'Tracker not found.' }, 404);

  if (existing.status !== 'active') {
    const quotaErr = await ensureActiveQuotaAvailable(c.env.DB, authUser.id, authUser.plan);
    if (quotaErr) {
      return c.json({ error: quotaErr, code: 'PLAN_LIMIT_REACHED' }, 403);
    }
  }

  const nextDate = computeNextRenewalDate(existing);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE trackers SET expiry_date = ?, status = 'active', updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(nextDate, now, id, authUser.id)
    .run();

  await c.env.DB.prepare('DELETE FROM notification_logs WHERE tracker_id = ?')
    .bind(id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(updated!) });
});

trackerRoutes.post('/:id/snooze', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const body = await c.req.json<{ days?: number }>().catch(() => ({ days: 2 }));
  const days = Number.isInteger(body.days) && body.days! >= 1 && body.days! <= 30 ? body.days! : 2;

  const existing = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<TrackerRow>();

  if (!existing) return c.json({ error: 'Tracker not found.' }, 404);

  if (existing.status !== 'active') {
    const quotaErr = await ensureActiveQuotaAvailable(c.env.DB, authUser.id, authUser.plan);
    if (quotaErr) {
      return c.json({ error: quotaErr, code: 'PLAN_LIMIT_REACHED' }, 403);
    }
  }

  const todayIst = getIstDateString();
  const baseDate = existing.expiry_date < todayIst ? todayIst : existing.expiry_date;
  const snoozedDate = addDaysUtc(baseDate, days);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE trackers SET expiry_date = ?, status = 'active', updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(snoozedDate, now, id, authUser.id)
    .run();

  await c.env.DB.prepare('DELETE FROM notification_logs WHERE tracker_id = ?')
    .bind(id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(updated!) });
});
