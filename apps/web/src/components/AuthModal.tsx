import { useState } from 'react';
import { Cloud, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Tracker, TrackerFormInput } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  localTrackers: Tracker[];
  onClose: () => void;
  onSuccess: (token: string, message: string) => Promise<void>;
}

export function AuthModal({ isOpen, localTrackers, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [importLocal, setImportLocal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const importPayload: TrackerFormInput[] | undefined = importLocal
          ? localTrackers.map((t) => ({
              title: t.title,
              category: t.category,
              amountInr: t.amountInr,
              billingCycle: t.billingCycle,
              expiryDate: t.expiryDate,
              reminderDays: t.reminderDays,
              autoRenews: t.autoRenews,
              status: t.status,
              notes: t.notes,
              actionUrl: t.actionUrl,
            }))
          : undefined;

        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
          importTrackers: importPayload,
        });
        await onSuccess(
          res.token,
          res.importedCount > 0
            ? `Account created & ${res.importedCount} demo trackers synced!`
            : 'Account created! Cloud sync active.'
        );
      } else {
        const res = await api.login({ email: email.trim(), password });
        await onSuccess(res.token, 'Signed in! Your trackers are synced.');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'register' ? 'Create Cloud Sync Account' : 'Sign In to DueGuard'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Sync across Web & Android, enable daily Email & Telegram reminders, and unlock your private invoice vault.
        </p>

        <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Sign Up (Free)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {mode === 'register' && localTrackers.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-2 text-xs text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
              <input
                type="checkbox"
                checked={importLocal}
                onChange={(e) => setImportLocal(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
              <span>Import my {localTrackers.length} local demo trackers into Cloud Sync</span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'register' ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
