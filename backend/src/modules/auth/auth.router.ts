import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  mfaDisableSchema,
  mfaEnrollSchema,
  mfaVerifySchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyContactSchema,
  resendVerificationSchema
} from './auth.schemas';
import {
  disableMfa,
  initiateMfaEnrollment,
  loginUser,
  logoutSession,
  refreshSession,
  registerUserAccount,
  requestPasswordReset,
  resetPassword,
  verifyMfaEnrollment,
  verifyEmailContact,
  verifyPhoneContact,
  resendContactVerification
} from './auth.service';
import { authenticate } from '../../middleware/authenticate';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUserAccount(req.body, {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });
    res.status(201).json({ data: result });
  })
);

authRouter.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body, {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });
    res.json({ data: result });
  })
);

authRouter.post(
  '/refresh',
  validateRequest(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await refreshSession(req.body.refreshToken, {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });
    res.json({ data: result });
  })
);

authRouter.post(
  '/logout',
  validateRequest(logoutSchema),
  asyncHandler(async (req, res) => {
    await logoutSession(req.body.refreshToken);
    res.status(204).send();
  })
);

authRouter.post(
  '/password/forgot',
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email, { ip: req.ip });
    res.status(202).json({ data: { accepted: true } });
  })
);

authRouter.post(
  '/password/reset',
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPassword(req.body.token, req.body.password);
    res.status(204).send();
  })
);

authRouter.post(
  '/mfa/enroll',
  authenticate,
  validateRequest(mfaEnrollSchema),
  asyncHandler(async (req, res) => {
    const result = await initiateMfaEnrollment(
      req.user!.id,
      req.body.method,
      { phoneNumber: req.body.phoneNumber },
      { ip: req.ip }
    );
    res.status(200).json({ data: result });
  })
);

authRouter.post(
  '/mfa/verify',
  authenticate,
  validateRequest(mfaVerifySchema),
  asyncHandler(async (req, res) => {
    await verifyMfaEnrollment(req.user!.id, req.body.code, req.body.challengeId);
    res.status(204).send();
  })
);

authRouter.delete(
  '/mfa',
  authenticate,
  validateRequest(mfaDisableSchema),
  asyncHandler(async (req, res) => {
    await disableMfa(req.user!.id, req.body.otp);
    res.status(204).send();
  })
);

authRouter.post(
  '/verify-email',
  authenticate,
  validateRequest(verifyContactSchema),
  asyncHandler(async (req, res) => {
    const verification = await verifyEmailContact(req.user!.id, req.body.code);
    res.json({ data: { verification } });
  })
);

authRouter.post(
  '/verify-phone',
  authenticate,
  validateRequest(verifyContactSchema),
  asyncHandler(async (req, res) => {
    const verification = await verifyPhoneContact(req.user!.id, req.body.code);
    res.json({ data: { verification } });
  })
);

authRouter.post(
  '/verification/resend',
  authenticate,
  validateRequest(resendVerificationSchema),
  asyncHandler(async (req, res) => {
    await resendContactVerification(req.user!.id, req.body.channel);
    res.status(202).json({ data: { success: true } });
  })
);
