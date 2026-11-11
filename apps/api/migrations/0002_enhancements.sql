-- Add optional cancellation / order management URL to trackers
ALTER TABLE trackers ADD COLUMN action_url TEXT NOT NULL DEFAULT '';
