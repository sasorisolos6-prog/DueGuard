import { CATEGORIES } from '../lib/presets';
import { formatInr } from '../lib/utils';
import type { Tracker, TrackerCategory } from '../types';

interface SpendBreakdownProps {
  trackers: Tracker[];
}

const BAR_COLORS: Record<TrackerCategory, string> = {
  subscription: 'bg-teal-600',
  trial: 'bg-amber-500',
  recharge: 'bg-sky-500',
  document: 'bg-emerald-500',
  warranty: 'bg-indigo-500',
  return_window: 'bg-rose-500',
  custom: 'bg-slate-500',
};

function monthlyEquivalent(t: Tracker): number {
  if (t.status !== 'active') return 0;
  if (t.billingCycle === 'monthly') return t.amountInr;
  if (t.billingCycle === 'quarterly') return t.amountInr / 3;
  if (t.billingCycle === 'yearly') return t.amountInr / 12;
  return 0;
}

export function SpendBreakdown({ trackers }: SpendBreakdownProps) {
  const byCategory = new Map<TrackerCategory, number>();
  let totalMonthly = 0;

  for (const t of trackers) {
    const monthly = monthlyEquivalent(t);
    if (monthly <= 0) continue;
    totalMonthly += monthly;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + monthly);
  }

  if (totalMonthly <= 0) return null;

  const segments = Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      pct: Math.max(4, Math.round((amount / totalMonthly) * 100)),
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Monthly Recurring Breakdown
        </h2>
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          Total: {formatInr(totalMonthly)}/mo
        </span>
      </div>

      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {segments.map((seg) => (
          <div
            key={seg.category}
            style={{ width: `${seg.pct}%` }}
            title={`${CATEGORIES[seg.category].label}: ${formatInr(seg.amount)}/mo`}
            className={`${BAR_COLORS[seg.category]} transition-all`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.category} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[seg.category]}`} />
            <span className="text-slate-600 dark:text-slate-300">
              {CATEGORIES[seg.category].label}:
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatInr(seg.amount)}/mo
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
