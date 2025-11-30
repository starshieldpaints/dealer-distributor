import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '../inventory.repository';
import { listInventory, adjustInventory } from '../inventory.service';

vi.mock('../inventory.repository', () => ({
  getInventorySnapshots: vi.fn().mockResolvedValue([]),
  applyInventoryAdjustments: vi.fn().mockResolvedValue(undefined)
}));

const adminUser = { id: 'admin', email: '', role: 'admin', distributorId: null };
const distributorUser = { id: 'dist', email: '', role: 'distributor', distributorId: 'dist-1' };

describe('inventory.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires distributorId when admin lists inventory', async () => {
    await expect(listInventory({}, adminUser as any)).rejects.toThrow('distributorId is required');
  });

  it('scopes distributor users automatically', async () => {
    const spy = vi.spyOn(repo, 'getInventorySnapshots');
    await listInventory({}, distributorUser as any);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ distributorId: 'dist-1' }));
  });

  it('rejects adjustments without items', async () => {
    await expect(
      adjustInventory({ warehouseId: 'w1', adjustments: [] }, distributorUser as any)
    ).rejects.toThrow('At least one adjustment is required');
  });

  it('passes adjustments to repository for distributor', async () => {
    const spy = vi.spyOn(repo, 'applyInventoryAdjustments');
    await adjustInventory(
      {
        warehouseId: 'w1',
        adjustments: [{ productId: 'p1', delta: 5, reason: 'test' }]
      },
      distributorUser as any
    );
    expect(spy).toHaveBeenCalled();
  });
});
