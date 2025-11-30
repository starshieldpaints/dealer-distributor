BEGIN;

CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_ledger_id UUID NOT NULL REFERENCES credit_ledgers(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  reminder_type TEXT NOT NULL, -- e.g., 'upcoming', 'overdue'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL DEFAULT 'email'
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_distributor ON payment_reminders(distributor_id);

COMMIT;
