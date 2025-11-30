import { pool } from '../../db/pool';
import type {
  ImportHistoryItem,
  PriceHistoryItem,
  PriceListSummary,
  ProductSummary,
  WarehouseSummary
} from './catalog.types';
import type { User } from '../users/user.types';

export interface PriceListImportRow {
  categoryName?: string;
  productName: string;
  hsnCode?: string;
  qty?: string;
  volume?: string;
  ratio?: string;
  discountPercent?: number;
  priceWithoutTax?: number;
  dpl?: number;
  dplWithTax?: number;
  promo?: number;
  mrp?: number;
}

interface ProductFilter {
  search?: string;
  categoryId?: string;
  priceListId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'price' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

export const listProducts = async (
  filter: ProductFilter
): Promise<ProductSummary[]> => {
  const sortColumn =
    filter.sortBy === 'price'
      ? 'COALESCE(pli.price, p.base_price)'
      : filter.sortBy === 'name'
        ? 'p.name'
        : 'p.updated_at';
  const sortDirection = filter.sortDir === 'asc' ? 'ASC' : 'DESC';
  const res = await pool.query<ProductSummary>({
    text: `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.uom,
        p.category_id as "categoryId",
        c.name as "categoryName",
        COALESCE(pli.price_list_id, p.price_list_id) as "priceListId",
        COALESCE(pli.price, p.base_price) as price,
        COALESCE(pli.currency, pl.currency) as currency,
        p.tax_group as "taxGroup",
        p.base_price as "basePrice",
        p.updated_at as "updatedAt",
        p.hsn_code as "hsnCode",
        p.pack_size as "packSize",
        p.ratio as "ratio",
        pli.discount_percent as "discountPercent",
        pli.price_without_tax as "priceWithoutTax",
        pli.price_with_tax as "priceWithTax",
        pli.promo as "promo",
        pli.mrp as "mrp",
        p.status
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN price_list_items pli ON pli.product_id = p.id
        AND ($3::uuid IS NULL OR pli.price_list_id = $3)
      LEFT JOIN price_lists pl ON pl.id = COALESCE(pli.price_list_id, p.price_list_id)
      WHERE ($1::uuid IS NULL OR p.category_id = $1)
        AND (
          $2::text IS NULL
          OR p.name ILIKE '%' || $2 || '%'
          OR p.sku ILIKE '%' || $2 || '%'
        )
        AND ($6::numeric IS NULL OR COALESCE(pli.price, p.base_price) >= $6)
        AND ($7::numeric IS NULL OR COALESCE(pli.price, p.base_price) <= $7)
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $4 OFFSET $5
    `,
    values: [
      filter.categoryId ?? null,
      filter.search && filter.search.length > 0 ? filter.search : null,
      filter.priceListId ?? null,
      filter.limit ?? 50,
      filter.offset ?? 0,
      filter.minPrice ?? null,
      filter.maxPrice ?? null
    ]
  });
  return res.rows;
};

interface CreateProductInput {
  sku: string;
  name: string;
  uom: string;
  categoryId?: string;
  priceListId?: string;
  taxGroup?: string;
  basePrice?: number;
  price?: number;
}

export const createProduct = async (
  input: CreateProductInput
): Promise<ProductSummary> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productRes = await client.query<ProductSummary>({
      text: `
        INSERT INTO products (sku, name, uom, category_id, price_list_id, tax_group, base_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          sku,
          name,
          uom,
          category_id as "categoryId",
          NULL::text as "categoryName",
          price_list_id as "priceListId",
          base_price as price,
          NULL::text as currency,
          tax_group as "taxGroup",
          base_price as "basePrice",
          updated_at as "updatedAt"
      `,
      values: [
        input.sku,
        input.name,
        input.uom,
        input.categoryId ?? null,
        input.priceListId ?? null,
        input.taxGroup ?? null,
        input.basePrice ?? null
      ]
    });
    const product = productRes.rows[0];
    if (input.priceListId && input.price !== undefined) {
      await client.query({
        text: `
          INSERT INTO price_list_items (price_list_id, product_id, price, currency)
          VALUES (
            $1, $2, $3,
            (SELECT currency FROM price_lists WHERE id = $1)
          )
          ON CONFLICT (price_list_id, product_id)
          DO UPDATE SET price = EXCLUDED.price, currency = EXCLUDED.currency
        `,
        values: [input.priceListId, product.id, input.price]
      });
    }
    await client.query('COMMIT');
    return product;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listPriceLists = async (
  limit = 20,
  offset = 0
): Promise<PriceListSummary[]> => {
  const res = await pool.query<PriceListSummary & { items: any[] }>({
    text: `
      SELECT
        pl.id,
        pl.name,
        pl.currency,
        pl.valid_from as "validFrom",
        pl.valid_to as "validTo",
        COALESCE(
          json_agg(
            jsonb_build_object(
              'productId', p.id,
              'productName', p.name,
              'price', pli.price,
              'currency', pli.currency
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM price_lists pl
      LEFT JOIN price_list_items pli ON pli.price_list_id = pl.id
      LEFT JOIN products p ON p.id = pli.product_id
      GROUP BY pl.id
      ORDER BY pl.valid_from DESC NULLS LAST, pl.name
      LIMIT $1 OFFSET $2
    `,
    values: [limit, offset]
  });
  return res.rows.map((row) => ({
    ...row,
    items: Array.isArray(row.items) ? row.items : []
  }));
};

export const listImportHistory = async (limit = 20): Promise<ImportHistoryItem[]> => {
  const res = await pool.query<ImportHistoryItem>({
    text: `
      SELECT
        id,
        name,
        currency,
        valid_from as "validFrom",
        valid_to as "validTo",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM price_lists
      ORDER BY created_at DESC NULLS LAST
      LIMIT $1
    `,
    values: [limit]
  });
  return res.rows;
};

export const listPriceHistory = async (productId: string, limit = 20): Promise<PriceHistoryItem[]> => {
  const res = await pool.query<PriceHistoryItem>({
    text: `
      SELECT
        ph.id,
        ph.price_list_id as "priceListId",
        pl.name as "priceListName",
        ph.price,
        ph.currency,
        ph.discount_percent as "discountPercent",
        ph.price_without_tax as "priceWithoutTax",
        ph.price_with_tax as "priceWithTax",
        ph.promo as "promo",
        ph.mrp as "mrp",
        ph.created_at as "createdAt"
      FROM price_history ph
      LEFT JOIN price_lists pl ON pl.id = ph.price_list_id
      WHERE ph.product_id = $1
      ORDER BY ph.created_at DESC
      LIMIT $2
    `,
    values: [productId, limit]
  });
  return res.rows;
};

export const updateProduct = async (
  id: string,
  input: Partial<{
    name: string | null;
    uom: string | null;
    categoryId: string | null;
    hsnCode: string | null;
    packSize: string | null;
    ratio: string | null;
    basePrice: number | null;
    taxGroup: string | null;
    status: 'active' | 'inactive';
  }>
): Promise<ProductSummary | null> => {
  const res = await pool.query<ProductSummary>({
    text: `
      UPDATE products
      SET
        name = COALESCE($2, name),
        uom = COALESCE($3, uom),
        category_id = $4,
        hsn_code = $5,
        pack_size = $6,
        ratio = $7,
        base_price = $8,
        tax_group = $9,
        status = COALESCE($10, status),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        sku,
        name,
        uom,
        category_id as "categoryId",
        NULL::text as "categoryName",
        price_list_id as "priceListId",
        base_price as price,
        NULL::text as currency,
        tax_group as "taxGroup",
        base_price as "basePrice",
        hsn_code as "hsnCode",
        pack_size as "packSize",
        ratio,
        NULL::numeric as "discountPercent",
        NULL::numeric as "priceWithoutTax",
        NULL::numeric as "priceWithTax",
        NULL::numeric as "promo",
        NULL::numeric as "mrp",
        status,
        updated_at as "updatedAt"
    `,
    values: [
      id,
      input.name ?? null,
      input.uom ?? null,
      input.categoryId ?? null,
      input.hsnCode ?? null,
      input.packSize ?? null,
      input.ratio ?? null,
      input.basePrice ?? null,
      input.taxGroup ?? null,
      input.status ?? null
    ]
  });
  return res.rows[0] ?? null;
};

export const upsertPriceListItem = async (params: {
  productId: string;
  priceListId: string;
  price?: number | null;
  discountPercent?: number | null;
  priceWithoutTax?: number | null;
  priceWithTax?: number | null;
  promo?: number | null;
  mrp?: number | null;
  currency?: string | null;
  userId?: string | null;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO price_list_items (
        price_list_id, product_id, price, currency,
        discount_percent, price_without_tax, price_with_tax, promo, mrp, updated_at
      ) VALUES (
        $1, $2, $3,
        (SELECT currency FROM price_lists WHERE id = $1),
        $4, $5, $6, $7, $8, NOW()
      )
      ON CONFLICT (price_list_id, product_id)
      DO UPDATE SET
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        discount_percent = EXCLUDED.discount_percent,
        price_without_tax = EXCLUDED.price_without_tax,
        price_with_tax = EXCLUDED.price_with_tax,
        promo = EXCLUDED.promo,
        mrp = EXCLUDED.mrp,
        updated_at = NOW()
    `,
    values: [
      params.priceListId,
      params.productId,
      params.price ?? null,
      params.discountPercent ?? null,
      params.priceWithoutTax ?? null,
      params.priceWithTax ?? null,
      params.promo ?? null,
      params.mrp ?? null
    ]
  });

  await pool.query({
    text: `
      INSERT INTO price_history (
        product_id, price_list_id, price, currency,
        discount_percent, price_without_tax, price_with_tax, promo, mrp, changed_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    values: [
      params.productId,
      params.priceListId,
      params.price ?? null,
      params.currency ?? null,
      params.discountPercent ?? null,
      params.priceWithoutTax ?? null,
      params.priceWithTax ?? null,
      params.promo ?? null,
      params.mrp ?? null,
      params.userId ?? null
    ]
  });
};

export const listWarehouses = async (
  distributorId: string
): Promise<WarehouseSummary[]> => {
  const res = await pool.query<WarehouseSummary>({
    text: `
      SELECT
        id,
        distributor_id as "distributorId",
        name,
        code,
        location,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM warehouses
      WHERE distributor_id = $1
      ORDER BY name
    `,
    values: [distributorId]
  });
  return res.rows;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);

export const importPriceListRows = async (
  rows: PriceListImportRow[],
  priceListId?: string,
  createdBy?: User
): Promise<{ priceListId: string; inserted: number; updated: number }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let targetPriceListId = priceListId;
    if (!targetPriceListId) {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM price_lists ORDER BY valid_from NULLS LAST, name LIMIT 1'
      );
      if (existing.rows.length > 0) {
        targetPriceListId = existing.rows[0].id;
      } else {
        const created = await client.query<{ id: string }>(
          "INSERT INTO price_lists (name, currency, valid_from) VALUES ('Imported Price List', 'USD', CURRENT_DATE) RETURNING id"
        );
        targetPriceListId = created.rows[0].id;
      }
    }

    const priceListCurrencyRes = await client.query<{ currency: string }>(
      'SELECT currency FROM price_lists WHERE id = $1',
      [targetPriceListId]
    );
    const priceListCurrency = priceListCurrencyRes.rows[0]?.currency ?? 'USD';

    const categoryCache = new Map<string, string>();
    const productCache = new Map<string, string>();
    let inserted = 0;
    let updated = 0;

    const ensureCategory = async (name?: string): Promise<string | null> => {
      if (!name) return null;
      const key = name.trim().toLowerCase();
      if (categoryCache.has(key)) return categoryCache.get(key)!;
      const found = await client.query<{ id: string }>(
        'SELECT id FROM product_categories WHERE lower(name) = lower($1) LIMIT 1',
        [name]
      );
      if (found.rows.length > 0) {
        categoryCache.set(key, found.rows[0].id);
        return found.rows[0].id;
      }
      const created = await client.query<{ id: string }>(
        'INSERT INTO product_categories (name) VALUES ($1) RETURNING id',
        [name]
      );
      categoryCache.set(key, created.rows[0].id);
      return created.rows[0].id;
    };

    const ensureProduct = async (
      row: PriceListImportRow,
      categoryId: string | null
    ): Promise<{ id: string }> => {
      const key = row.productName.trim().toLowerCase();
      if (productCache.has(key)) return { id: productCache.get(key)! };
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM products WHERE lower(name) = lower($1) LIMIT 1',
        [row.productName]
      );
      if (existing.rows.length > 0) {
        productCache.set(key, existing.rows[0].id);
        await client.query(
          `
            UPDATE products
            SET category_id = COALESCE($2, category_id),
                hsn_code = COALESCE($3, hsn_code),
                pack_size = COALESCE($4, pack_size),
                ratio = COALESCE($5, ratio),
                updated_at = NOW()
            WHERE id = $1
          `,
          [
            existing.rows[0].id,
            categoryId,
            row.hsnCode ?? null,
            row.qty ?? row.volume ?? null,
            row.ratio ?? null
          ]
        );
        updated += 1;
        return { id: existing.rows[0].id };
      }
      let skuBase = slugify(row.productName);
      if (!skuBase) skuBase = `SKU-${Date.now()}`;
      let sku = skuBase;
      let counter = 1;
      // ensure unique sku
      while (true) {
        const skuCheck = await client.query('SELECT 1 FROM products WHERE sku=$1', [sku]);
        if (skuCheck.rows.length === 0) break;
        sku = `${skuBase}-${counter++}`;
      }
      const created = await client.query<{ id: string }>(
        `
          INSERT INTO products (sku, name, uom, category_id, hsn_code, pack_size, ratio, base_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
        [
          sku,
          row.productName,
          row.volume ?? 'unit',
          categoryId,
          row.hsnCode ?? null,
          row.qty ?? row.volume ?? null,
          row.ratio ?? null,
          row.priceWithoutTax ?? row.dpl ?? row.mrp ?? null
        ]
      );
      productCache.set(key, created.rows[0].id);
      inserted += 1;
      return { id: created.rows[0].id };
    };

    for (const row of rows) {
      if (!row.productName) continue;
      const categoryId = await ensureCategory(row.categoryName);
      const product = await ensureProduct(row, categoryId);
      const price = row.dpl ?? row.priceWithoutTax ?? row.dplWithTax ?? row.mrp ?? 0;
      await client.query(
        `
          INSERT INTO price_list_items (
            price_list_id, product_id, price, currency,
            discount_percent, price_without_tax, price_with_tax, promo, mrp
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (price_list_id, product_id)
          DO UPDATE SET
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            discount_percent = EXCLUDED.discount_percent,
            price_without_tax = EXCLUDED.price_without_tax,
            price_with_tax = EXCLUDED.price_with_tax,
            promo = EXCLUDED.promo,
            mrp = EXCLUDED.mrp
        `,
        [
          targetPriceListId,
          product.id,
          price,
          priceListCurrency,
          row.discountPercent ?? null,
          row.priceWithoutTax ?? null,
          row.dplWithTax ?? null,
          row.promo ?? null,
          row.mrp ?? null
        ]
      );
    }

    await client.query('COMMIT');
    return { priceListId: targetPriceListId, inserted, updated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
