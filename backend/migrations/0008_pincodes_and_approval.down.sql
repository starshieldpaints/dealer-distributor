BEGIN;

ALTER TABLE users
  DROP COLUMN IF EXISTS approval_notes,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approval_status;

DROP INDEX IF EXISTS idx_user_pin_assignments_pin;
DROP TABLE IF EXISTS user_pin_assignments;
DROP TABLE IF EXISTS pincodes;

COMMIT;
