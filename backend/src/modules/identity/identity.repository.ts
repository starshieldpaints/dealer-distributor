import { pool } from '../../db/pool';

export interface IdentityProfileInput {
  userId: string;
  phone: string;
  territoryId?: string | null;
  aadhaarEncrypted: string;
  panEncrypted: string;
  bankAccountEncrypted?: string | null;
  bankIfsc?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;
  aadhaarDocumentPath: string;
  panDocumentPath: string;
  faceImagePath: string;
  faceVerificationStatus: 'pending' | 'verified' | 'manual_review';
  aadhaarVerified: boolean;
  panVerified: boolean;
}

export const upsertIdentityProfile = async (
  input: IdentityProfileInput
): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO user_identity_profiles (
        user_id,
        phone,
        territory_id,
        aadhaar_number_encrypted,
        pan_number_encrypted,
        bank_account_number_encrypted,
        bank_ifsc,
        bank_account_name,
        upi_id,
        aadhaar_document_path,
        pan_document_path,
        face_image_path,
        face_verification_status,
        aadhaar_verified_at,
        pan_verified_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        ,CASE WHEN $14::boolean THEN NOW() ELSE NULL END
        ,CASE WHEN $15::boolean THEN NOW() ELSE NULL END
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        phone = EXCLUDED.phone,
        territory_id = EXCLUDED.territory_id,
        aadhaar_number_encrypted = EXCLUDED.aadhaar_number_encrypted,
        pan_number_encrypted = EXCLUDED.pan_number_encrypted,
        bank_account_number_encrypted = EXCLUDED.bank_account_number_encrypted,
        bank_ifsc = EXCLUDED.bank_ifsc,
        bank_account_name = EXCLUDED.bank_account_name,
        upi_id = EXCLUDED.upi_id,
        aadhaar_document_path = EXCLUDED.aadhaar_document_path,
        pan_document_path = EXCLUDED.pan_document_path,
        face_image_path = EXCLUDED.face_image_path,
        face_verification_status = EXCLUDED.face_verification_status,
        aadhaar_verified_at = CASE
          WHEN EXCLUDED.aadhaar_verified_at IS NOT NULL THEN EXCLUDED.aadhaar_verified_at
          ELSE user_identity_profiles.aadhaar_verified_at
        END,
        pan_verified_at = CASE
          WHEN EXCLUDED.pan_verified_at IS NOT NULL THEN EXCLUDED.pan_verified_at
          ELSE user_identity_profiles.pan_verified_at
        END,
        updated_at = NOW()
    `,
    values: [
      input.userId,
      input.phone,
      input.territoryId ?? null,
      input.aadhaarEncrypted,
      input.panEncrypted,
      input.bankAccountEncrypted ?? null,
      input.bankIfsc ?? null,
      input.bankAccountName ?? null,
      input.upiId ?? null,
      input.aadhaarDocumentPath,
      input.panDocumentPath,
      input.faceImagePath,
      input.faceVerificationStatus,
      input.aadhaarVerified,
      input.panVerified
    ]
  });
};

export const insertDocumentRecord = async (input: {
  userId: string;
  docType: string;
  filePath: string;
  checksum?: string | null;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO user_documents (user_id, doc_type, file_path, checksum)
      VALUES ($1, $2, $3, $4)
    `,
    values: [input.userId, input.docType, input.filePath, input.checksum ?? null]
  });
};

export const markEmailVerified = async (userId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE user_identity_profiles
      SET email_verified_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $1
    `,
    values: [userId]
  });
};

export const markPhoneVerified = async (userId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE user_identity_profiles
      SET phone_verified_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $1
    `,
    values: [userId]
  });
};

export interface IdentityVerificationSnapshot {
  userId: string;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
  faceVerificationStatus: string | null;
  aadhaarVerifiedAt: Date | null;
  panVerifiedAt: Date | null;
}

export const getIdentityVerificationSnapshot = async (
  userId: string
): Promise<IdentityVerificationSnapshot | null> => {
  const res = await pool.query({
    text: `
      SELECT user_id as "userId",
             phone_verified_at as "phoneVerifiedAt",
             email_verified_at as "emailVerifiedAt",
             face_verification_status as "faceVerificationStatus",
             aadhaar_verified_at as "aadhaarVerifiedAt",
             pan_verified_at as "panVerifiedAt"
      FROM user_identity_profiles
      WHERE user_id = $1
    `,
    values: [userId]
  });
  return res.rows[0] ?? null;
};

export interface IdentityContactInfo {
  userId: string;
  phone: string;
  aadhaarDocumentPath?: string | null;
  panDocumentPath?: string | null;
}

export const getIdentityContactInfo = async (
  userId: string
): Promise<IdentityContactInfo | null> => {
  const res = await pool.query({
    text: `
      SELECT user_id as "userId",
             phone,
             aadhaar_document_path as "aadhaarDocumentPath",
             pan_document_path as "panDocumentPath"
      FROM user_identity_profiles
      WHERE user_id = $1
    `,
    values: [userId]
  });
  return res.rows[0] ?? null;
};
