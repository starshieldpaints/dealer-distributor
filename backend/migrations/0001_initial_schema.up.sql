BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES distributors(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  territory_id TEXT,
  currency CHAR(3) DEFAULT 'USD',
  credit_limit NUMERIC(14,2) DEFAULT 0,
  outstanding_balance NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  name TEXT NOT NULL,
  channel TEXT,
  address JSONB,
  geo_lat NUMERIC(10,6),
  geo_lng NUMERIC(10,6),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','distributor','dealer','field_rep')),
  distributor_id UUID REFERENCES distributors(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID REFERENCES distributors(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES product_categories(id)
);

CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  valid_from DATE,
  valid_to DATE
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  uom TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  price_list_id UUID REFERENCES price_lists(id),
  tax_group TEXT,
  base_price NUMERIC(12,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE price_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id),
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC(12,3) NOT NULL,
  currency CHAR(3) NOT NULL,
  UNIQUE (price_list_id, product_id)
);

CREATE TABLE inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  qty_on_hand NUMERIC(14,3) NOT NULL DEFAULT 0,
  qty_reserved NUMERIC(14,3) NOT NULL DEFAULT 0,
  snapshot_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  delta NUMERIC(14,3) NOT NULL,
  reason TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  formula JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  geo_scope TEXT,
  budget NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scheme_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  status TEXT NOT NULL DEFAULT 'submitted',
  claimed_amount NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  retailer_id UUID REFERENCES retailers(id),
  sales_rep_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'submitted',
  total_amount NUMERIC(14,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'USD',
  notes TEXT,
  approval_comment TEXT,
  credit_hold_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL,
  unit_price NUMERIC(14,3) NOT NULL,
  scheme_id UUID REFERENCES schemes(id),
  discount_amount NUMERIC(14,2) DEFAULT 0
);

CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_order_id UUID NOT NULL REFERENCES orders(id),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  refund_amount NUMERIC(14,2) DEFAULT 0,
  pickup_slot TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_ledgers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  txn_type TEXT NOT NULL,
  reference_id TEXT,
  debit NUMERIC(14,2) DEFAULT 0,
  credit NUMERIC(14,2) DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE secondary_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor_id UUID NOT NULL REFERENCES distributors(id),
  retailer_id UUID NOT NULL REFERENCES retailers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  sale_date DATE NOT NULL,
  captured_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_rep_id UUID NOT NULL REFERENCES users(id),
  retailer_id UUID REFERENCES retailers(id),
  check_in_time TIMESTAMPTZ,
  check_in_geo POINT,
  check_out_time TIMESTAMPTZ,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector TEXT NOT NULL,
  credentials JSONB,
  status TEXT NOT NULL DEFAULT 'disabled',
  last_sync_ts TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMIT;
