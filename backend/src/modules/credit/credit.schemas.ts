import { z } from 'zod';

export const getLedgerSchema = {
  params: z.object({
    distributorId: z.string().uuid()
  }),
  query: z.object({
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const createHoldSchema = {
  body: z.object({
    orderId: z.string().uuid(),
    distributorId: z.string().uuid(),
    reason: z.string().max(300)
  })
};

export const recordPaymentSchema = {
  body: z.object({
    distributorId: z.string().uuid(),
    amount: z.number().positive(),
    receiptReference: z.string().max(120),
    paymentDate: z.string().datetime(),
    notes: z.string().max(250).optional()
  })
};

export const editCreditLimitSchema = {
  params: z.object({
    distributorId: z.string().uuid()
  }),
  body: z.object({
    creditLimit: z.number().positive()
  })
};

export const getHoldsSchema = {
  params: z.object({
    distributorId: z.string().uuid()
  })
};

export const getAgingSchema = {
  params: z.object({
    distributorId: z.string().uuid()
  })
};
