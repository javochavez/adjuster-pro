ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS google_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_drive_root_id TEXT;
