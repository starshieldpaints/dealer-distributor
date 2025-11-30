import { z } from 'zod';

const passwordField = z
  .string()
  .min(10, 'Password must be at least 10 characters long');
const refreshTokenField = z.string().min(40, 'Invalid refresh token');
const otpField = z.string().min(4).max(10);
const dataUrlField = z
  .string()
  .regex(/^data:image\/(png|jpe?g);base64,/, 'Image must be a base64 data URI');

export const registerSchema = {
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Phone number must be E.164 format'),
    password: passwordField,
    role: z.enum(['distributor', 'dealer', 'field_rep']),
    distributorId: z.string().uuid().optional(),
    territoryId: z.string().uuid().optional(),
    parentUserId: z.string().uuid().optional(),
    aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
    aadhaarImage: dataUrlField,
    panNumber: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'PAN must follow AAAAA9999A format'),
    panImage: dataUrlField,
    faceImage: dataUrlField,
    bankAccountNumber: z.string().min(6).max(32).optional(),
    bankIfsc: z.string().trim().toUpperCase().min(4).max(11).optional(),
    bankAccountName: z.string().min(3).max(120).optional(),
    upiId: z
      .string()
      .regex(/^[-\w.]+@[-\w.]+$/, 'UPI ID must follow handle@bank')
      .optional(),
    pinCodes: z.array(z.string().regex(/^\d{6}$/)).min(1, 'Select at least one PIN code')
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: passwordField,
    mfaCode: otpField.optional(),
    challengeId: z.string().uuid().optional()
  })
};

export const refreshSchema = {
  body: z.object({
    refreshToken: refreshTokenField
  })
};

export const logoutSchema = {
  body: z.object({
    refreshToken: refreshTokenField
  })
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email()
  })
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(32),
    password: passwordField
  })
};

export const mfaEnrollSchema = {
  body: z
    .object({
      method: z.enum(['totp', 'sms']),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{7,15}$/, 'Enter a valid E.164 phone number')
        .optional()
    })
    .refine(
      (data) => (data.method === 'sms' ? Boolean(data.phoneNumber) : true),
      {
        message: 'phoneNumber is required for SMS MFA',
        path: ['phoneNumber']
      }
    )
};

export const mfaVerifySchema = {
  body: z.object({
    code: otpField,
    challengeId: z.string().uuid().optional()
  })
};

export const mfaDisableSchema = {
  body: z.object({
    otp: otpField.optional()
  })
};

export const verifyContactSchema = {
  body: z.object({
    code: otpField
  })
};

export const resendVerificationSchema = {
  body: z.object({
    channel: z.enum(['email', 'phone'])
  })
};
