import cron from 'node-cron';
import { logger } from '../src/logger';
import { processPaymentReminders } from '../src/modules/reminders/paymentReminder.service';
import { pool } from '../src/db/pool';

const runJob = async () => {
  try {
    await processPaymentReminders();
  } catch (error) {
    logger.error({ error }, 'Payment reminder job failed');
  }
};

cron.schedule('0 * * * *', async () => {
  logger.info('Running hourly payment reminder job');
  await runJob();
});

logger.info('Payment reminder worker started (runs every hour at minute 0)');

process.on('SIGTERM', async () => {
  logger.info('Shutting down reminder worker');
  await pool.end();
  process.exit(0);
});
