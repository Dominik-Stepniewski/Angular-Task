import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  createClient,
  RedisClientType,
  TIME_SERIES_AGGREGATION_TYPE,
  TIME_SERIES_DUPLICATE_POLICIES,
} from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client!: RedisClientType;

  async connect(url: string): Promise<void> {
    if (this.client) return;
    this.client = createClient({ url });
    await this.client.connect();
  }

  private ensureClient(): RedisClientType {
    if (!this.client) {
      throw new Error('RedisService: call connect() before use');
    }
    return this.client;
  }

  async tsAdd(
    key: string,
    value = 1,
    labels: Record<string, string> = {},
  ): Promise<void> {
    const client = this.ensureClient();
    try {
      await client.ts.add(key, '*', value, {
        LABELS: labels,
        ON_DUPLICATE: TIME_SERIES_DUPLICATE_POLICIES.SUM,
      });
    } catch {
      await client.ts.create(key, { LABELS: labels });
      await client.ts.add(key, '*', value);
    }
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
