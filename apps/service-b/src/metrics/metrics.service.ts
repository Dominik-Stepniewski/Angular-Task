import { BadRequestException, Injectable } from '@nestjs/common';
import { ACTION_TYPES, ActionType, MetricSample, metricsKey } from '@lumana/contracts';
import { RedisService } from '@lumana/redis';

const HOUR_MS = 3600000;

export interface MetricsRangeParams {
  from: string;
  to: string;
  bucketMs?: number;
}

export interface MetricPoint {
  t: number;
  v: number;
}

export interface MetricSeries {
  action: ActionType;
  points: MetricPoint[];
}

export interface MetricsResult {
  byType: Record<ActionType, number>;
  series: MetricSeries[];
}

@Injectable()
export class MetricsService {
  constructor(private readonly redis: RedisService) {}

  async getMetrics(params: MetricsRangeParams): Promise<MetricsResult> {
    const from = Date.parse(params.from);
    const to = Date.parse(params.to);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new BadRequestException('INVALID_RANGE');
    }
    const bucketMs = params.bucketMs ?? HOUR_MS;

    const ranges = (await Promise.all(
      ACTION_TYPES.map((a) => this.redis.tsRange(metricsKey(a), from, to, bucketMs)),
    )) as unknown as MetricSample[][];

    const byType = {} as Record<ActionType, number>;
    const series: MetricSeries[] = ACTION_TYPES.map((action, i) => {
      const points = (ranges[i] ?? []).map((p) => ({ t: p.timestamp, v: p.value }));
      byType[action] = points.reduce((sum, p) => sum + p.v, 0);
      return { action, points };
    });

    return { byType, series };
  }
}
