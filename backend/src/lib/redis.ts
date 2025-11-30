import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../logger';

let clientPromise: Promise<RedisClientType> | null = null;
let client: RedisClientType | null = null;
let redisDisabled = false;
let hasLoggedDisable = false;

const connect = async (): Promise<RedisClientType> => {
  if (!config.redisUrl) {
    throw new Error('Redis URL is not configured');
  }
  const redis = createClient({ url: config.redisUrl });
  redis.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });
  await redis.connect();
  redisDisabled = false;
  client = redis;
  return redis;
};

const disableRedis = (error?: unknown): void => {
  redisDisabled = true;
  clientPromise = null;
  client = null;
  if (!hasLoggedDisable) {
    logger.warn(
      { error },
      'Redis connection unavailable; Redis-backed features will be disabled'
    );
    hasLoggedDisable = true;
  }
};

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (!config.redisUrl || redisDisabled) {
    return null;
  }
  if (client) {
    return client;
  }
  if (!clientPromise) {
    clientPromise = connect();
  }
  try {
    return await clientPromise;
  } catch (error) {
    disableRedis(error);
    return null;
  }
};

export const closeRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
  }
  client = null;
  clientPromise = null;
  redisDisabled = false;
  hasLoggedDisable = false;
};
