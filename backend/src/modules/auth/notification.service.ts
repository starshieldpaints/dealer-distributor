import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { config } from '../../config';
import { logger } from '../../logger';

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

const twilioClient =
  config.twilio.accountSid && config.twilio.authToken
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

export const sendPasswordResetEmail = async (params: {
  to: string;
  token: string;
}): Promise<void> => {
  const resetUrl = `${config.appUrl}/reset-password?token=${params.token}`;
  if (!config.sendgrid.apiKey || !config.sendgrid.fromEmail) {
    logger.warn(
      { email: params.to, resetUrl },
      'SendGrid not configured; password reset link logged'
    );
    return;
  }
  await sgMail.send({
    to: params.to,
    from: config.sendgrid.fromEmail,
    subject: 'Reset your Dealer App password',
    text: `Reset your password by visiting ${resetUrl}`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p>`
  });
};

export const sendMfaSms = async (params: {
  to: string;
  code: string;
}): Promise<void> => {
  if (!twilioClient || !config.twilio.messagingServiceSid) {
    logger.warn(
      { to: params.to, code: params.code },
      'Twilio not configured; MFA code logged'
    );
    return;
  }
  await twilioClient.messages.create({
    to: params.to,
    messagingServiceSid: config.twilio.messagingServiceSid,
    body: `Your verification code is ${params.code}`
  });
};

export const sendEmailVerificationCode = async (params: {
  to: string;
  code: string;
}): Promise<void> => {
  if (!config.sendgrid.apiKey || !config.sendgrid.fromEmail) {
    logger.warn({ email: params.to, code: params.code }, 'SendGrid not configured');
    return;
  }
  await sgMail.send({
    to: params.to,
    from: config.sendgrid.fromEmail,
    subject: 'Verify your email address',
    text: `Use the following code to verify your email: ${params.code}`,
    html: `<p>Use the following verification code:</p><h2>${params.code}</h2>`
  });
};

export const sendPhoneVerificationCode = async (params: {
  to: string;
  code: string;
}): Promise<void> => {
  if (!twilioClient || !config.twilio.messagingServiceSid) {
    logger.warn({ phone: params.to, code: params.code }, 'Twilio not configured');
    return;
  }
  await twilioClient.messages.create({
    to: params.to,
    messagingServiceSid: config.twilio.messagingServiceSid,
    body: `Your verification code is ${params.code}`
  });
};
