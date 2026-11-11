import { Bell, LogIn, LogOut, Moon, Plus, ShieldCheck, Sun } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenNewTracker: () => void;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  darkMode,
  onToggleDark,
  onOpenNewTracker,
  onOpenAlerts,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs sm:h-9 sm:w-9">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">
                DueGuard
              </span>
              {user ? (
                <span className="hidden whitespace-nowrap rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 sm:inline-flex dark:bg-teal-950 dark:text-teal-300">
                  Cloud Sync
                </span>
              ) : (
                <span className="hidden whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:inline-flex dark:bg-amber-950 dark:text-amber-300">
                  Local Demo
                </span>
              )}
            </div>
            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              Trials, returns, recharges & warranty vault
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenNewTracker}
            className="hidden whitespace-nowrap items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Add Tracker
          </button>

          <button
            type="button"
            onClick={onOpenAlerts}
            title="Alerts, Backup & Settings"
            aria-label="Alerts, Backup and Settings"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Alerts</span>
          </button>

          <button
            type="button"
            onClick={onToggleDark}
            aria-label="Toggle color theme"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 sm:h-9 sm:w-9 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={onLogout}
              title={`Signed in as ${user.email} — Click to sign out`}
              aria-label="Sign out"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 md:h-auto md:w-auto md:gap-1.5 md:px-3 md:py-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl bg-slate-900 px-2.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 sm:h-auto sm:px-3 sm:py-2 sm:text-xs dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">Sync</span>
              <span className="hidden sm:inline">Sync Account</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
