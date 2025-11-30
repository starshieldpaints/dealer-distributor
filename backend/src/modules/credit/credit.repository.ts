import { pool } from '../../db/pool';
import type { AgingBuckets, CreditLedgerEntry, CreditSummary } from './credit.types';

export const getLedgerByDistributor = async (
  distributorId: string,
  limit = 50,
  offset = 0
): Promise<CreditLedgerEntry[]> => {
  const res = await pool.query<CreditLedgerEntry>({
    text: `
      SELECT id,
             distributor_id as "distributorId",
             txn_type as "txnType",
             reference_id as "referenceId",
             debit,
             credit,
             balance_after as "balanceAfter",
             due_date as "dueDate",
             created_at as "createdAt"
      FROM credit_ledgers
      WHERE distributor_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    values: [distributorId, limit, offset]
  });
  return res.rows;
};

export const createCreditHold = async (input: {
  distributorId: string;
  orderId: string;
  reason: string;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO credit_holds (distributor_id, order_id, reason)
      VALUES ($1, $2, $3)
    `,
    values: [input.distributorId, input.orderId, input.reason]
  });
};

export const recordPayment = async (input: {
  distributorId: string;
  amount: number;
  receiptReference: string;
  paymentDate: string;
  notes?: string;
}): Promise<CreditLedgerEntry> => {
  const res = await pool.query<CreditLedgerEntry>({
    text: `
      INSERT INTO credit_ledgers (distributor_id, txn_type, reference_id, debit, credit, balance_after, due_date, notes)
      VALUES ($1, 'payment', $2, 0, $3, (
        SELECT COALESCE(balance_after, 0) - $3 FROM credit_ledgers
        WHERE distributor_id = $1
        ORDER BY created_at DESC LIMIT 1
      ), NULL, $4)
      RETURNING id,
                distributor_id as "distributorId",
                txn_type as "txnType",
                reference_id as "referenceId",
                debit,
                credit,
                balance_after as "balanceAfter",
                due_date as "dueDate",
                created_at as "createdAt"
    `,
    values: [
      input.distributorId,
      input.receiptReference,
      input.amount,
      input.notes ?? null
    ]
  });
  return res.rows[0];
};

export const updateCreditLimit = async (
  distributorId: string,
  creditLimit: number
): Promise<void> => {
  await pool.query('UPDATE distributors SET credit_limit = $2 WHERE id = $1', [
    distributorId,
    creditLimit
  ]);
};

export const getCreditHolds = async (distributorId: string) => {
  const res = await pool.query({
    text: `
      SELECT id, order_id as "orderId", reason, created_at as "createdAt"
      FROM credit_holds
      WHERE distributor_id = $1
      ORDER BY created_at DESC
    `,
    values: [distributorId]
  });
  return res.rows;
};

export const getAgingBuckets = async (distributorId: string): Promise<AgingBuckets> => {
  const res = await pool.query({
    text: `
      SELECT
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN debit ELSE 0 END),0) as current,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days' THEN debit ELSE 0 END),0) as bucket30,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' THEN debit ELSE 0 END),0) as bucket60,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' THEN debit ELSE 0 END),0) as bucket90,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN debit ELSE 0 END),0) as bucket90plus
      FROM credit_ledgers
      WHERE distributor_id = $1
        AND txn_type = 'invoice'
    `,
    values: [distributorId]
  });
  const row = res.rows[0] ?? {};
  return {
    current: Number(row.current ?? 0),
    bucket30: Number(row.bucket30 ?? 0),
    bucket60: Number(row.bucket60 ?? 0),
    bucket90: Number(row.bucket90 ?? 0),
    bucket90plus: Number(row.bucket90plus ?? 0)
  };
};

export const getCreditSummaryRepo = async (distributorId: string): Promise<CreditSummary> => {
  const res = await pool.query({
    text: `
      SELECT
        d.id as "distributorId",
        d.credit_limit as "creditLimit",
        (
          SELECT COALESCE(balance_after,0)
          FROM credit_ledgers
          WHERE distributor_id = d.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as outstanding,
        (
          SELECT COUNT(*) FROM credit_holds ch WHERE ch.distributor_id = d.id
        ) as holds
      FROM distributors d
      WHERE d.id = $1
    `,
    values: [distributorId]
  });
  const row = res.rows[0];
  if (!row) {
    throw new Error('Distributor not found');
  }
  const outstanding = Number(row.outstanding ?? 0);
  const limit = row.creditLimit !== null ? Number(row.creditLimit) : null;
  const utilization = limit && limit > 0 ? outstanding / limit : 0;
  return {
    distributorId: row.distributorId,
    creditLimit: limit,
    outstanding,
    holds: Number(row.holds ?? 0),
    utilization
  };
};
