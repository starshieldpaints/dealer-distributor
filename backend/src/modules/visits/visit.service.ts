import { HttpError } from '../../lib/httpError';
import {
  createVisit,
  listVisits,
  updateVisitCheckout
} from './visit.repository';
import type { Visit } from './visit.types';
import type { Request } from 'express';

const ensureFieldRep = (user: Request['user'] | undefined): string => {
  if (!user) throw new HttpError(401, 'Authentication required');
  if (user.role !== 'field_rep') {
    throw new HttpError(403, 'Only field reps can access visits');
  }
  return user.id;
};

export const getVisitsForRep = async (
  user: Request['user'] | undefined,
  input: { limit?: number; offset?: number }
): Promise<Visit[]> => {
  const repId = ensureFieldRep(user);
  return await listVisits(repId, input.limit, input.offset);
};

export const createVisitEntry = async (
  user: Request['user'] | undefined,
  input: { retailerId?: string; notes?: string }
): Promise<Visit> => {
  const repId = ensureFieldRep(user);
  return await createVisit({
    salesRepId: repId,
    retailerId: input.retailerId,
    notes: input.notes,
    status: 'in-progress'
  });
};

export const completeVisit = async (
  user: Request['user'] | undefined,
  input: { visitId: string; notes?: string }
): Promise<Visit> => {
  const repId = ensureFieldRep(user);
  const visit = await updateVisitCheckout(
    input.visitId,
    new Date().toISOString(),
    'completed',
    input.notes
  );
  if (!visit || visit.salesRepId !== repId) {
    throw new HttpError(404, 'Visit not found');
  }
  return visit;
};
