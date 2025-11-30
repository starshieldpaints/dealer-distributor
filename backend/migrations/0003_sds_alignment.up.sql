BEGIN;

CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES territories(id),
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE distributors
  DROP COLUMN IF EXISTS territory_id;

ALTER TABLE distributors
  ADD COLUMN territory_id UUID REFERENCES territories(id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS geo_role TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS credentials_ref TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'integrations_connector_key'
  ) THEN
    ALTER TABLE integrations
      ADD CONSTRAINT integrations_connector_key UNIQUE (connector);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_webhooks_unique
  ON integration_webhooks(integration_id, event_type, target_url);

CREATE TABLE IF NOT EXISTS integration_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES integration_webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES integration_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_code INT,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integration_events
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

COMMIT;
