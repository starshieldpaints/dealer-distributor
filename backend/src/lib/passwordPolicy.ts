import { HttpError } from './httpError';

const passwordPolicy =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{}\[\]|;:'",.<>/?]).{10,}$/;

export const assertPasswordStrength = (password: string): void => {
  if (!passwordPolicy.test(password)) {
    throw new HttpError(
      422,
      'Password must be at least 10 characters and include upper, lower, number, and special character'
    );
  }
};
