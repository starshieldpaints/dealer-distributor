import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '../order.repository';
import { listOrders, createNewOrder } from '../order.service';

vi.mock('../order.repository', () => ({
  getOrders: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  getOrderById: vi.fn()
}));

const mockAdmin = {
  id: 'admin-id',
  email: 'admin@ddms.io',
  role: 'admin' as const,
  distributorId: null
};

const mockDistributor = {
  id: 'user-id',
  email: 'ops@alpha.com',
  role: 'distributor' as const,
  distributorId: 'dist-123'
};

describe('order.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires distributorId for admin listing', async () => {
    await expect(listOrders({}, mockAdmin as any)).rejects.toThrow('distributorId is required');
  });

  it('scopes distributor users automatically when listing', async () => {
    const spy = vi.spyOn(repo, 'getOrders').mockResolvedValue([]);
    await listOrders({}, mockDistributor as any);
    expect(spy).toHaveBeenCalledWith('dist-123', undefined, undefined, undefined);
  });

  it('prevents distributor from querying other distributors', async () => {
    await expect(
      listOrders({ distributorId: 'another' }, mockDistributor as any)
    ).rejects.toThrow('Access to requested distributor denied');
  });

  it('creates order with scoped distributorId for distributor users', async () => {
    const spy = vi.spyOn(repo, 'createOrder').mockResolvedValue({
      id: 'order',
      distributorId: 'dist-123',
      status: 'submitted',
      totalAmount: 0,
      currency: 'USD',
      createdAt: '',
      updatedAt: ''
    } as any);

    await createNewOrder(
      {
        currency: 'USD',
        items: [{ productId: 'prod', quantity: 1, unitPrice: 10 }]
      },
      mockDistributor as any
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        distributorId: 'dist-123'
      })
    );
  });
});
