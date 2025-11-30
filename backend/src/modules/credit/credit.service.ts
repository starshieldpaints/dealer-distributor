import { HttpError } from '../../lib/httpError';
import {
  createCreditHold,
  getLedgerByDistributor,
  getAgingBuckets,
  getCreditHolds,
  getCreditSummaryRepo,
  recordPayment,
  updateCreditLimit
} from './credit.repository';
import type { AgingBuckets, CreditLedgerEntry, CreditSummary } from './credit.types';
import type { Request } from 'express';
import { emitIntegrationEvent } from '../integrations/integration.service';
import { recordAuditEvent } from '../audit/audit.service';

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
  const scopedId = user.distributorId;
  if (!scopedId) {
    throw new HttpError(403, 'No distributor scope assigned');
  }
  if (requested && requested !== scopedId) {
    throw new HttpError(403, 'Access denied for requested distributor');
  }
  return scopedId;
};

export const getLedger = async (
  input: { distributorId?: string; limit?: number; offset?: number },
  user: Request['user'] | undefined
): Promise<CreditLedgerEntry[]> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await getLedgerByDistributor(distributorId, input.limit, input.offset);
};

export const getCreditSummary = async (
  distributorId: string,
  user: Request['user'] | undefined
): Promise<CreditSummary> => {
  const scopedId = resolveDistributorScope(user, distributorId);
  return await getCreditSummaryRepo(scopedId);
};

export const placeCreditHold = async (
  input: { distributorId?: string; orderId: string; reason: string },
  user: Request['user'] | undefined
): Promise<void> => {
  if (!input.reason) {
    throw new HttpError(400, 'Credit hold reason is required');
  }
  const distributorId = resolveDistributorScope(user, input.distributorId);
  await createCreditHold({
    distributorId,
    orderId: input.orderId,
    reason: input.reason
  });
};

export const listCreditHolds = async (
  distributorId: string,
  user: Request['user'] | undefined
) => {
  const scopedId = resolveDistributorScope(user, distributorId);
  return await getCreditHolds(scopedId);
};

export const updateLimit = async (
  distributorId: string,
  creditLimit: number,
  user: Request['user'] | undefined
): Promise<void> => {
  const scopedId = resolveDistributorScope(user, distributorId);
  await updateCreditLimit(scopedId, creditLimit);
  await recordAuditEvent({
    action: 'credit.limit_updated',
    resource: 'credit_limit',
    userId: user?.id ?? null,
    metadata: { distributorId: scopedId, creditLimit }
  });
};

export const getAging = async (
  distributorId: string,
  user: Request['user'] | undefined
): Promise<AgingBuckets> => {
  const scopedId = resolveDistributorScope(user, distributorId);
  return await getAgingBuckets(scopedId);
};

export const logPayment = async (
  input: {
    distributorId?: string;
    amount: number;
    receiptReference: string;
    paymentDate: string;
    notes?: string;
  },
  user: Request['user'] | undefined
): Promise<void> => {
  if (input.amount <= 0) {
    throw new HttpError(400, 'Amount must be positive');
  }
  const distributorId = resolveDistributorScope(user, input.distributorId);
  const ledgerEntry = await recordPayment({
    distributorId,
    amount: input.amount,
    receiptReference: input.receiptReference,
    paymentDate: input.paymentDate,
    notes: input.notes
  });
  await emitIntegrationEvent('payment.collected', {
    distributorId,
    amount: input.amount,
    referenceId: input.receiptReference,
    ledgerId: ledgerEntry.id
  });
  await recordAuditEvent({
    action: 'credit.payment_recorded',
    resource: 'credit_ledger',
    userId: user?.id ?? null,
    metadata: {
      distributorId,
      ledgerId: ledgerEntry.id,
      amount: input.amount
    }
  });
};
