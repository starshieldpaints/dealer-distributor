import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { config } from '../config';

const key = Buffer.from(config.piiEncryptionKey, 'hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const ensureKeyLength = (): void => {
  if (key.length !== 32) {
    throw new Error('PII_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
};

ensureKeyLength();

export const encryptSensitive = (value: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  return payload;
};

export const decryptSensitive = (payload: string): string => {
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};
