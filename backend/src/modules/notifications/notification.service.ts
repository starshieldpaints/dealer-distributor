import { logger } from '../../logger';

type Channel = 'email' | 'sms' | 'push';

interface NotificationPayload {
  subject: string;
  body: string;
  channel?: Channel;
  recipient?: string;
}

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  // Placeholder for integration with email/SMS gateways
  logger.info(
    {
      channel: payload.channel ?? 'email',
      recipient: payload.recipient ?? 'unknown',
      subject: payload.subject,
      body: payload.body
    },
    'Notification dispatched'
  );
};
