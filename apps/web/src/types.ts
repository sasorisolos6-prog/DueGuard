export type PlanTier = 'free' | 'pro';

export type TrackerCategory =
  | 'trial'
  | 'subscription'
  | 'return_window'
  | 'warranty'
  | 'recharge'
  | 'document'
  | 'custom';

export type BillingCycle = 'one_time' | 'monthly' | 'quarterly' | 'yearly';
export type TrackerStatus = 'active' | 'cancelled' | 'completed';

export interface Tracker {
  id: string;
  title: string;
  category: TrackerCategory;
  amountInr: number;
  billingCycle: BillingCycle;
  expiryDate: string; // YYYY-MM-DD
  reminderDays: number[];
  autoRenews: boolean;
  status: TrackerStatus;
  notes: string;
  actionUrl: string;
  hasAttachment: boolean;
  attachmentName: string | null;
  attachmentMime: string | null;
  localAttachmentDataUrl?: string | null; // Used only in pre-signup Local Demo mode
  createdAt: string;
  updatedAt: string;
}

export interface TrackerSummary {
  monthlyBurnInr: number;
  annualSpendInr: number;
  urgentCount: number;
  overdueCount: number;
  savedInr: number;
  activeCount: number;
  attachmentCount: number;
}

export interface PlanLimits {
  maxActiveTrackers: number;
  maxAttachments: number;
  priceInrYear: number;
  priceInrMonth: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
  emailAlertsEnabled: boolean;
  telegramAlertsEnabled: boolean;
  telegramLinked: boolean;
  telegramLinkCode: string | null;
  telegramBotUsername: string | null;
  createdAt?: string;
}

export interface UsageInfo {
  activeTrackers: number;
  attachments: number;
  limits: PlanLimits;
}

export interface TrackerFormInput {
  title: string;
  category: TrackerCategory;
  amountInr: number;
  billingCycle: BillingCycle;
  expiryDate: string;
  reminderDays: number[];
  autoRenews: boolean;
  status?: TrackerStatus;
  notes: string;
  actionUrl?: string;
}
