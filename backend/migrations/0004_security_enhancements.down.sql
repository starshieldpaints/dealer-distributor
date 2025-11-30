BEGIN;
DROP TABLE IF EXISTS audit_logs CASCADE;
ALTER TABLE integration_webhooks DROP CONSTRAINT IF EXISTS integration_webhooks_unique;
DROP EXTENSION IF EXISTS pgcrypto;
COMMIT;
