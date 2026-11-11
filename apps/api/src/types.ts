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

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  APP_BASE_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  plan: PlanTier;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  email_alerts_enabled: number;
  telegram_alerts_enabled: number;
  created_at: string;
}

export interface TrackerRow {
  id: string;
  user_id: string;
  title: string;
  category: TrackerCategory;
  amount_inr: number;
  billing_cycle: BillingCycle;
  expiry_date: string;
  reminder_days: string;
  auto_renews: number;
  status: TrackerStatus;
  notes: string;
  action_url: string;
  attachment_key: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
}

export interface AppVariables {
  authUser: AuthUser;
}

export const PLAN_LIMITS: Record<
  PlanTier,
  { maxActiveTrackers: number; maxAttachments: number; priceInrYear: number; priceInrMonth: number }
> = {
  free: {
    maxActiveTrackers: 10,
    maxAttachments: 2,
    priceInrYear: 0,
    priceInrMonth: 0,
  },
  pro: {
    maxActiveTrackers: 1000,
    maxAttachments: 1000,
    priceInrYear: 149,
    priceInrMonth: 29,
  },
};
