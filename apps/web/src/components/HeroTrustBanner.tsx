import { Cloud, Download, Lock, Smartphone, X } from 'lucide-react';

interface HeroTrustBannerProps {
  canInstallPwa: boolean;
  onDismiss: () => void;
  onOpenAuth: () => void;
  onInstallPwa: () => void;
}

export function HeroTrustBanner({
  canInstallPwa,
  onDismiss,
  onOpenAuth,
  onInstallPwa,
}: HeroTrustBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-emerald-50/70 p-4 shadow-2xs sm:p-5 dark:border-teal-900/70 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss welcome banner"
        className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="max-w-3xl pr-7 sm:pr-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          <Lock className="h-3 w-3 shrink-0" />
          Open-Source & Private Vault
        </div>
        <h1 className="mt-2 text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-xl dark:text-white">
          Stop losing ₹1,000+ to forgotten trials, missed 7-day returns & lost warranty bills.
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Try everything right here in Local Demo mode—no signup required. Create a free account anytime to sync across Web & Android with automated daily Email & Telegram alerts.
        </p>

        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800 sm:w-auto sm:py-2"
          >
            <Cloud className="h-3.5 w-3.5 shrink-0" />
            Enable Free Cloud Sync
          </button>

          {canInstallPwa ? (
            <button
              type="button"
              onClick={onInstallPwa}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 sm:w-auto sm:py-2 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              Install Web App (PWA)
            </button>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 sm:w-auto dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              Android APK build included via GitHub Actions
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
