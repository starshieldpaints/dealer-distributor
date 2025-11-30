import type { Request } from 'express';
import XLSX from 'xlsx';
import { HttpError } from '../../lib/httpError';
import {
  createProduct,
  importPriceListRows,
  listPriceLists,
  listProducts,
  listWarehouses,
  listImportHistory,
  listPriceHistory,
  updateProduct,
  upsertPriceListItem
} from './catalog.repository';
import type {
  ImportHistoryItem,
  PriceHistoryItem,
  PriceListSummary,
  ProductSummary,
  WarehouseSummary
} from './catalog.types';
import type { PriceListImportRow } from './catalog.repository';

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

interface UpdateProductInput {
  name?: string | null;
  uom?: string | null;
  categoryId?: string | null;
  hsnCode?: string | null;
  packSize?: string | null;
  ratio?: string | null;
  basePrice?: number | null;
  taxGroup?: string | null;
  status?: 'active' | 'inactive';
}

interface UpdatePriceItemInput {
  priceListId: string;
  price?: number | null;
  discountPercent?: number | null;
  priceWithoutTax?: number | null;
  priceWithTax?: number | null;
  promo?: number | null;
  mrp?: number | null;
}

const ensureAdmin = (user: Request['user'] | undefined): void => {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin privileges required');
  }
};

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role === 'admin') {
    if (!requested) {
      throw new HttpError(400, 'distributorId is required');
    }
    return requested;
  }
  const scoped = user.distributorId;
  if (!scoped) {
    throw new HttpError(403, 'No distributor scope');
  }
  if (requested && requested !== scoped) {
    throw new HttpError(403, 'Access denied for requested distributor');
  }
  return scoped;
};

export const fetchProductCatalog = async (
  filter: ProductFilter
): Promise<ProductSummary[]> => {
  return await listProducts({
    ...filter,
    search: filter.search?.trim() || undefined
  });
};

export const createCatalogProduct = async (
  input: CreateProductInput,
  user: Request['user'] | undefined
): Promise<ProductSummary> => {
  ensureAdmin(user);
  if (input.priceListId && typeof input.price !== 'number') {
    throw new HttpError(
      400,
      'price is required when associating with a price list'
    );
  }
  return await createProduct(input);
};

export const updateCatalogProduct = async (
  id: string,
  input: UpdateProductInput,
  user: Request['user'] | undefined
): Promise<ProductSummary> => {
  ensureAdmin(user);
  const updated = await updateProduct(id, input);
  if (!updated) {
    throw new HttpError(404, 'Product not found');
  }
  return updated;
};

export const updateProductPriceItem = async (
  productId: string,
  input: UpdatePriceItemInput,
  user: Request['user'] | undefined
): Promise<void> => {
  ensureAdmin(user);
  if (!input.priceListId) {
    throw new HttpError(400, 'priceListId is required');
  }
  await upsertPriceListItem({
    productId,
    priceListId: input.priceListId,
    price: input.price ?? null,
    discountPercent: input.discountPercent ?? null,
    priceWithoutTax: input.priceWithoutTax ?? null,
    priceWithTax: input.priceWithTax ?? null,
    promo: input.promo ?? null,
    mrp: input.mrp ?? null,
    userId: user?.id ?? null
  });
};

export const fetchPriceListSummaries = async (
  limit?: number,
  offset?: number
): Promise<PriceListSummary[]> => {
  return await listPriceLists(limit ?? 20, offset ?? 0);
};

export const fetchImportHistory = async (limit?: number): Promise<ImportHistoryItem[]> => {
  return await listImportHistory(limit ?? 20);
};

export const fetchPriceHistory = async (
  productId: string,
  limit?: number
): Promise<PriceHistoryItem[]> => {
  return await listPriceHistory(productId, limit ?? 20);
};

export const fetchWarehousesForDistributor = async (
  user: Request['user'] | undefined,
  distributorId?: string
): Promise<WarehouseSummary[]> => {
  const scopedId = resolveDistributorScope(user, distributorId);
  return await listWarehouses(scopedId);
};

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const n = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

export const importPriceListFromXlsx = async (
  buffer: Buffer,
  options: { priceListId?: string; user?: Request['user'] }
) => {
  if (!options.user || options.user.role !== 'admin') {
    throw new HttpError(403, 'Admin privileges required');
  }
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new HttpError(400, 'No sheet found in uploaded file');
  }
  const rowsRaw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  const errors: Array<{ row: number; message: string }> = [];
  const mapped: PriceListImportRow[] = rowsRaw
    .map((row, idx) => {
      const productName = row['Product Name'] ?? row['Product'] ?? '';
      if (!productName || !String(productName).trim()) {
        errors.push({ row: idx + 2, message: 'Product Name is required' }); // +2 accounts for header row
      }
      const priceVal = parseNumber(row['DPL']) ?? parseNumber(row['Price without Tax']) ?? parseNumber(row['MRP']);
      if (priceVal !== undefined && priceVal < 0) {
        errors.push({ row: idx + 2, message: 'Price cannot be negative' });
      }
      return {
        categoryName: row['Category Name'] ?? row['Category'] ?? undefined,
        productName,
        hsnCode: row['HSN'] ?? undefined,
        qty: row['QTY'] ? String(row['QTY']) : undefined,
        volume: row['KGS/Ml/LTr'] ? String(row['KGS/Ml/LTr']) : undefined,
        ratio: row['Ratio'] ? String(row['Ratio']) : undefined,
        discountPercent: parseNumber(row['Discount %']),
        priceWithoutTax: parseNumber(row['Price without Tax']),
        dpl: parseNumber(row['DPL']),
        dplWithTax: parseNumber(row['DPL With Tax']),
        promo: parseNumber(row['Promo']),
        mrp: parseNumber(row['MRP'])
      };
    })
    .filter((r) => r.productName && r.productName.trim().length > 0);

  if (mapped.length === 0) {
    throw new HttpError(400, 'No product rows found in uploaded sheet');
  }

  const result = await importPriceListRows(mapped, options.priceListId, options.user);
  return { ...result, errors };
};
