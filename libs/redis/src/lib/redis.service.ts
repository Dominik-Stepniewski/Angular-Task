import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createClient,
  RedisClientType,
  TIME_SERIES_AGGREGATION_TYPE,
  TIME_SERIES_DUPLICATE_POLICIES,
} from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;
  private readonly createdKeys = new Set<string>();

  async connect(url: string): Promise<void> {
    if (this.client) return;
    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
      },
    });
    this.client.on('error', (err) =>
      this.logger.error(`redis client error: ${String(err)}`),
    );
    await this.client.connect();
  }

  private ensureClient(): RedisClientType {
    if (!this.client) {
      throw new Error('RedisService: call connect() before use');
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.ensureClient().ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private async ensureSeries(
    key: string,
    labels: Record<string, string>,
  ): Promise<void> {
    if (this.createdKeys.has(key)) return;
    try {
      await this.ensureClient().ts.create(key, {
        LABELS: labels,
        DUPLICATE_POLICY: TIME_SERIES_DUPLICATE_POLICIES.SUM,
      });
    } catch (e) {
      if (!(e instanceof Error && /already exists/i.test(e.message))) throw e;
    }
    this.createdKeys.add(key);
  }

  async tsAdd(
    key: string,
    value = 1,
    labels: Record<string, string> = {},
  ): Promise<void> {
    await this.ensureSeries(key, labels);
    await this.ensureClient().ts.add(key, '*', value, {
      LABELS: labels,
      ON_DUPLICATE: TIME_SERIES_DUPLICATE_POLICIES.SUM,
    });
  }

  async tsRange(
    key: string,
    from: number,
    to: number,
    bucketMs: number,
  ): ReturnType<RedisClientType['ts']['range']> {
    try {
      return await this.ensureClient().ts.range(key, from, to, {
        AGGREGATION: { type: TIME_SERIES_AGGREGATION_TYPE.COUNT, timeBucket: bucketMs },
      });
    } catch (e) {
      if (e instanceof Error && /the key does not exist/i.test(e.message)) {
        return [];
      }
      throw e;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }
}
