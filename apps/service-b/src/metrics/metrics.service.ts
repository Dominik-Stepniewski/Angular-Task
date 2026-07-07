import { BadRequestException, Injectable } from '@nestjs/common';
import { ActionType } from '@lumana/contracts';
import { RedisService } from '@lumana/redis';
import { MetricsRangeDto } from './dto/metrics-range.dto';

const ACTIONS: ActionType[] = ['ingest', 'upload', 'search', 'annotate'];
const HOUR_MS = 3600000;

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

  async getMetrics(dto: MetricsRangeDto): Promise<MetricsResult> {
    const from = Date.parse(dto.from);
    const to = Date.parse(dto.to);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new BadRequestException('INVALID_RANGE');
    }
    const bucketMs = dto.bucketMs ?? HOUR_MS;

    const ranges = (await Promise.all(
      ACTIONS.map((a) => this.redis.tsRange(`svcA:action:${a}`, from, to, bucketMs)),
    )) as unknown as { timestamp: number; value: number }[][];

    const byType = {} as Record<ActionType, number>;
    const series: MetricSeries[] = ACTIONS.map((action, i) => {
      const points = (ranges[i] ?? []).map((p) => ({ t: p.timestamp, v: p.value }));
      byType[action] = points.reduce((sum, p) => sum + p.v, 0);
      return { action, points };
    });

    return { byType, series };
  }
}
