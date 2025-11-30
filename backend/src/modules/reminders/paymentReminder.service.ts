import {
  findInvoicesDueSoon,
  findOverdueInvoices,
  recordReminder
} from './paymentReminder.repository';
import { sendNotification } from '../notifications/notification.service';

const UPCOMING_WINDOW_DAYS = 3;

export const processPaymentReminders = async (): Promise<void> => {
  const [upcoming, overdue] = await Promise.all([
    findInvoicesDueSoon(UPCOMING_WINDOW_DAYS),
    findOverdueInvoices()
  ]);

  for (const invoice of upcoming) {
    await sendNotification({
      subject: 'Invoice due soon',
      body: `Invoice ${invoice.ledgerId} is due on ${invoice.dueDate}. Outstanding balance: $${invoice.balanceAfter}`,
      recipient: invoice.email ?? invoice.distributorId,
      channel: 'email'
    });
    await recordReminder({
      ledgerId: invoice.ledgerId,
      distributorId: invoice.distributorId,
      dueDate: invoice.dueDate,
      reminderType: 'upcoming',
      channel: 'email'
    });
  }

  for (const invoice of overdue) {
    await sendNotification({
      subject: 'Invoice overdue',
      body: `Invoice ${invoice.ledgerId} is overdue (due ${invoice.dueDate}). Balance: $${invoice.balanceAfter}`,
      recipient: invoice.email ?? invoice.distributorId,
      channel: 'email'
    });
    await recordReminder({
      ledgerId: invoice.ledgerId,
      distributorId: invoice.distributorId,
      dueDate: invoice.dueDate,
      reminderType: 'overdue',
      channel: 'email'
    });
  }
};
