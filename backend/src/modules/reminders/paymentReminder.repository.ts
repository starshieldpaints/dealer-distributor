import { pool } from '../../db/pool';

export interface PendingInvoice {
  ledgerId: string;
  distributorId: string;
  dueDate: string;
  balanceAfter: number;
  email: string | null;
}

export const findInvoicesDueSoon = async (
  windowDays: number
): Promise<PendingInvoice[]> => {
  const res = await pool.query<PendingInvoice>({
    text: `
      SELECT
        cl.id as "ledgerId",
        cl.distributor_id as "distributorId",
        cl.due_date as "dueDate",
        cl.balance_after as "balanceAfter",
        u.email as "email"
      FROM credit_ledgers cl
      LEFT JOIN users u ON u.distributor_id = cl.distributor_id AND u.role = 'distributor'
      WHERE cl.due_date IS NOT NULL
        AND cl.due_date <= (CURRENT_DATE + $1::interval)
        AND cl.balance_after > 0
        AND NOT EXISTS (
          SELECT 1 FROM payment_reminders pr
          WHERE pr.credit_ledger_id = cl.id
            AND pr.reminder_type = 'upcoming'
        )
    `,
    values: [`${windowDays} days`]
  });
  return res.rows;
};

export const findOverdueInvoices = async (): Promise<PendingInvoice[]> => {
  const res = await pool.query<PendingInvoice>({
    text: `
      SELECT
        cl.id as "ledgerId",
        cl.distributor_id as "distributorId",
        cl.due_date as "dueDate",
        cl.balance_after as "balanceAfter",
        u.email as "email"
      FROM credit_ledgers cl
      LEFT JOIN users u ON u.distributor_id = cl.distributor_id AND u.role = 'distributor'
      WHERE cl.due_date IS NOT NULL
        AND cl.due_date < CURRENT_DATE
        AND cl.balance_after > 0
        AND NOT EXISTS (
          SELECT 1 FROM payment_reminders pr
          WHERE pr.credit_ledger_id = cl.id
            AND pr.reminder_type = 'overdue'
        )
    `
  });
  return res.rows;
};

export const recordReminder = async (input: {
  ledgerId: string;
  distributorId: string;
  dueDate: string;
  reminderType: 'upcoming' | 'overdue';
  channel: string;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO payment_reminders (credit_ledger_id, distributor_id, due_date, reminder_type, channel)
      VALUES ($1, $2, $3, $4, $5)
    `,
    values: [input.ledgerId, input.distributorId, input.dueDate, input.reminderType, input.channel]
  });
};
