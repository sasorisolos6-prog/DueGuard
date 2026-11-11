import { useState } from 'react';
import { Check, Crown, ShieldCheck, X } from 'lucide-react';
import type { UsageInfo, UserProfile } from '../types';

interface ProModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  usage: UsageInfo | null;
  onClose: () => void;
  onOpenAuth: () => void;
}

export function ProModal({ isOpen, user, usage, onClose, onOpenAuth }: ProModalProps) {
  const [billing, setBilling] = useState<'yearly' | 'monthly'>('yearly');

  if (!isOpen) return null;

  const freeFeatures = [
    'Up to 10 active deadlines at a time',
    'Up to 2 compressed invoice screenshots',
    'Daily Email, Telegram & Android local alerts',
    'Monthly Subscription Burn ₹ calculator',
    '1-click Calendar (.ics) & JSON export',
  ];

  const proFeatures = [
    'Unlimited active trials, returns, warranties & bills',
    'Unlimited private invoice & receipt screenshots',
    'Custom multi-stage reminder schedules (30d/14d/7d/1d)',
    'Priority escalation & early-access new presets',
    'Directly funds open-source, ad-free development',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              DueGuard Pro
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              Save one ₹999 unwanted renewal—pay for 6 years of DueGuard
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {usage ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              Usage ({user?.plan.toUpperCase()}):{' '}
              <strong>
                {usage.activeTrackers}/{usage.limits.maxActiveTrackers}
              </strong>{' '}
              active ·{' '}
              <strong>
                {usage.attachments}/{usage.limits.maxAttachments}
              </strong>{' '}
              screenshots
            </div>
          ) : (
            <div />
          )}

          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                billing === 'yearly'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Yearly (Save 57%)
            </button>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                billing === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Free Forever</h3>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              ₹0 <span className="text-xs font-normal text-slate-500">/ forever</span>
            </p>
            <ul className="mt-4 space-y-2">
              {freeFeatures.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-teal-600 bg-teal-50/30 p-4 dark:border-teal-500 dark:bg-teal-950/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {billing === 'yearly' ? 'Pro Annual Pass' : 'Pro Monthly Pass'}
              </h3>
              <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                {billing === 'yearly' ? 'BEST VALUE' : 'FLEXIBLE'}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {billing === 'yearly' ? '₹149' : '₹29'}{' '}
              <span className="text-xs font-normal text-slate-500">
                {billing === 'yearly' ? '/ year (just ₹12/mo)' : '/ month'}
              </span>
            </p>
            <ul className="mt-4 space-y-2">
              {proFeatures.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full rounded-xl bg-teal-700 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Create Free Account First
                </button>
              ) : user.plan === 'pro' ? (
                <div className="rounded-xl bg-emerald-100 py-2 text-center text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Pro Pass Active
                </div>
              ) : (
                <div className="rounded-xl border border-teal-200 bg-white p-2.5 text-center text-[11px] text-slate-600 dark:border-teal-800 dark:bg-slate-900 dark:text-slate-300">
                  Connect your Razorpay / Cashfree UPI key when deploying your custom domain to activate live ₹{billing === 'yearly' ? '149/yr' : '29/mo'} passes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
