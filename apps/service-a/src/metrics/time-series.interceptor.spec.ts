import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EventName } from '@lumana/contracts';
import { RedisService } from '@lumana/redis';
import { of } from 'rxjs';
import { TimeSeriesInterceptor } from './time-series.interceptor';

describe('TimeSeriesInterceptor', () => {
  const makeCtx = (handlerName: string): ExecutionContext =>
    ({ getHandler: () => ({ name: handlerName }) }) as unknown as ExecutionContext;

  it('records a timeseries hit and emits an ActionEvent after the handler completes', (done) => {
    const redis = { tsAdd: jest.fn().mockResolvedValue(undefined) } as unknown as RedisService;
    const nats = { emit: jest.fn() } as unknown as ClientProxy;
    const interceptor = new TimeSeriesInterceptor(redis, nats);

    const result = { data: [{}, {}], total: 5 };
    const next: CallHandler = { handle: () => of(result) };

    interceptor.intercept(makeCtx('search'), next).subscribe({
      complete: () => {
        expect(redis.tsAdd).toHaveBeenCalledWith('svcA:action:search', 1, {
          action: 'search',
          service: 'a',
        });
        expect(nats.emit).toHaveBeenCalledTimes(1);
        const [pattern, event] = (nats.emit as jest.Mock).mock.calls[0];
        expect(pattern).toBe(EventName.ACTION);
        expect(event).toMatchObject({
          sourceAction: 'search',
          type: 'search',
          payload: { results: 2, total: 5 },
        });
        expect(typeof event.timestamp).toBe('string');
        done();
      },
    });
  });

  it('emits an annotate event carrying assetId + label', (done) => {
    const redis = { tsAdd: jest.fn().mockResolvedValue(undefined) } as unknown as RedisService;
    const nats = { emit: jest.fn() } as unknown as ClientProxy;
    const interceptor = new TimeSeriesInterceptor(redis, nats);

    const annotation = { id: 'p1', assetId: 'ov-1', label: 'cat', points: [[0, 0]], rotationRad: 0 };
    interceptor.intercept(makeCtx('annotate'), { handle: () => of(annotation) }).subscribe({
      complete: () => {
        expect(redis.tsAdd).toHaveBeenCalledWith('svcA:action:annotate', 1, {
          action: 'annotate',
          service: 'a',
        });
        const [, event] = (nats.emit as jest.Mock).mock.calls[0];
        expect(event).toMatchObject({
          sourceAction: 'annotate',
          type: 'annotate',
          payload: { assetId: 'ov-1', label: 'cat' },
        });
        done();
      },
    });
  });

  it('does not emit until the handler result resolves', () => {
    const redis = { tsAdd: jest.fn().mockResolvedValue(undefined) } as unknown as RedisService;
    const nats = { emit: jest.fn() } as unknown as ClientProxy;
    const interceptor = new TimeSeriesInterceptor(redis, nats);

    interceptor.intercept(makeCtx('ingest'), { handle: () => of({ fetched: 1 }) });
    expect(nats.emit).not.toHaveBeenCalled();
    expect(redis.tsAdd).not.toHaveBeenCalled();
  });

  it('skips metrics for non-action handlers (no bogus event)', (done) => {
    const redis = { tsAdd: jest.fn().mockResolvedValue(undefined) } as unknown as RedisService;
    const nats = { emit: jest.fn() } as unknown as ClientProxy;
    const interceptor = new TimeSeriesInterceptor(redis, nats);

    interceptor.intercept(makeCtx('health'), { handle: () => of('ok') }).subscribe({
      complete: () => {
        expect(redis.tsAdd).not.toHaveBeenCalled();
        expect(nats.emit).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('swallows a Redis failure instead of rejecting the request stream', (done) => {
    const redis = {
      tsAdd: jest.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as RedisService;
    const nats = { emit: jest.fn() } as unknown as ClientProxy;
    const interceptor = new TimeSeriesInterceptor(redis, nats);

    interceptor.intercept(makeCtx('search'), { handle: () => of({ data: [] }) }).subscribe({
      next: (v) => expect(v).toEqual({ data: [] }),
      error: () => done.fail('stream must not error on metrics failure'),
      complete: () => {
        expect(nats.emit).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });
});
