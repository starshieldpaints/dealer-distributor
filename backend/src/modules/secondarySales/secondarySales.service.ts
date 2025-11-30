import type { Request } from 'express';
import { HttpError } from '../../lib/httpError';
import {
  createSecondarySale,
  listSecondarySales
} from './secondarySales.repository';
import type { SecondarySale } from './secondarySales.types';

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role === 'admin') {
    if (!requested) throw new HttpError(400, 'distributorId is required');
    return requested;
  }
  const scoped = user.distributorId;
  if (!scoped) throw new HttpError(403, 'No distributor scope assigned');
  if (requested && requested !== scoped) {
    throw new HttpError(403, 'Access denied');
  }
  return scoped;
};

export const getSecondarySales = async (
  input: { distributorId?: string; limit?: number; offset?: number },
  user: Request['user'] | undefined
): Promise<SecondarySale[]> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await listSecondarySales(distributorId, input.limit, input.offset);
};

export const recordSecondarySale = async (
  input: {
    distributorId?: string;
    retailerId: string;
    productId: string;
    quantity: number;
    amount: number;
    saleDate: string;
  },
  user: Request['user'] | undefined
): Promise<SecondarySale> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await createSecondarySale({
    distributorId,
    retailerId: input.retailerId,
    productId: input.productId,
    quantity: input.quantity,
    amount: input.amount,
    saleDate: input.saleDate,
    capturedBy: user?.id
  });
};
