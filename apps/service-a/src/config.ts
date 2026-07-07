import { CorsOrigin, parseCorsOrigin } from '@lumana/contracts';

export interface ServiceAConfig {
  port: number;
  mongoUri: string;
  mongoDb: string;
  redisUrl: string;
  natsUrl: string;
  corsOrigin: CorsOrigin;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServiceAConfig {
  return {
    port: Number(env.PORT ?? 3000),
    mongoUri: env.MONGO_URI ?? 'mongodb://localhost:27017',
    mongoDb: env.MONGO_DB ?? 'lumana',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    natsUrl: env.NATS_URL ?? 'nats://localhost:4222',
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  };
}
