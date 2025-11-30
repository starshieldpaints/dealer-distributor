import {
  createSchemeClaimRecord,
  createSchemeRecord,
  listSchemes,
  getSchemeById
} from './scheme.repository';
import type { Scheme, SchemeClaim } from './scheme.types';
import { HttpError } from '../../lib/httpError';
import type { Request } from 'express';

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role === 'admin') {
    if (!requested) throw new HttpError(400, 'distributorId is required');
    return requested;
  }
  const scopedId = user.distributorId;
  if (!scopedId) {
    throw new HttpError(403, 'No distributor scope assigned');
  }
  if (requested && requested !== scopedId) {
    throw new HttpError(403, 'Access denied for requested distributor');
  }
  return scopedId;
};

export const getSchemes = async (input: {
  status?: 'active' | 'expired' | 'upcoming';
  limit?: number;
  offset?: number;
}): Promise<Scheme[]> => {
  return await listSchemes(input.status, input.limit, input.offset);
};

export const createScheme = async (input: {
  name: string;
  type: 'volume' | 'combo' | 'period' | 'price';
  startDate: string;
  endDate: string;
  geoScope?: string;
  budget?: number;
  formula: Record<string, unknown>;
}): Promise<Scheme> => {
  return await createSchemeRecord(input);
};

export const evaluateSchemeEligibility = async (
  schemeId: string,
  metrics: { quantity?: number; amount?: number }
): Promise<{ eligible: boolean; message: string }> => {
  const scheme = await getSchemeById(schemeId);
  if (!scheme) throw new HttpError(404, 'Scheme not found');
  const minQuantity = (scheme as any).formula?.minQuantity ?? 0;
  const minAmount = (scheme as any).formula?.minAmount ?? 0;
  const meetsQty = metrics.quantity === undefined || metrics.quantity >= minQuantity;
  const meetsAmount = metrics.amount === undefined || metrics.amount >= minAmount;
  return {
    eligible: meetsQty && meetsAmount,
    message: meetsQty && meetsAmount ? 'Eligible' : 'Criteria not met'
  };
};

export const submitSchemeClaim = async (
  input: {
    schemeId: string;
    distributorId?: string;
    claimedAmount: number;
    notes?: string;
  },
  user: Request['user'] | undefined
): Promise<SchemeClaim> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  if (input.claimedAmount <= 0) {
    throw new HttpError(400, 'Claimed amount must be positive');
  }
  return await createSchemeClaimRecord({
    schemeId: input.schemeId,
    distributorId,
    claimedAmount: input.claimedAmount,
    notes: input.notes
  });
};
