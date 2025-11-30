BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS pack_size TEXT,
  ADD COLUMN IF NOT EXISTS ratio TEXT;

ALTER TABLE price_list_items
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS price_without_tax NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS price_with_tax NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS promo NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(14,2);

CREATE TABLE IF NOT EXISTS price_list_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id),
  product_id UUID NOT NULL REFERENCES products(id),
  distributor_id UUID REFERENCES distributors(id),
  territory_id UUID REFERENCES territories(id),
  discount_percent NUMERIC(5,2),
  price_without_tax NUMERIC(14,2),
  price_with_tax NUMERIC(14,2),
  promo NUMERIC(14,2),
  mrp NUMERIC(14,2),
  currency CHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_override_scope CHECK (
    distributor_id IS NOT NULL
    OR territory_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_price_list_overrides_product ON price_list_overrides(product_id);
CREATE INDEX IF NOT EXISTS idx_price_list_overrides_distributor ON price_list_overrides(distributor_id);
CREATE INDEX IF NOT EXISTS idx_price_list_overrides_territory ON price_list_overrides(territory_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_list_overrides_scope
  ON price_list_overrides (
    price_list_id,
    product_id,
    (COALESCE(distributor_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (COALESCE(territory_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );

COMMIT;
