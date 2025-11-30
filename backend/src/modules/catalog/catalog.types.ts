export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  uom: string;
  categoryId?: string | null;
  categoryName?: string | null;
  priceListId?: string | null;
  price?: number | null;
  currency?: string | null;
  taxGroup?: string | null;
  basePrice?: number | null;
  hsnCode?: string | null;
  packSize?: string | null;
  ratio?: string | null;
  discountPercent?: number | null;
  priceWithoutTax?: number | null;
  priceWithTax?: number | null;
  promo?: number | null;
  mrp?: number | null;
  status?: 'active' | 'inactive';
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface PriceListSummary {
  id: string;
  name: string;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    currency: string;
  }>;
}

export interface ImportHistoryItem {
  id: string;
  name: string;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryItem {
  id: string;
  priceListId?: string | null;
  priceListName?: string | null;
  price?: number | null;
  currency?: string | null;
  discountPercent?: number | null;
  priceWithoutTax?: number | null;
  priceWithTax?: number | null;
  promo?: number | null;
  mrp?: number | null;
  createdAt: string;
}

export interface WarehouseSummary {
  id: string;
  distributorId?: string | null;
  name: string;
  code: string;
  location?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
