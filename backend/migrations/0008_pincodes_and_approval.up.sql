BEGIN;

CREATE TABLE IF NOT EXISTS pincodes (
  code TEXT PRIMARY KEY,
  office_name TEXT,
  office_type TEXT,
  delivery_status TEXT,
  division_name TEXT,
  region_name TEXT,
  circle_name TEXT,
  taluk TEXT,
  district_name TEXT,
  state_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_pin_assignments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pincode TEXT NOT NULL REFERENCES pincodes(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pincode)
);

CREATE INDEX IF NOT EXISTS idx_user_pin_assignments_pin ON user_pin_assignments(pincode);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

COMMIT;
