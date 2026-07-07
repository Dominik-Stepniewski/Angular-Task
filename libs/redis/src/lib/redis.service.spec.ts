jest.mock('redis', () => {
  const actual = jest.requireActual('redis');
  return { ...actual, createClient: jest.fn() };
});

import { createClient } from 'redis';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  const createClientMock = createClient as unknown as jest.Mock;
  let ts: { add: jest.Mock; create: jest.Mock; range: jest.Mock };
  let client: { connect: jest.Mock; quit: jest.Mock; ts: typeof ts };

  beforeEach(() => {
    ts = {
      add: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue('OK'),
      range: jest.fn().mockResolvedValue([]),
    };
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      ts,
    };
    createClientMock.mockReset().mockReturnValue(client);
  });

  it('connects with the given url', async () => {
    const svc = new RedisService();
    await svc.connect('redis://localhost:6379');
    expect(createClientMock).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('tsAdd calls client.ts.add with current-time marker, value and labels', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    await svc.tsAdd('svcA:action:search', 1, { action: 'search', service: 'a' });
    expect(ts.add).toHaveBeenCalledWith(
      'svcA:action:search',
      '*',
      1,
      expect.objectContaining({ LABELS: { action: 'search', service: 'a' } }),
    );
  });

  it('tsAdd creates the series then retries when the first add rejects', async () => {
    ts.add.mockRejectedValueOnce(new Error('TSDB: the key does not exist'));
    const svc = new RedisService();
    await svc.connect('redis://x');
    await svc.tsAdd('k', 1, { a: 'b' });
    expect(ts.create).toHaveBeenCalledWith('k', expect.objectContaining({ LABELS: { a: 'b' } }));
    expect(ts.add).toHaveBeenCalledTimes(2);
  });

  it('tsRange maps to client.ts.range with COUNT aggregation and bucket', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    await svc.tsRange('k', 100, 200, 10);
    expect(ts.range).toHaveBeenCalledWith('k', 100, 200, {
      AGGREGATION: { type: 'COUNT', timeBucket: 10 },
    });
  });

  it('tsRange returns [] when the series does not exist yet', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    ts.range.mockRejectedValueOnce(new Error('ERR TSDB: the key does not exist'));
    await expect(svc.tsRange('missing', 0, 1, 10)).resolves.toEqual([]);
  });

  it('tsRange rethrows unexpected errors', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    ts.range.mockRejectedValueOnce(new Error('WRONGTYPE'));
    await expect(svc.tsRange('k', 0, 1, 10)).rejects.toThrow('WRONGTYPE');
  });

  it('quits the client on module destroy', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    await svc.onModuleDestroy();
    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when used before connect', async () => {
    const svc = new RedisService();
    await expect(svc.tsAdd('k')).rejects.toThrow(/connect\(\) before use/);
  });

  it('is idempotent — a second connect reuses the client, no leak', async () => {
    const svc = new RedisService();
    await svc.connect('redis://x');
    await svc.connect('redis://x');
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});
