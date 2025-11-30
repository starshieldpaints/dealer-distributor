BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS user_identity_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_verified_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  aadhaar_number_encrypted TEXT NOT NULL,
  pan_number_encrypted TEXT NOT NULL,
  bank_account_number_encrypted TEXT,
  bank_ifsc TEXT,
  bank_account_name TEXT,
  upi_id TEXT,
  aadhaar_verified_at TIMESTAMPTZ,
  pan_verified_at TIMESTAMPTZ,
  face_image_path TEXT,
  face_verification_status TEXT NOT NULL DEFAULT 'pending',
  territory_id UUID REFERENCES territories(id),
  aadhaar_document_path TEXT,
  pan_document_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);

CREATE TABLE IF NOT EXISTS contact_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_codes_user_channel
  ON contact_verification_codes(user_id, channel)
  WHERE consumed_at IS NULL;

COMMIT;
