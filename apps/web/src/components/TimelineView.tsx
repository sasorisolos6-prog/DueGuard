import { CalendarClock, ExternalLink, Pencil, RotateCw, XCircle } from 'lucide-react';
import { CATEGORIES } from '../lib/presets';
import { daysUntil, formatFriendlyDate, formatInr, getUrgencyBadge, isSafeHttpUrl } from '../lib/utils';
import type { Tracker } from '../types';

interface TimelineViewProps {
  trackers: Tracker[];
  onEdit: (tracker: Tracker) => void;
  onRenew: (tracker: Tracker) => void;
  onMarkStatus: (tracker: Tracker, status: Tracker['status']) => void;
}

export function TimelineView({ trackers, onEdit, onRenew, onMarkStatus }: TimelineViewProps) {
  const groups: Array<{ title: string; accent: string; items: Tracker[] }> = [
    { title: 'Overdue & Due Today', accent: 'text-rose-700 dark:text-rose-400', items: [] },
    { title: 'Next 7 Days', accent: 'text-amber-700 dark:text-amber-400', items: [] },
    { title: 'Next 30 Days', accent: 'text-teal-700 dark:text-teal-400', items: [] },
    { title: 'Later / Archived', accent: 'text-slate-600 dark:text-slate-400', items: [] },
  ];

  for (const t of trackers) {
    if (t.status !== 'active') {
      groups[3].items.push(t);
      continue;
    }
    const left = daysUntil(t.expiryDate);
    if (left <= 0) groups[0].items.push(t);
    else if (left <= 7) groups[1].items.push(t);
    else if (left <= 30) groups[2].items.push(t);
    else groups[3].items.push(t);
  }

  return (
    <section className="space-y-4">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <div
            key={group.title}
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <CalendarClock className={`h-4 w-4 ${group.accent}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${group.accent}`}>
                  {group.title}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {group.items.length} item{group.items.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {group.items.map((t) => {
                const daysLeft = daysUntil(t.expiryDate);
                const urgency = getUrgencyBadge(daysLeft, t.status);
                const cat = CATEGORIES[t.category] ?? CATEGORIES.custom;
                const safeLink = t.actionUrl && isSafeHttpUrl(t.actionUrl) ? t.actionUrl : null;
                const isRecurring = t.billingCycle !== 'one_time';

                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat.badgeClass}`}
                        >
                          {cat.shortLabel}
                        </span>
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {t.title}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${urgency.classes}`}
                        >
                          {urgency.text}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Due {formatFriendlyDate(t.expiryDate)}
                        {t.amountInr > 0 ? ` · ${formatInr(t.amountInr)}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {safeLink && (
                        <a
                          href={safeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {t.status === 'active' && isRecurring && (
                        <button
                          type="button"
                          onClick={() => onRenew(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                        >
                          <RotateCw className="h-3 w-3" />
                          Renewed
                        </button>
                      )}
                      {t.status === 'active' &&
                        (t.category === 'trial' || t.category === 'subscription') && (
                          <button
                            type="button"
                            onClick={() => onMarkStatus(t, 'cancelled')}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </section>
  );
}
