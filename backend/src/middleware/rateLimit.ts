import rateLimit, { type Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { config } from '../config';
import { getRedisClient } from '../lib/redis';
import { logger } from '../logger';

const shouldUseRedisStore =
  config.redisUrl !== '' && config.nodeEnv !== 'development';

const createRedisStore = (prefix: string): RedisStore | undefined => {
  if (!shouldUseRedisStore) {
    return undefined;
  }
  return new RedisStore({
    prefix: `ddms:${prefix}`,
    sendCommand: async (...args: string[]) => {
      const client = await getRedisClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      return client.sendCommand(args);
    }
  });
};

const buildLimiter = (prefix: string, options: Options) => {
  try {
    return rateLimit({
      ...options,
      store: createRedisStore(prefix)
    });
  } catch (error) {
    logger.warn(
      { error, prefix },
      'Falling back to in-memory rate limiter store'
    );
    return rateLimit(options);
  }
};

export const apiRateLimiter = buildLimiter('api', {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimiter = buildLimiter('auth', {
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message:
    'Too many authentication attempts from this IP, please try again later.'
});
