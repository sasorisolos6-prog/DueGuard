import { Bell, Crown, LogIn, LogOut, Moon, Plus, ShieldCheck, Sun } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenNewTracker: () => void;
  onOpenAlerts: () => void;
  onOpenPro: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  darkMode,
  onToggleDark,
  onOpenNewTracker,
  onOpenAlerts,
  onOpenPro,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                DueGuard
              </span>
              {user ? (
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  Cloud Sync
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Local Demo
                </span>
              )}
            </div>
            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              Trials, returns, recharges & warranty vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewTracker}
            className="hidden items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Add Tracker
          </button>

          <button
            type="button"
            onClick={onOpenAlerts}
            title="Alerts, Backup & Settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Alerts</span>
          </button>

          <button
            type="button"
            onClick={onOpenPro}
            title="DueGuard Pro Plans"
            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>{user?.plan === 'pro' ? 'Pro' : 'Upgrade'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDark}
            aria-label="Toggle color theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={onLogout}
              title={`Signed in as ${user.email} — Click to sign out`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sync Account</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
