BEGIN;
DROP TABLE IF EXISTS price_list_overrides CASCADE;
ALTER TABLE price_list_items
  DROP COLUMN IF EXISTS mrp,
  DROP COLUMN IF EXISTS promo,
  DROP COLUMN IF EXISTS price_with_tax,
  DROP COLUMN IF EXISTS price_without_tax,
  DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE products
  DROP COLUMN IF EXISTS ratio,
  DROP COLUMN IF EXISTS pack_size,
  DROP COLUMN IF EXISTS hsn_code;
COMMIT;
