import { useState } from 'react';
import {
  AlarmClockPlus,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileImage,
  Pencil,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { CATEGORIES } from '../lib/presets';
import {
  daysUntil,
  formatFriendlyDate,
  formatInr,
  getUrgencyBadge,
  isSafeHttpUrl,
} from '../lib/utils';
import type { Tracker } from '../types';

interface TrackerCardProps {
  tracker: Tracker;
  onEdit: (tracker: Tracker) => void;
  onMarkStatus: (tracker: Tracker, status: Tracker['status']) => void;
  onRenew: (tracker: Tracker) => void;
  onSnooze: (tracker: Tracker) => void;
  onDelete: (tracker: Tracker) => void;
  onPreviewAttachment: (tracker: Tracker) => void;
  onExportIcs: (tracker: Tracker) => void;
}

const CYCLE_LABEL: Record<Tracker['billingCycle'], string> = {
  one_time: 'One-time',
  monthly: '/mo',
  quarterly: '/qtr',
  yearly: '/yr',
};

export function TrackerCard({
  tracker,
  onEdit,
  onMarkStatus,
  onRenew,
  onSnooze,
  onDelete,
  onPreviewAttachment,
  onExportIcs,
}: TrackerCardProps) {
  const [copiedNotes, setCopiedNotes] = useState(false);

  const daysLeft = daysUntil(tracker.expiryDate);
  const urgency = getUrgencyBadge(daysLeft, tracker.status);
  const category = CATEGORIES[tracker.category] ?? CATEGORIES.custom;
  const hasFile = tracker.hasAttachment || Boolean(tracker.localAttachmentDataUrl);
  const safeActionUrl =
    tracker.actionUrl && isSafeHttpUrl(tracker.actionUrl) ? tracker.actionUrl : null;
  const isRecurring = tracker.billingCycle !== 'one_time';
  const isUrgent = tracker.status === 'active' && daysLeft <= 3;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${category.badgeClass}`}
            >
              {category.label}
            </span>
            {tracker.autoRenews && tracker.status === 'active' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <RefreshCw className="h-3 w-3" />
                Auto-pay
              </span>
            )}
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${urgency.classes}`}
          >
            {urgency.text}
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-white">
            {tracker.title}
          </h3>
          {tracker.amountInr > 0 && (
            <div className="shrink-0 text-right">
              <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                {formatInr(tracker.amountInr)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tracker.billingCycle === 'one_time' ? '' : CYCLE_LABEL[tracker.billingCycle]}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>Due {formatFriendlyDate(tracker.expiryDate)}</span>
          {tracker.reminderDays.length > 0 && (
            <span>Alerts: {tracker.reminderDays.map((d) => `${d}d`).join(', ')}</span>
          )}
        </div>

        {tracker.notes && (
          <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
              {tracker.notes}
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tracker.notes);
                setCopiedNotes(true);
                setTimeout(() => setCopiedNotes(false), 1500);
              }}
              title="Copy notes / order ID"
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              {copiedNotes ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasFile && (
            <button
              type="button"
              onClick={() => onPreviewAttachment(tracker)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              <FileImage className="h-3.5 w-3.5" />
              Bill / Photo
            </button>
          )}

          {safeActionUrl && (
            <a
              href={safeActionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Manage
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {tracker.status === 'active' ? (
            <>
              {isRecurring && (
                <button
                  type="button"
                  onClick={() => onRenew(tracker)}
                  title="Roll deadline forward by 1 cycle"
                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Renewed
                </button>
              )}
              {(tracker.category === 'trial' || tracker.category === 'subscription') && (
                <button
                  type="button"
                  onClick={() => onMarkStatus(tracker, 'cancelled')}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelled
                </button>
              )}
              {isUrgent && (
                <button
                  type="button"
                  onClick={() => onSnooze(tracker)}
                  title="Snooze deadline by +2 days"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  <AlarmClockPlus className="h-3.5 w-3.5" />
                  +2d
                </button>
              )}
              <button
                type="button"
                onClick={() => onMarkStatus(tracker, 'completed')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onMarkStatus(tracker, 'active')}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Active
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onExportIcs(tracker)}
            title="Add to Google / Apple Calendar (.ics)"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(tracker)}
            title="Edit tracker"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tracker)}
            title="Delete tracker"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
