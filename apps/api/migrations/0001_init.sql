-- DueGuard initial D1 schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  telegram_chat_id TEXT,
  telegram_link_code TEXT,
  email_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  telegram_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_code ON users(telegram_link_code);

CREATE TABLE IF NOT EXISTS trackers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('trial', 'subscription', 'return_window', 'warranty', 'recharge', 'document', 'custom')
  ),
  amount_inr REAL NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'one_time' CHECK (
    billing_cycle IN ('one_time', 'monthly', 'quarterly', 'yearly')
  ),
  expiry_date TEXT NOT NULL,
  reminder_days TEXT NOT NULL DEFAULT '[7,3,1]',
  auto_renews INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'cancelled', 'completed')
  ),
  notes TEXT NOT NULL DEFAULT '',
  attachment_key TEXT,
  attachment_mime TEXT,
  attachment_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trackers_user_status ON trackers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trackers_expiry ON trackers(expiry_date, status);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  tracker_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  trigger_day_offset INTEGER NOT NULL,
  sent_for_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_unique
  ON notification_logs(tracker_id, channel, trigger_day_offset, sent_for_date);
