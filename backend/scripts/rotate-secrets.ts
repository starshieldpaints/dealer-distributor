import fs from 'fs';
import path from 'path';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';
import { logger } from '../src/logger';

dotenv.config();

const SECRET_KEYS = [
  { envKey: 'JWT_SECRET', secretName: 'jwt-secret' },
  { envKey: 'REFRESH_TOKEN_SECRET', secretName: 'refresh-secret' },
  { envKey: 'RESET_TOKEN_SECRET', secretName: 'reset-secret' }
];

const run = async (): Promise<void> => {
  const prefix = process.env.SECRET_MANAGER_PREFIX;
  if (!prefix) {
    throw new Error('SECRET_MANAGER_PREFIX environment variable is not set');
  }
  const client = new SecretManagerServiceClient();
  const replacements: Record<string, string> = {};

  for (const entry of SECRET_KEYS) {
    const name = `${prefix}/${entry.secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${name} has no payload`);
    }
    replacements[entry.envKey] = payload.trim();
  }

  const envPath = path.resolve(__dirname, '..', '.env');
  const current = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8')
    : '';
  const output = current.split('\n').map((line) => {
    const [key] = line.split('=');
    if (key && replacements[key]) {
      return `${key}=${replacements[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(replacements)) {
    if (!output.some((line) => line.startsWith(`${key}=`))) {
      output.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(envPath, output.join('\n'), 'utf-8');
  logger.info(
    { envPath, keysRotated: Object.keys(replacements) },
    'Secrets rotated via Secret Manager'
  );
};

run().catch((error) => {
  logger.error({ error }, 'Failed to rotate secrets');
  process.exitCode = 1;
});
