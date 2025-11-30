ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive'));

-- price history helper table (optional audit of price changes)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  price_list_id UUID REFERENCES price_lists(id),
  price NUMERIC(14,2),
  currency CHAR(3),
  discount_percent NUMERIC(5,2),
  price_without_tax NUMERIC(14,2),
  price_with_tax NUMERIC(14,2),
  promo NUMERIC(14,2),
  mrp NUMERIC(14,2),
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_price_list ON price_history(price_list_id);
