import type { BillingCycle, TrackerCategory } from '../types';
import { addDaysToTodayIso } from './utils';

export interface CategoryMeta {
  id: TrackerCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const CATEGORIES: Record<TrackerCategory, CategoryMeta> = {
  trial: {
    id: 'trial',
    label: 'Free Trial',
    shortLabel: 'Trial',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  subscription: {
    id: 'subscription',
    label: 'Subscription',
    shortLabel: 'Sub',
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
  },
  return_window: {
    id: 'return_window',
    label: 'Return Window',
    shortLabel: 'Return',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  },
  warranty: {
    id: 'warranty',
    label: 'Warranty',
    shortLabel: 'Warranty',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  },
  recharge: {
    id: 'recharge',
    label: 'Recharge & Bill',
    shortLabel: 'Recharge',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  },
  document: {
    id: 'document',
    label: 'ID / Insurance / PUC',
    shortLabel: 'Docs',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

export interface QuickPreset {
  id: string;
  label: string;
  defaultTitle: string;
  category: TrackerCategory;
  defaultDays: number;
  defaultAmount: number;
  billingCycle: BillingCycle;
  autoRenews: boolean;
  reminderDays: number[];
  defaultActionUrl?: string;
  hint: string;
}

export const QUICK_LINKS = [
  { label: 'Google Play Subs', url: 'https://play.google.com/store/account/subscriptions' },
  { label: 'Amazon Orders', url: 'https://www.amazon.in/gp/your-account/order-history' },
  { label: 'Flipkart Orders', url: 'https://www.flipkart.com/account/orders' },
  { label: 'Myntra Orders', url: 'https://www.myntra.com/my/orders' },
];

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'free-trial',
    label: 'Free Trial Trap',
    defaultTitle: 'Canva / OTT Free Trial',
    category: 'trial',
    defaultDays: 7,
    defaultAmount: 499,
    billingCycle: 'monthly',
    autoRenews: true,
    reminderDays: [3, 1, 0],
    defaultActionUrl: 'https://play.google.com/store/account/subscriptions',
    hint: 'Reminds you before auto-pay deducts money.',
  },
  {
    id: 'return-window',
    label: '7-Day Return Window',
    defaultTitle: 'Amazon / Myntra Order Return',
    category: 'return_window',
    defaultDays: 7,
    defaultAmount: 1499,
    billingCycle: 'one_time',
    autoRenews: false,
    reminderDays: [3, 1, 0],
    defaultActionUrl: 'https://www.amazon.in/gp/your-account/order-history',
    hint: 'Never get stuck with wrong-size or faulty items.',
  },
  {
    id: 'ott-sub',
    label: 'Monthly OTT / App',
    defaultTitle: 'Netflix / Spotify / YouTube',
    category: 'subscription',
    defaultDays: 30,
    defaultAmount: 199,
    billingCycle: 'monthly',
    autoRenews: true,
    reminderDays: [7, 3, 1],
    hint: 'Included in your Monthly Burn ₹ tracker.',
  },
  {
    id: 'mobile-recharge',
    label: '84-Day Recharge',
    defaultTitle: 'Jio / Airtel 84-Day Plan',
    category: 'recharge',
    defaultDays: 84,
    defaultAmount: 859,
    billingCycle: 'quarterly',
    autoRenews: false,
    reminderDays: [7, 3, 1],
    hint: 'Tracks quarterly telecom & Wi-Fi plans.',
  },
  {
    id: 'warranty',
    label: '1-Yr Warranty + Bill',
    defaultTitle: 'Electronics 1-Yr Warranty',
    category: 'warranty',
    defaultDays: 365,
    defaultAmount: 0,
    billingCycle: 'one_time',
    autoRenews: false,
    reminderDays: [30, 7, 1],
    hint: 'Attach the invoice screenshot right underneath.',
  },
  {
    id: 'puc-insurance',
    label: 'Insurance / PUC / Doc',
    defaultTitle: 'Bike / Car Insurance Renewal',
    category: 'document',
    defaultDays: 365,
    defaultAmount: 2400,
    billingCycle: 'yearly',
    autoRenews: false,
    reminderDays: [14, 7, 1],
    hint: 'Keep policy & renewal deadlines in one place.',
  },
];

export function buildPresetValues(preset: QuickPreset) {
  return {
    title: preset.defaultTitle,
    category: preset.category,
    amountInr: preset.defaultAmount,
    billingCycle: preset.billingCycle,
    expiryDate: addDaysToTodayIso(preset.defaultDays),
    reminderDays: preset.reminderDays,
    autoRenews: preset.autoRenews,
    notes: '',
    actionUrl: preset.defaultActionUrl ?? '',
  };
}
