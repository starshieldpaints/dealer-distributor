import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

const ACCESS_TOKEN_EXPIRATION = '15m';

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRATION
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
