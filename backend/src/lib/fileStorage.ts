import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.mkdir(dirPath, { recursive: true });
};

const decodeBase64Image = (dataUrl: string): { buffer: Buffer; extension: string } => {
  const matches = dataUrl.match(/^data:(.*?);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URI');
  }
  const mimeType = matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');
  const extension = mimeType.split('/')[1] ?? 'bin';
  return { buffer, extension };
};

export const saveBase64Image = async (
  dataUrl: string,
  userId: string,
  label: string
): Promise<string> => {
  const { buffer, extension } = decodeBase64Image(dataUrl);
  const dir = path.resolve(config.uploadsDir, userId);
  await ensureDir(dir);
  const fileName = `${label}-${randomUUID()}.${extension}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);
  return fullPath;
};
