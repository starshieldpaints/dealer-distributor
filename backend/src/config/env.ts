import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL is required'),
  POSTGRES_TEST_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  RESET_TOKEN_SECRET: z.string().min(32).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  MFA_ISSUER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  SECRET_MANAGER_PREFIX: z.string().optional(),
  PII_ENCRYPTION_KEY: z.string().min(32),
  UPLOADS_DIR: z.string().optional(),
  DATA_GOV_API_KEY: z.string().optional(),
  DATA_GOV_RESOURCE_ID: z.string().optional(),
  DATA_GOV_BASE_URL: z.string().optional()
});

type RawEnv = z.infer<typeof envSchema>;

interface AppEnv {
  nodeEnv: RawEnv['NODE_ENV'];
  port: number;
  postgresUrl: string;
  postgresTestUrl?: string;
  redisUrl?: string;
  appUrl?: string;
  jwtSecret: string;
  refreshTokenSecret: string;
  resetTokenSecret: string;
  allowedOriginsRaw: string | undefined;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  mfaIssuer: string;
  sendgridApiKey?: string;
  sendgridFromEmail?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioMessagingServiceSid?: string;
  secretManagerPrefix?: string;
  piiEncryptionKey: string;
  uploadsDir: string;
  dataGovApiKey?: string;
  dataGovResourceId?: string;
  dataGovBaseUrl?: string;
}

let cachedEnv: AppEnv | null = null;

const buildEnv = (): AppEnv => {
  const raw = envSchema.parse(process.env);
  return {
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT ? Number(raw.PORT) : 4000,
    postgresUrl: raw.POSTGRES_URL,
    postgresTestUrl: raw.POSTGRES_TEST_URL,
    redisUrl: raw.REDIS_URL,
    appUrl: raw.APP_URL,
    jwtSecret: raw.JWT_SECRET,
    refreshTokenSecret: raw.REFRESH_TOKEN_SECRET,
    resetTokenSecret: raw.RESET_TOKEN_SECRET ?? raw.REFRESH_TOKEN_SECRET,
    allowedOriginsRaw: raw.ALLOWED_ORIGINS,
    rateLimitWindowMs: Number(raw.RATE_LIMIT_WINDOW_MS ?? '60000'),
    rateLimitMax: Number(raw.RATE_LIMIT_MAX ?? '100'),
    mfaIssuer: raw.MFA_ISSUER ?? 'DealerApp',
    sendgridApiKey: raw.SENDGRID_API_KEY,
    sendgridFromEmail: raw.SENDGRID_FROM_EMAIL,
    twilioAccountSid: raw.TWILIO_ACCOUNT_SID,
    twilioAuthToken: raw.TWILIO_AUTH_TOKEN,
    twilioMessagingServiceSid: raw.TWILIO_MESSAGING_SERVICE_SID,
    secretManagerPrefix: raw.SECRET_MANAGER_PREFIX,
    piiEncryptionKey: raw.PII_ENCRYPTION_KEY,
    uploadsDir: raw.UPLOADS_DIR ?? './uploads',
    dataGovApiKey: raw.DATA_GOV_API_KEY,
    dataGovResourceId: raw.DATA_GOV_RESOURCE_ID,
    dataGovBaseUrl: raw.DATA_GOV_BASE_URL
  };
};

export const loadEnv = (): AppEnv => {
  if (!cachedEnv) {
    cachedEnv = buildEnv();
  }
  return cachedEnv;
};
