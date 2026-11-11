-- Cardless private vault storage in Cloudflare D1 (no R2 billing required)
CREATE TABLE IF NOT EXISTS tracker_attachments (
  tracker_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracker_attachments_user ON tracker_attachments(user_id);
