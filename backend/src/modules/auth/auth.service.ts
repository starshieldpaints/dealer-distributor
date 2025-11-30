import { createHash, randomBytes } from 'crypto';
import speakeasy from 'speakeasy';
import { HttpError } from '../../lib/httpError';
import { signAccessToken, type TokenPayload } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword
} from '../users/user.repository';
import type { User, UserRole } from '../users/user.types';
import { getPermissionsForRole } from '../../lib/permissions';
import { assertPasswordStrength } from '../../lib/passwordPolicy';
import { recordAuditEvent } from '../audit/audit.service';
import {
  consumeMfaChallenge,
  consumePasswordResetToken,
  createMfaChallenge as createMfaChallengeRecord,
  deleteMfaSecret,
  findActiveMfaChallenge,
  findPasswordResetByHash,
  findRefreshTokenByHash,
  getMfaSecretForUser,
  insertPasswordResetToken,
  insertRefreshToken,
  markMfaSecretVerified,
  revokeRefreshToken,
  revokeUserRefreshTokens,
  upsertMfaSecret
} from './auth.repository';
import {
  sendEmailVerificationCode,
  sendMfaSms,
  sendPasswordResetEmail,
  sendPhoneVerificationCode
} from './notification.service';
import { createIdentityProfile } from '../identity/identity.service';
import {
  createVerificationCode,
  findActiveCode as findContactVerificationCode,
  consumeCode as consumeContactCode
} from '../identity/contactVerification.repository';
import {
  getIdentityVerificationSnapshot,
  markEmailVerified,
  markPhoneVerified,
  getIdentityContactInfo
} from '../identity/identity.repository';
import { assignUserPins } from '../users/userPin.repository';
import { pinCodesExist } from '../pincodes/pincode.repository';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  distributorId?: string;
  phone: string;
  territoryId: string;
  aadhaarNumber: string;
  aadhaarImage: string;
  panNumber: string;
  panImage: string;
  faceImage: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  upiId?: string;
  parentUserId?: string;
  pinCodes: string[];
}

interface LoginInput {
  email: string;
  password: string;
  mfaCode?: string;
  challengeId?: string;
}

interface AuthContext {
  ip?: string | null;
  userAgent?: string | null;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface VerificationStatus {
  email: 'pending' | 'verified';
  phone: 'pending' | 'verified';
  face: 'pending' | 'verified' | 'manual_review';
  aadhaar: 'pending' | 'verified';
  pan: 'pending' | 'verified';
}

interface AuthSuccessResponse {
  status: 'ok';
  tokens: SessionTokens;
  user: ReturnType<typeof sanitizeUser>;
  verification: VerificationStatus;
}

interface MfaRequiredResponse {
  status: 'mfa_required';
  method: 'totp' | 'sms';
  challengeId?: string;
}

export type LoginResponse = AuthSuccessResponse | MfaRequiredResponse;

const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
const MFA_CHALLENGE_TTL_MS = 1000 * 60 * 5;
const CONTACT_VERIFICATION_TTL_MS = 1000 * 60 * 10;

const generateRandomToken = (length = 48): string =>
  randomBytes(length).toString('hex');

const generateNumericCode = (digits = 6): string => {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const sanitizeUser = (
  user: any,
  options?: { mfaEnabled?: boolean }
) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  distributorId: user.distributorId ?? null,
  parentUserId: user.parentUserId ?? null,
  geoRole: user.geoRole ?? null,
  authProvider: user.authProvider,
  status: user.status,
  approvalStatus: user.approvalStatus,
  mfaEnabled: options?.mfaEnabled ?? false,
  permissions: getPermissionsForRole(user.role)
});

const ensureUserApproved = (user: User): void => {
  if (user.approvalStatus !== 'approved') {
    throw new HttpError(403, 'Account is awaiting superadmin approval');
  }
};

const buildVerificationStatus = (
  snapshot?: Awaited<ReturnType<typeof getIdentityVerificationSnapshot>>
): VerificationStatus => ({
  email: snapshot?.emailVerifiedAt ? 'verified' : 'pending',
  phone: snapshot?.phoneVerifiedAt ? 'verified' : 'pending',
  face: snapshot?.faceVerificationStatus
    ? (snapshot.faceVerificationStatus as VerificationStatus['face'])
    : 'pending',
  aadhaar: snapshot?.aadhaarVerifiedAt ? 'verified' : 'pending',
  pan: snapshot?.panVerifiedAt ? 'verified' : 'pending'
});
const issueSessionTokens = async (
  user: User,
  context?: AuthContext
): Promise<{ tokens: SessionTokens; refreshTokenId: string }> => {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = generateRandomToken(64);
  const refreshRecord = await insertRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    ipAddress: context?.ip ?? null,
    userAgent: context?.userAgent ?? null
  });
  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: REFRESH_TTL_MS
    },
    refreshTokenId: refreshRecord.id
  };
};

const requireActiveUser = (user: User): void => {
  if (user.status !== 'active') {
    throw new HttpError(403, 'Account is not active');
  }
};

const ensureMfaCodeProvided = (): never => {
  throw new HttpError(
    412,
    'Multi-factor authentication code required for this account'
  );
};

const createSmsChallenge = async (
  userId: string,
  phoneNumber: string,
  context?: AuthContext
) => {
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const challenge = await createMfaChallengeRecord({
    userId,
    channel: 'sms',
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + MFA_CHALLENGE_TTL_MS),
    ipAddress: context?.ip ?? null
  });
  await sendMfaSms({ to: phoneNumber, code });
  return challenge;
};

const initiateContactVerification = async (
  user: User,
  email: string,
  phone: string
): Promise<void> => {
  const tasks = [];
  const expiresAt = new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS);
  const emailCode = generateNumericCode();
  tasks.push(
    createVerificationCode({
      userId: user.id,
      channel: 'email',
      destination: email,
      code: emailCode,
      expiresAt
    }).then(() =>
      sendEmailVerificationCode({
        to: email,
        code: emailCode
      })
    )
  );
  const phoneCode = generateNumericCode();
  tasks.push(
    createVerificationCode({
      userId: user.id,
      channel: 'phone',
      destination: phone,
      code: phoneCode,
      expiresAt
    }).then(() =>
      sendPhoneVerificationCode({
        to: phone,
        code: phoneCode
      })
    )
  );
  await Promise.all(tasks);
};

const provisionUserAccount = async (
  input: RegisterInput,
  context?: AuthContext
): Promise<User> => {
  if (input.role === 'admin') {
    throw new HttpError(403, 'Admin account creation is restricted');
  }
  if (!input.phone) {
    throw new HttpError(422, 'Phone number is required');
  }
  if (input.role === 'dealer' && !input.distributorId) {
    throw new HttpError(422, 'Dealers must be linked to a distributor');
  }
  if (input.role === 'field_rep' && !input.parentUserId) {
    throw new HttpError(422, 'Field reps must have a sponsoring dealer or distributor');
  }
  assertPasswordStrength(input.password);
  if (!input.pinCodes || input.pinCodes.length === 0) {
    throw new HttpError(422, 'At least one PIN code is required');
  }
  const uniquePins = Array.from(new Set(input.pinCodes));
  const pinsExist = await pinCodesExist(uniquePins);
  if (!pinsExist) {
    throw new HttpError(422, 'One or more PIN codes are invalid');
  }
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new HttpError(409, 'Account already exists for this email');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    distributorId: input.distributorId ?? null,
    parentUserId: input.parentUserId ?? null
  });

  await createIdentityProfile(user.id, {
    phone: input.phone,
    territoryId: input.territoryId,
    aadhaarNumber: input.aadhaarNumber,
    panNumber: input.panNumber,
    bankAccountNumber: input.bankAccountNumber,
    bankIfsc: input.bankIfsc,
    bankAccountName: input.bankAccountName,
    upiId: input.upiId,
    aadhaarImage: input.aadhaarImage,
    panImage: input.panImage,
    faceImage: input.faceImage
  });
  await assignUserPins(user.id, uniquePins);

  await initiateContactVerification(user, input.email, input.phone);
  await recordAuditEvent({
    action: 'auth.register',
    resource: 'user',
    userId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress: context?.ip ?? null
  });
  return user;
};

export const registerUserAccount = async (
  input: RegisterInput,
  context?: AuthContext
): Promise<AuthSuccessResponse> => {
  const user = await provisionUserAccount(input, context);
  const { tokens } = await issueSessionTokens(user, context);
  const snapshot = await getIdentityVerificationSnapshot(user.id);
  return {
    status: 'ok',
    tokens,
    user: sanitizeUser(user),
    verification: buildVerificationStatus(snapshot)
  };
};

export const createManagedUserAccount = async (
  input: RegisterInput,
  context?: AuthContext
): Promise<{ user: ReturnType<typeof sanitizeUser>; verification: VerificationStatus }> => {
  const user = await provisionUserAccount(input, context);
  const snapshot = await getIdentityVerificationSnapshot(user.id);
  return {
    user: sanitizeUser(user),
    verification: buildVerificationStatus(snapshot)
  };
};

export const loginUser = async (
  input: LoginInput,
  context?: AuthContext
): Promise<LoginResponse> => {
  const user = await findUserByEmail(input.email);
  if (!user) {
    await recordAuditEvent({
      action: 'auth.login.failed',
      resource: 'user',
      metadata: { email: input.email, reason: 'not_found' },
      ipAddress: context?.ip ?? null
    });
    throw new HttpError(401, 'Invalid credentials');
  }
  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    await recordAuditEvent({
      action: 'auth.login.failed',
      resource: 'user',
      userId: user.id,
      metadata: { reason: 'invalid_password' },
      ipAddress: context?.ip ?? null
    });
    throw new HttpError(401, 'Invalid credentials');
  }
  requireActiveUser(user);

  const mfaSecret = await getMfaSecretForUser(user.id);
  const mfaEnabled = !!(mfaSecret && mfaSecret.isVerified);

  if (mfaEnabled && mfaSecret) {
    if (mfaSecret.method === 'totp') {
      if (!input.mfaCode) {
        return {
          status: 'mfa_required',
          method: 'totp'
        };
      }
      const verified = speakeasy.totp.verify({
        secret: mfaSecret.secret,
        encoding: 'base32',
        token: input.mfaCode,
        window: 1
      });
      if (!verified) {
        await recordAuditEvent({
          action: 'auth.login.failed',
          resource: 'user',
          userId: user.id,
          metadata: { reason: 'invalid_mfa' },
          ipAddress: context?.ip ?? null
        });
        throw new HttpError(401, 'Invalid verification code');
      }
    } else if (mfaSecret.method === 'sms') {
      if (!input.challengeId || !input.mfaCode) {
        const challenge = await createSmsChallenge(
          user.id,
          mfaSecret.secret,
          context
        );
        return {
          status: 'mfa_required',
          method: 'sms',
          challengeId: challenge.id
        };
      }
      const challenge = await findActiveMfaChallenge(input.challengeId);
      if (
        !challenge ||
        challenge.userId !== user.id ||
        challenge.expiresAt < new Date()
      ) {
        throw new HttpError(401, 'MFA challenge expired or invalid');
      }
      if (hashToken(input.mfaCode) !== challenge.codeHash) {
        throw new HttpError(401, 'Invalid verification code');
      }
      await consumeMfaChallenge(challenge.id);
    }
  }
  ensureUserApproved(user);
  const { tokens } = await issueSessionTokens(user, context);
  await recordAuditEvent({
    action: 'auth.login.success',
    resource: 'user',
    userId: user.id,
    metadata: { email: user.email },
    ipAddress: context?.ip ?? null
  });
  const snapshot = await getIdentityVerificationSnapshot(user.id);
  return {
    status: 'ok',
    tokens,
    user: sanitizeUser(user, { mfaEnabled }),
    verification: buildVerificationStatus(snapshot)
  };
};

export const refreshSession = async (
  refreshToken: string,
  context?: AuthContext
): Promise<AuthSuccessResponse> => {
  const tokenHash = hashToken(refreshToken);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'Refresh token is invalid or expired');
  }
  const user = await findUserById(stored.userId);
  if (!user) {
    throw new HttpError(401, 'User account no longer exists');
  }
  requireActiveUser(user);
  ensureUserApproved(user);
  const mfaSecret = await getMfaSecretForUser(user.id);
  const { tokens, refreshTokenId } = await issueSessionTokens(user, context);
  await revokeRefreshToken(stored.id, refreshTokenId);
  const snapshot = await getIdentityVerificationSnapshot(user.id);
  return {
    status: 'ok',
    tokens,
    user: sanitizeUser(user, { mfaEnabled: Boolean(mfaSecret?.isVerified) }),
    verification: buildVerificationStatus(snapshot)
  };
};

export const logoutSession = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (stored) {
    await revokeRefreshToken(stored.id);
  }
};

export const requestPasswordReset = async (
  email: string,
  context?: AuthContext
): Promise<void> => {
  const user = await findUserByEmail(email);
  if (!user) {
    return;
  }
  const token = generateRandomToken(32);
  await insertPasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    ipAddress: context?.ip ?? null
  });
  await sendPasswordResetEmail({ to: user.email, token });
  await recordAuditEvent({
    action: 'auth.password.reset.requested',
    resource: 'user',
    userId: user.id,
    metadata: { email: user.email }
  });
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  assertPasswordStrength(newPassword);
  const tokenHash = hashToken(token);
  const stored = await findPasswordResetByHash(tokenHash);
  if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
    throw new HttpError(400, 'Reset token is invalid or expired');
  }
  const user = await findUserById(stored.userId);
  if (!user) {
    throw new HttpError(400, 'Account no longer exists');
  }
  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, passwordHash);
  await consumePasswordResetToken(stored.id);
  await revokeUserRefreshTokens(user.id);
  await recordAuditEvent({
    action: 'auth.password.reset.completed',
    resource: 'user',
    userId: user.id
  });
};

export const initiateMfaEnrollment = async (
  userId: string,
  method: 'totp' | 'sms',
  params?: { phoneNumber?: string },
  context?: AuthContext
) => {
  if (method === 'sms' && !params?.phoneNumber) {
    throw new HttpError(400, 'Phone number is required for SMS MFA');
  }
  if (method === 'sms') {
    const secret = params?.phoneNumber as string;
    const backupCodes = Array.from({ length: 5 }, () =>
      generateRandomToken(4)
    );
    const record = await upsertMfaSecret({
      userId,
      secret,
      method,
      backupCodes
    });
    const challenge = await createSmsChallenge(userId, secret, context);
    return {
      method: record.method,
      challengeId: challenge.id,
      backupCodes: record.backupCodes
    };
  }
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Dealer App (${userId})`
  });
  const backupCodes = Array.from({ length: 5 }, () =>
    generateRandomToken(4)
  );
  await upsertMfaSecret({
    userId,
    secret: secret.base32,
    method: 'totp',
    backupCodes
  });

  return {
    method: 'totp',
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url ?? null,
    backupCodes
  };
};

export const verifyMfaEnrollment = async (
  userId: string,
  code: string,
  challengeId?: string
): Promise<void> => {
  const mfaSecret = await getMfaSecretForUser(userId);
  if (!mfaSecret) {
    throw new HttpError(404, 'No MFA enrollment found');
  }
  if (mfaSecret.method === 'totp' && !code) {
    ensureMfaCodeProvided();
  }
  if (mfaSecret.method === 'totp') {
    const verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    if (!verified) {
      throw new HttpError(400, 'Invalid verification code');
    }
  } else {
    if (!challengeId) {
      throw new HttpError(400, 'challengeId is required for SMS MFA');
    }
    const challenge = await findActiveMfaChallenge(challengeId);
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.expiresAt < new Date()
    ) {
      throw new HttpError(400, 'Verification challenge expired or invalid');
    }
    if (hashToken(code) !== challenge.codeHash) {
      throw new HttpError(400, 'Invalid verification code');
    }
    await consumeMfaChallenge(challenge.id);
  }
  await markMfaSecretVerified(userId);
  await recordAuditEvent({
    action: 'auth.mfa.enabled',
    resource: 'user',
    userId
  });
};

export const disableMfa = async (userId: string, code?: string): Promise<void> => {
  const mfaSecret = await getMfaSecretForUser(userId);
  if (!mfaSecret) {
    return;
  }
  if (mfaSecret.method === 'totp') {
    if (!code) {
      ensureMfaCodeProvided();
    }
    const verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token: code!,
      window: 1
    });
    if (!verified) {
      throw new HttpError(400, 'Invalid verification code');
    }
  } else if (!code) {
    throw new HttpError(400, 'Verification code required to disable MFA');
  }
  await deleteMfaSecret(userId);
  await recordAuditEvent({
    action: 'auth.mfa.disabled',
    resource: 'user',
    userId
  });
};

const verifyContactCode = async (
  userId: string,
  channel: 'email' | 'phone',
  code: string
): Promise<void> => {
  const record = await findContactVerificationCode(userId, channel, code);
  if (!record || record.expiresAt < new Date()) {
    throw new HttpError(400, 'Verification code is invalid or expired');
  }
  await consumeContactCode(record.id);
  if (channel === 'email') {
    await markEmailVerified(userId);
  } else {
    await markPhoneVerified(userId);
  }
};

export const verifyEmailContact = async (userId: string, code: string): Promise<VerificationStatus> => {
  await verifyContactCode(userId, 'email', code);
  const snapshot = await getIdentityVerificationSnapshot(userId);
  return buildVerificationStatus(snapshot);
};

export const verifyPhoneContact = async (userId: string, code: string): Promise<VerificationStatus> => {
  await verifyContactCode(userId, 'phone', code);
  const snapshot = await getIdentityVerificationSnapshot(userId);
  return buildVerificationStatus(snapshot);
};

export const resendContactVerification = async (
  userId: string,
  channel: 'email' | 'phone'
): Promise<void> => {
  const contactInfo = await getIdentityContactInfo(userId);
  const user = await findUserById(userId);
  if (!contactInfo || !user) {
    throw new HttpError(404, 'User contact profile not found');
  }
  if (channel === 'email') {
    const expiresAt = new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS);
    const code = generateNumericCode();
    await createVerificationCode({
      userId,
      channel: 'email',
      destination: user.email,
      code,
      expiresAt
    });
    await sendEmailVerificationCode({ to: user.email, code });
  } else {
    const expiresAt = new Date(Date.now() + CONTACT_VERIFICATION_TTL_MS);
    const code = generateNumericCode();
    await createVerificationCode({
      userId,
      channel: 'phone',
      destination: contactInfo.phone,
      code,
      expiresAt
    });
    await sendPhoneVerificationCode({
      to: contactInfo.phone,
      code
    });
  }
};
