import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '../credit.repository';
import { getLedger, placeCreditHold, logPayment } from '../credit.service';

vi.mock('../credit.repository', () => ({
  getLedgerByDistributor: vi.fn().mockResolvedValue([]),
  createCreditHold: vi.fn().mockResolvedValue(undefined),
  recordPayment: vi.fn().mockResolvedValue(undefined)
}));

const adminUser = { id: 'admin', role: 'admin', distributorId: null, email: '' };
const distributorUser = { id: 'dist', role: 'distributor', distributorId: 'dist-1', email: '' };

describe('credit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires distributorId for admin ledger request', async () => {
    await expect(getLedger({}, adminUser as any)).rejects.toThrow('distributorId is required');
  });

  it('scopes distributor ledger queries automatically', async () => {
    const spy = vi.spyOn(repo, 'getLedgerByDistributor');
    await getLedger({}, distributorUser as any);
    expect(spy).toHaveBeenCalledWith('dist-1', undefined, undefined);
  });

  it('blocks distributor from other ledgers', async () => {
    await expect(
      getLedger({ distributorId: 'other' }, distributorUser as any)
    ).rejects.toThrow('Access denied for requested distributor');
  });

  it('validates payment amount', async () => {
    await expect(
      logPayment(
        {
          distributorId: 'dist-1',
          amount: 0,
          receiptReference: 'ref',
          paymentDate: new Date().toISOString()
        },
        distributorUser as any
      )
    ).rejects.toThrow('Amount must be positive');
  });
});
