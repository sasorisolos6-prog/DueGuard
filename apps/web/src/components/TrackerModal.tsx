import { useEffect, useState } from 'react';
import { FileImage, Link2, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { buildPresetValues, CATEGORIES, QUICK_LINKS, QUICK_PRESETS } from '../lib/presets';
import { addDaysToTodayIso, compressImageToWebp, isSafeHttpUrl } from '../lib/utils';
import type { BillingCycle, Tracker, TrackerCategory, TrackerFormInput } from '../types';

interface TrackerModalProps {
  isOpen: boolean;
  editingTracker: Tracker | null;
  onClose: () => void;
  onSave: (input: TrackerFormInput, attachmentFile: File | null, editingId?: string) => Promise<void>;
}

const REMINDER_OPTIONS = [
  { days: 30, label: '30d' },
  { days: 14, label: '14d' },
  { days: 7, label: '7d' },
  { days: 3, label: '3d' },
  { days: 1, label: '1d' },
  { days: 0, label: 'Same day' },
];

export function TrackerModal({
  isOpen,
  editingTracker,
  onClose,
  onSave,
}: TrackerModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TrackerCategory>('trial');
  const [amountInr, setAmountInr] = useState('499');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [expiryDate, setExpiryDate] = useState(() => addDaysToTodayIso(7));
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1, 0]);
  const [autoRenews, setAutoRenews] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setAttachmentFile(null);
    if (editingTracker) {
      setTitle(editingTracker.title);
      setCategory(editingTracker.category);
      setAmountInr(String(editingTracker.amountInr));
      setBillingCycle(editingTracker.billingCycle);
      setExpiryDate(editingTracker.expiryDate);
      setReminderDays(editingTracker.reminderDays);
      setAutoRenews(editingTracker.autoRenews);
      setNotes(editingTracker.notes);
      setActionUrl(editingTracker.actionUrl || '');
    } else {
      setTitle('');
      setCategory('trial');
      setAmountInr('499');
      setBillingCycle('monthly');
      setExpiryDate(addDaysToTodayIso(7));
      setReminderDays([3, 1, 0]);
      setAutoRenews(true);
      setNotes('');
      setActionUrl('');
    }
  }, [isOpen, editingTracker]);

  if (!isOpen) return null;

  function applyPreset(presetId: string) {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const vals = buildPresetValues(preset);
    setTitle(vals.title);
    setCategory(vals.category);
    setAmountInr(String(vals.amountInr));
    setBillingCycle(vals.billingCycle);
    setExpiryDate(vals.expiryDate);
    setReminderDays(vals.reminderDays);
    setAutoRenews(vals.autoRenews);
    setActionUrl(vals.actionUrl);
  }

  function toggleReminderDay(day: number) {
    setReminderDays((prev) => {
      if (prev.includes(day)) {
        return prev.length > 1 ? prev.filter((d) => d !== day) : prev;
      }
      return [...prev, day].sort((a, b) => b - a);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image screenshot (PNG, JPG, or WebP).');
      return;
    }
    setCompressing(true);
    setError(null);
    try {
      const compressed = await compressImageToWebp(file);
      setAttachmentFile(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a name for this item.');
      return;
    }
    const cleanUrl = actionUrl.trim();
    if (cleanUrl && !isSafeHttpUrl(cleanUrl)) {
      setError('Cancel / Manage URL must start with https:// or http://');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          category,
          amountInr: Number(amountInr) || 0,
          billingCycle,
          expiryDate,
          reminderDays,
          autoRenews,
          notes: notes.trim(),
          actionUrl: cleanUrl,
        },
        attachmentFile,
        editingTracker?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tracker.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingTracker ? 'Edit Tracker' : 'Protect a New Deadline'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!editingTracker && (
          <div className="mt-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" />
              1-Tap Indian Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-600 dark:hover:bg-teal-950/60"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g., Amazon Prime Trial, Shoes Return, Laptop Warranty"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TrackerCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {Object.values(CATEGORIES).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deadline / Expiry Date
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Amount at Stake (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={amountInr}
                onChange={(e) => setAmountInr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Billing Cycle
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="one_time">One-time / Warranty</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (84d / 3m)</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remind Me Before Deadline
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_OPTIONS.map((opt) => {
                const selected = reminderDays.includes(opt.days);
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => toggleReminderDay(opt.days)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      selected
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Auto-Renew / UPI AutoPay Enabled
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Adds an urgent cancel warning inside alerts
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoRenews}
              onChange={(e) => setAutoRenews(e.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attach Invoice / Order Screenshot (Optional)
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-xs transition hover:border-teal-500 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                {compressing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                ) : attachmentFile ? (
                  <FileImage className="h-4 w-4 text-teal-600" />
                ) : (
                  <Upload className="h-4 w-4 text-slate-400" />
                )}
                <span>
                  {compressing
                    ? 'Compressing screenshot to WebP...'
                    : attachmentFile
                      ? `${attachmentFile.name} (${Math.round(attachmentFile.size / 1024)} KB)`
                      : editingTracker?.hasAttachment
                        ? `Current: ${editingTracker.attachmentName || 'Saved bill'} (tap to replace)`
                        : 'Upload receipt or warranty screenshot (auto-compressed)'}
                </span>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cancel / Order Page URL (Optional)
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                maxLength={500}
                placeholder="https://play.google.com/store/account/subscriptions"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {QUICK_LINKS.map((ql) => (
                <button
                  key={ql.label}
                  type="button"
                  onClick={() => setActionUrl(ql.url)}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  + {ql.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes (Cancel URL, Order ID, Store)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="e.g., Order #402-192837, cancel in PhonePe AutoPay"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || compressing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTracker ? 'Save Changes' : 'Save Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
