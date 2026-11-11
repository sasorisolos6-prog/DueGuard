import { AlertTriangle, CalendarClock, IndianRupee, PiggyBank } from 'lucide-react';
import { formatInr } from '../lib/utils';
import type { TrackerSummary } from '../types';

interface SummaryCardsProps {
  summary: TrackerSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Monthly Burn',
      value: formatInr(summary.monthlyBurnInr),
      sub: `${formatInr(summary.annualSpendInr)} / year projected`,
      icon: IndianRupee,
      accent: 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/60',
    },
    {
      label: 'Urgent (Next 7d)',
      value: String(summary.urgentCount + summary.overdueCount),
      sub:
        summary.overdueCount > 0
          ? `${summary.overdueCount} overdue · ${summary.urgentCount} upcoming`
          : `${summary.activeCount} total active`,
      icon: summary.overdueCount > 0 ? AlertTriangle : CalendarClock,
      accent:
        summary.urgentCount + summary.overdueCount > 0
          ? 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60'
          : 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
    },
    {
      label: 'Saved Cancelled',
      value: formatInr(summary.savedInr),
      sub: 'Avoided unwanted charges',
      icon: PiggyBank,
      accent: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
