import type { Tracker, TrackerFormInput, TrackerSummary } from '../types';
import { addDaysToTodayIso, daysUntil } from './utils';

const DEMO_STORAGE_KEY = 'dueguard_local_demo_v1';

function createInitialSamples(): Tracker[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'sample-trial-canva',
      title: 'Canva Pro 14-Day Trial',
      category: 'trial',
      amountInr: 500,
      billingCycle: 'monthly',
      expiryDate: addDaysToTodayIso(2),
      reminderDays: [3, 1, 0],
      autoRenews: true,
      status: 'active',
      notes: 'Cancel via Google Play Subscriptions if not needed.',
      actionUrl: 'https://play.google.com/store/account/subscriptions',
      hasAttachment: false,
      attachmentName: null,
      attachmentMime: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-return-shoes',
      title: 'Myntra Sneakers Return Window',
      category: 'return_window',
      amountInr: 2499,
      billingCycle: 'one_time',
      expiryDate: addDaysToTodayIso(5),
      reminderDays: [3, 1, 0],
      autoRenews: false,
      status: 'active',
      notes: 'Keep shoe box tag intact until sure about sizing.',
      actionUrl: 'https://www.myntra.com/my/orders',
      hasAttachment: false,
      attachmentName: null,
      attachmentMime: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-jio-recharge',
      title: 'Jio 84-Day Recharge Plan',
      category: 'recharge',
      amountInr: 859,
      billingCycle: 'quarterly',
      expiryDate: addDaysToTodayIso(19),
      reminderDays: [7, 3, 1],
      autoRenews: false,
      status: 'active',
      notes: '2GB/day unlimited 5G plan.',
      actionUrl: '',
      hasAttachment: false,
      attachmentName: null,
      attachmentMime: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sample-sony-warranty',
      title: 'Sony WH-CH720N 1-Yr Warranty',
      category: 'warranty',
      amountInr: 8990,
      billingCycle: 'one_time',
      expiryDate: addDaysToTodayIso(160),
      reminderDays: [30, 7, 1],
      autoRenews: false,
      status: 'active',
      notes: 'Bought from Amazon India during Great Indian Festival.',
      actionUrl: 'https://www.amazon.in/gp/your-account/order-history',
      hasAttachment: false,
      attachmentName: null,
      attachmentMime: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadDemoTrackers(): Tracker[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      const samples = createInitialSamples();
      saveDemoTrackers(samples);
      return samples;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return createInitialSamples();
  }
}

export function saveDemoTrackers(trackers: Tracker[]): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(trackers));
  } catch {
    // Ignore quota failures gracefully
  }
}

export function resetDemoTrackers(): Tracker[] {
  const samples = createInitialSamples();
  saveDemoTrackers(samples);
  return samples;
}

export function createDemoTracker(input: TrackerFormInput): Tracker {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    title: input.title,
    category: input.category,
    amountInr: input.amountInr,
    billingCycle: input.billingCycle,
    expiryDate: input.expiryDate,
    reminderDays: input.reminderDays,
    autoRenews: input.autoRenews,
    status: input.status ?? 'active',
    notes: input.notes,
    actionUrl: input.actionUrl ?? '',
    hasAttachment: false,
    attachmentName: null,
    attachmentMime: null,
    localAttachmentDataUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function computeLocalSummary(trackers: Tracker[]): TrackerSummary {
  let monthlyBurnInr = 0;
  let annualSpendInr = 0;
  let urgentCount = 0;
  let overdueCount = 0;
  let savedInr = 0;
  let activeCount = 0;
  let attachmentCount = 0;

  for (const t of trackers) {
    if (t.hasAttachment || t.localAttachmentDataUrl) attachmentCount++;
    if (t.status === 'cancelled') {
      savedInr += t.amountInr;
      continue;
    }
    if (t.status !== 'active') continue;
    activeCount++;

    const left = daysUntil(t.expiryDate);
    if (left < 0) overdueCount++;
    else if (left <= 7) urgentCount++;

    if (t.billingCycle === 'monthly') {
      monthlyBurnInr += t.amountInr;
      annualSpendInr += t.amountInr * 12;
    } else if (t.billingCycle === 'quarterly') {
      monthlyBurnInr += t.amountInr / 3;
      annualSpendInr += t.amountInr * 4;
    } else if (t.billingCycle === 'yearly') {
      monthlyBurnInr += t.amountInr / 12;
      annualSpendInr += t.amountInr;
    }
  }

  return {
    monthlyBurnInr: Math.round(monthlyBurnInr),
    annualSpendInr: Math.round(annualSpendInr),
    urgentCount,
    overdueCount,
    savedInr: Math.round(savedInr),
    activeCount,
    attachmentCount,
  };
}
