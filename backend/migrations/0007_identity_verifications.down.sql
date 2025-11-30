BEGIN;
DROP TABLE IF EXISTS contact_verification_codes;
DROP INDEX IF EXISTS idx_user_documents_user;
DROP TABLE IF EXISTS user_documents;
DROP TABLE IF EXISTS user_identity_profiles;
ALTER TABLE users DROP COLUMN IF EXISTS parent_user_id;
COMMIT;
