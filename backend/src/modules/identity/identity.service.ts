import { createHash } from 'crypto';
import { saveBase64Image } from '../../lib/fileStorage';
import { encryptSensitive } from '../../lib/encryption';
import { assertValidAadhaar, assertValidPan } from '../../lib/identityValidation';
import { upsertIdentityProfile, insertDocumentRecord } from './identity.repository';
import { verifyFaceFromFile } from './faceVerification.service';

interface IdentityPayload {
  phone: string;
  territoryId?: string;
  aadhaarNumber: string;
  panNumber: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  upiId?: string;
  aadhaarImage: string;
  panImage: string;
  faceImage: string;
}

const hashFile = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

const saveDocument = async (
  base64Data: string,
  userId: string,
  label: string
): Promise<{ path: string; checksum: string }> => {
  const cleaned = base64Data.trim();
  const matches = cleaned.match(/^data:(.*?);base64,(.+)$/);
  if (!matches) {
    throw new Error(`Invalid data URI for ${label}`);
  }
  const buffer = Buffer.from(matches[2], 'base64');
  const path = await saveBase64Image(cleaned, userId, label);
  const checksum = hashFile(buffer);
  return { path, checksum };
};

export const createIdentityProfile = async (
  userId: string,
  payload: IdentityPayload
): Promise<void> => {
  assertValidAadhaar(payload.aadhaarNumber);
  assertValidPan(payload.panNumber);

  const aadhaarEncrypted = encryptSensitive(payload.aadhaarNumber);
  const panEncrypted = encryptSensitive(payload.panNumber);
  const bankEncrypted = payload.bankAccountNumber
    ? encryptSensitive(payload.bankAccountNumber)
    : null;

  const aadhaarDoc = await saveDocument(payload.aadhaarImage, userId, 'aadhaar');
  const panDoc = await saveDocument(payload.panImage, userId, 'pan');
  const faceDoc = await saveDocument(payload.faceImage, userId, 'face');
  const faceVerified = await verifyFaceFromFile(faceDoc.path);

  await upsertIdentityProfile({
    userId,
    phone: payload.phone,
    territoryId: payload.territoryId ?? null,
    aadhaarEncrypted,
    panEncrypted,
    bankAccountEncrypted: bankEncrypted,
    bankIfsc: payload.bankIfsc ?? null,
    bankAccountName: payload.bankAccountName ?? null,
    upiId: payload.upiId ?? null,
    aadhaarDocumentPath: aadhaarDoc.path,
    panDocumentPath: panDoc.path,
    faceImagePath: faceDoc.path,
    faceVerificationStatus: faceVerified ? 'verified' : 'manual_review',
    aadhaarVerified: true,
    panVerified: true
  });

  await insertDocumentRecord({
    userId,
    docType: 'aadhaar',
    filePath: aadhaarDoc.path,
    checksum: aadhaarDoc.checksum
  });
  await insertDocumentRecord({
    userId,
    docType: 'pan',
    filePath: panDoc.path,
    checksum: panDoc.checksum
  });
  await insertDocumentRecord({
    userId,
    docType: 'face',
    filePath: faceDoc.path,
    checksum: faceDoc.checksum
  });
};
