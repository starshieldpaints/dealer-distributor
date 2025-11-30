import { apiClient } from './client';

export type UserRole = 'admin' | 'distributor' | 'dealer' | 'field_rep';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  distributorId?: string | null;
  parentUserId?: string | null;
  status: string;
  permissions?: string[];
  mfaEnabled?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface VerificationStatus {
  email: 'pending' | 'verified';
  phone: 'pending' | 'verified';
  face: 'pending' | 'verified' | 'manual_review';
  aadhaar: 'pending' | 'verified';
  pan: 'pending' | 'verified';
}

export interface AuthSuccessResponse {
  status: 'ok';
  tokens: SessionTokens;
  user: AuthUser;
  verification: VerificationStatus;
}

export interface AuthMfaRequiredResponse {
  status: 'mfa_required';
  method: 'totp' | 'sms';
  challengeId?: string;
}

export type LoginResponse = AuthSuccessResponse | AuthMfaRequiredResponse;

export interface LoginPayload {
  email: string;
  password: string;
  mfaCode?: string;
  challengeId?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'distributor' | 'dealer' | 'field_rep';
  phone: string;
  territoryId?: string;
  distributorId?: string;
  parentUserId?: string;
  aadhaarNumber: string;
  aadhaarImage: string;
  panNumber: string;
  panImage: string;
  faceImage: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  upiId?: string;
  pinCodes: string[];
}

export const loginRequest = async (payload: LoginPayload): Promise<LoginResponse> => {
  const { data } = await apiClient.post<{ data: LoginResponse }>('/auth/login', payload);
  return data.data;
};

export const registerRequest = async (payload: RegisterPayload): Promise<AuthSuccessResponse> => {
  const { data } = await apiClient.post<{ data: AuthSuccessResponse }>('/auth/register', payload);
  return data.data;
};

export const verifyEmailCode = async (code: string): Promise<VerificationStatus> => {
  const { data } = await apiClient.post<{ data: { verification: VerificationStatus } }>(
    '/auth/verify-email',
    { code }
  );
  return data.data.verification;
};

export const verifyPhoneCode = async (code: string): Promise<VerificationStatus> => {
  const { data } = await apiClient.post<{ data: { verification: VerificationStatus } }>(
    '/auth/verify-phone',
    { code }
  );
  return data.data.verification;
};

export const resendVerificationCode = async (channel: 'email' | 'phone'): Promise<void> => {
  await apiClient.post('/auth/verification/resend', { channel });
};

export const refreshSessionRequest = async (refreshToken: string): Promise<AuthSuccessResponse> => {
  const { data } = await apiClient.post<{ data: AuthSuccessResponse }>('/auth/refresh', {
    refreshToken
  });
  return data.data;
};
