import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export const useDashboardMetrics = (params: { distributorId?: string }, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['dashboard', params.distributorId],
    queryFn: async () => {
      if (!params.distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get(`/analytics/distributors/${params.distributorId}/performance`);
      return data.data;
    },
    enabled: options?.enabled ?? Boolean(params.distributorId),
    staleTime: 30_000
  });
};

interface OrdersParams {
  distributorId?: string;
  status?: string;
}

export const useOrders = (params: OrdersParams = {}, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.distributorId) queryParams.distributorId = params.distributorId;
      if (params.status) queryParams.status = params.status;
      const { data } = await apiClient.get('/orders', { params: queryParams });
      return data.data;
    },
    enabled: options?.enabled ?? true
  });
};

export interface CreateOrderPayload {
  distributorId?: string;
  retailerId?: string;
  currency?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    schemeId?: string;
    discountAmount?: number;
  }>;
  notes?: string;
}

export const createOrderRequest = async (payload: CreateOrderPayload) => {
  const { data } = await apiClient.post('/orders', payload);
  return data.data;
};

export const useInventory = (
  params: { warehouseId?: string; distributorId?: string },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/inventory/snapshots', {
        params
      });
      return data.data;
    },
    enabled: options?.enabled ?? true
  });
};

export const useWarehouses = (params: { distributorId?: string } = {}, options?: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ['warehouses', params.distributorId],
    queryFn: async () => {
      const { data } = await apiClient.get('/inventory/warehouses', { params });
      return data.data;
    },
    enabled: options?.enabled ?? true
  });
};

export const adjustInventoryRequest = async (payload: {
  warehouseId: string;
  distributorId?: string;
  adjustments: Array<{ productId: string; delta: number; reason: string }>;
}) => {
  const { data } = await apiClient.post('/inventory/adjustments', payload);
  return data;
};

export const transferInventoryRequest = async (payload: {
  fromWarehouseId: string;
  toWarehouseId: string;
  distributorId?: string;
  items: Array<{ productId: string; quantity: number; reason: string }>;
}) => {
  const { data } = await apiClient.post('/inventory/transfers', payload);
  return data;
};

export const damageInventoryRequest = async (payload: {
  warehouseId: string;
  distributorId?: string;
  items: Array<{ productId: string; quantity: number; reason: string }>;
}) => {
  const { data } = await apiClient.post('/inventory/damage', payload);
  return data;
};

export const useCreditLedger = (
  distributorId?: string,
  options?: { enabled?: boolean; limit?: number; offset?: number }
) => {
  return useQuery({
    queryKey: ['credit-ledger', distributorId, options?.limit, options?.offset],
    queryFn: async () => {
      if (!distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get(`/credit/${distributorId}/ledger`, {
        params: {
          limit: options?.limit ?? 50,
          offset: options?.offset ?? 0
        }
      });
      return data.data;
    },
    enabled: options?.enabled ?? Boolean(distributorId)
  });
};

export const useCreditSummary = (distributorId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['credit-summary', distributorId],
    queryFn: async () => {
      if (!distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get(`/credit/${distributorId}/summary`);
      return data.data;
    },
    enabled: options?.enabled ?? Boolean(distributorId)
  });
};

export const useCreditHolds = (distributorId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['credit-holds', distributorId],
    queryFn: async () => {
      if (!distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get(`/credit/${distributorId}/holds`);
      return data.data;
    },
    enabled: options?.enabled ?? Boolean(distributorId)
  });
};

export const useCreditAging = (distributorId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['credit-aging', distributorId],
    queryFn: async () => {
      if (!distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get(`/credit/${distributorId}/aging`);
      return data.data;
    },
    enabled: options?.enabled ?? Boolean(distributorId)
  });
};

export const updateCreditLimitRequest = async (distributorId: string, creditLimit: number) => {
  await apiClient.patch(`/credit/${distributorId}/limit`, { creditLimit });
};

export const useSecondarySales = (params: { distributorId?: string; limit?: number } = {}) => {
  return useQuery({
    queryKey: ['secondary-sales', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/secondary-sales', { params });
      return data.data;
    }
  });
};

export const createSecondarySaleRequest = async (payload: {
  distributorId?: string;
  retailerId: string;
  productId: string;
  quantity: number;
  amount: number;
  saleDate: string;
}) => {
  const { data } = await apiClient.post('/secondary-sales', payload);
  return data.data;
};

export const useSchemes = (params: { status?: string } = {}) => {
  return useQuery({
    queryKey: ['schemes', params.status],
    queryFn: async () => {
      const { data } = await apiClient.get('/schemes', {
        params: params.status ? { status: params.status } : undefined
      });
      return data.data;
    }
  });
};

export const submitSchemeClaimRequest = async (payload: {
  schemeId: string;
  distributorId?: string;
  claimedAmount: number;
  notes?: string;
}) => {
  const { data } = await apiClient.post('/schemes/claims', payload);
  return data.data;
};

export const evaluateSchemeEligibilityRequest = async (
  schemeId: string,
  metrics: { quantity?: number; amount?: number }
) => {
  const { data } = await apiClient.post(`/schemes/${schemeId}/eligibility`, {
    metrics
  });
  return data.data;
};

export const createCreditHoldRequest = async (payload: {
  distributorId?: string;
  orderId: string;
  reason: string;
}) => {
  const { data } = await apiClient.post('/credit/holds', payload);
  return data;
};

export const recordPaymentRequest = async (payload: {
  distributorId?: string;
  amount: number;
  receiptReference: string;
  paymentDate: string;
  notes?: string;
}) => {
  const { data } = await apiClient.post('/credit/payments', payload);
  return data;
};

export const useVisits = (params: { limit?: number } = {}, enabled = true) => {
  return useQuery({
    queryKey: ['visits', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/visits', { params });
      return data.data;
    },
    enabled
  });
};

export const createVisitRequest = async (payload: { retailerId?: string; notes?: string }) => {
  const { data } = await apiClient.post('/visits', payload);
  return data.data;
};

export const completeVisitRequest = async (visitId: string, notes?: string) => {
  const { data } = await apiClient.post(`/visits/${visitId}/complete`, { notes });
  return data.data;
};

export const useNotifications = (
  params: { distributorId?: string; limit?: number } = {},
  enabled = true
) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      if (!params.distributorId) throw new Error('Distributor not specified');
      const { data } = await apiClient.get('/notifications', { params });
      return data.data;
    },
    enabled
  });
};

export const createReturnRequest = async (orderId: string, payload: { reason: string; refundAmount: number }) => {
  const { data } = await apiClient.post(`/orders/${orderId}/returns`, payload);
  return data.data;
};

export const useOrderReturns = (
  params: { distributorId?: string; limit?: number } = {},
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['order-returns', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/orders/returns', { params });
      return data.data;
    },
    enabled: options?.enabled ?? true
  });
};

export const useUserSearch = (q: string, roles?: string[]) => {
  return useQuery({
    queryKey: ['user-search', q, roles?.join(',')],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/search', {
        params: { q: q || undefined, roles: roles?.join(',') || undefined, limit: 10 }
      });
      return data.data as Array<{ id: string; name: string; email: string; role: string; distributorId?: string }>;
    },
    enabled: q.length > 1
  });
};

export const useCatalogProducts = (
  params: {
    search?: string;
    priceListId?: string;
    sortBy?: string;
    sortDir?: string;
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
  } = {}
) => {
  return useQuery({
    queryKey: ['catalog-products', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/catalog/products', { params });
      return data.data;
    }
  });
};

export const usePriceListHistory = (limit = 20) => {
  return useQuery({
    queryKey: ['price-list-history', limit],
    queryFn: async () => {
      const { data } = await apiClient.get('/catalog/price-lists/imports', { params: { limit } });
      return data.data;
    }
  });
};

export const importPriceList = async (file: File, priceListId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (priceListId) formData.append('priceListId', priceListId);
  const { data } = await apiClient.post('/catalog/price-lists/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data as {
    priceListId: string;
    inserted: number;
    updated: number;
    errors?: Array<{ row: number; message: string }>;
  };
};

export const updateProductRequest = async (
  productId: string,
  payload: Partial<{
    name: string | null;
    uom: string | null;
    categoryId: string | null;
    hsnCode: string | null;
    packSize: string | null;
    ratio: string | null;
    basePrice: number | null;
    taxGroup: string | null;
  }>
) => {
  const { data } = await apiClient.patch(`/catalog/products/${productId}`, payload);
  return data.data;
};

export const updatePriceItemRequest = async (
  productId: string,
  payload: {
    priceListId: string;
    price?: number | null;
    discountPercent?: number | null;
    priceWithoutTax?: number | null;
    priceWithTax?: number | null;
    promo?: number | null;
    mrp?: number | null;
  }
) => {
  await apiClient.patch(`/catalog/products/${productId}/price-items`, payload);
};

export const usePriceHistory = (productId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['price-history', productId, limit],
    queryFn: async () => {
      if (!productId) throw new Error('productId required');
      const { data } = await apiClient.get(`/catalog/products/${productId}/price-history`, {
        params: { limit }
      });
      return data.data as Array<{
        id: string;
        priceListName?: string;
        price?: number;
        currency?: string;
        discountPercent?: number;
        priceWithoutTax?: number;
        priceWithTax?: number;
        promo?: number;
        mrp?: number;
        createdAt: string;
      }>;
    },
    enabled: Boolean(productId)
  });
};
