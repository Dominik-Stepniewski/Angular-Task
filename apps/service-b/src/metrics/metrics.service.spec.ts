import { BadRequestException } from '@nestjs/common';
import { RedisService } from '@lumana/redis';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const range = { from: '2026-07-03T00:00:00.000Z', to: '2026-07-03T12:00:00.000Z' };

  it('ranges each of the 4 action series and totals per type', async () => {
    const tsRange = jest
      .fn()
      .mockResolvedValueOnce([{ timestamp: 1, value: 2 }, { timestamp: 2, value: 3 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ timestamp: 1, value: 4 }])
      .mockResolvedValueOnce([{ timestamp: 3, value: 7 }]);
    const svc = new MetricsService({ tsRange } as unknown as RedisService);

    const res = await svc.getMetrics(range);

    expect(tsRange).toHaveBeenCalledTimes(4);
    expect(tsRange).toHaveBeenNthCalledWith(1, 'svcA:action:ingest', Date.parse(range.from), Date.parse(range.to), 3600000);
    expect(res.byType).toEqual({ ingest: 5, upload: 0, search: 4, annotate: 7 });
    expect(res.series[0]).toEqual({
      action: 'ingest',
      points: [{ t: 1, v: 2 }, { t: 2, v: 3 }],
    });
    expect(res.series[3]).toEqual({ action: 'annotate', points: [{ t: 3, v: 7 }] });
  });

  it('honors a custom bucketMs', async () => {
    const tsRange = jest.fn().mockResolvedValue([]);
    const svc = new MetricsService({ tsRange } as unknown as RedisService);
    await svc.getMetrics({ ...range, bucketMs: 60000 });
    expect(tsRange).toHaveBeenCalledWith('svcA:action:ingest', expect.any(Number), expect.any(Number), 60000);
  });

  it('rejects an unparseable range', async () => {
    const svc = new MetricsService({ tsRange: jest.fn() } as unknown as RedisService);
    await expect(svc.getMetrics({ from: 'nope', to: 'nope' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
