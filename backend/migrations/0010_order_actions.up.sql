ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_warehouse_id UUID REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS override_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_wh ON orders(assigned_warehouse_id);

-- returns status already exists; ensure constraint is permissive for transitions
