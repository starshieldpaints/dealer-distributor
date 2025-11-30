import { pool } from '../../db/pool';

export interface NotificationLog {
  id: string;
  distributorId: string;
  reminderType: string;
  dueDate: string;
  sentAt: string;
  channel: string;
}

export const getNotificationLogs = async (
  distributorId?: string,
  limit = 20,
  offset = 0
): Promise<NotificationLog[]> => {
  const res = await pool.query<NotificationLog>({
    text: `
      SELECT id,
             distributor_id as "distributorId",
             reminder_type as "reminderType",
             due_date as "dueDate",
             sent_at as "sentAt",
             channel
      FROM payment_reminders
      WHERE ($1::uuid IS NULL OR distributor_id = $1)
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `,
    values: [distributorId ?? null, limit, offset]
  });
  return res.rows;
};
