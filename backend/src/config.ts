import { loadEnv } from './config/env';

const parseOrigins = (value?: string): string[] => {
  if (!value) return [];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const env = loadEnv();

export const config = {
  nodeEnv: env.nodeEnv,
  port: env.port,
  postgresUrl: env.postgresUrl,
  redisUrl: env.redisUrl ?? '',
  jwtSecret: env.jwtSecret,
  refreshTokenSecret: env.refreshTokenSecret,
  resetTokenSecret: env.resetTokenSecret,
  allowedOrigins: parseOrigins(env.allowedOriginsRaw),
  rateLimit: {
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax
  },
  appUrl: env.appUrl ?? 'http://localhost:5173',
  mfaIssuer: env.mfaIssuer,
  sendgrid: {
    apiKey: env.sendgridApiKey,
    fromEmail: env.sendgridFromEmail
  },
  twilio: {
    accountSid: env.twilioAccountSid,
    authToken: env.twilioAuthToken,
    messagingServiceSid: env.twilioMessagingServiceSid
  },
  secretManagerPrefix: env.secretManagerPrefix,
  piiEncryptionKey: env.piiEncryptionKey,
  uploadsDir: env.uploadsDir,
  dataGov: {
    apiKey: env.dataGovApiKey,
    resourceId: env.dataGovResourceId ?? '5c2f62fe-5afa-4119-a499-fec9d604d5bd',
    baseUrl: env.dataGovBaseUrl ?? 'https://api.data.gov.in/resource/'
  }
};
