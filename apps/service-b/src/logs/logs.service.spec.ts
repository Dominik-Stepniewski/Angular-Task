import { BadRequestException } from '@nestjs/common';
import { LogsRepository } from './logs.repository';
import { LogsService } from './logs.service';

describe('LogsService', () => {
  const makeSvc = (rows: unknown[] = [], total = 0) => {
    const findByFilter = jest.fn().mockResolvedValue([rows, total]);
    const ensureIndexes = jest.fn().mockResolvedValue(undefined);
    const repo = { findByFilter, ensureIndexes } as unknown as LogsRepository;
    return { svc: new LogsService(repo), findByFilter, ensureIndexes };
  };

  it('builds a type + timestamp-range filter and paginates', async () => {
    const { svc, findByFilter } = makeSvc([{ id: '1' }], 5);
    const res = await svc.findByFilter({
      type: 'search',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      page: 2,
      limit: 2,
    });

    expect(findByFilter).toHaveBeenCalledWith(
      {
        type: 'search',
        timestamp: {
          $gte: '2026-01-01T00:00:00.000Z',
          $lte: '2026-01-02T00:00:00.000Z',
        },
      },
      2,
      2,
    );
    expect(res).toMatchObject({ page: 2, limit: 2, total: 5, hasNext: true });
  });

  it('normalizes offset ISO bounds to UTC before comparing/querying', async () => {
    const { svc, findByFilter } = makeSvc([], 0);
    await svc.findByFilter({ from: '2026-01-01T02:00:00.000+02:00' });
    expect(findByFilter).toHaveBeenCalledWith(
      { timestamp: { $gte: '2026-01-01T00:00:00.000Z' } },
      0,
      20,
    );
  });

  it('omits filter keys that are not provided', async () => {
    const { svc, findByFilter } = makeSvc([], 0);
    await svc.findByFilter({});
    expect(findByFilter).toHaveBeenCalledWith({}, 0, 20);
  });

  it('rejects an inverted range with INVALID_RANGE', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.findByFilter({ from: '2026-02-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }),
    ).rejects.toThrow('INVALID_RANGE');
    await expect(
      svc.findByFilter({ from: '2026-02-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hasNext is false on the last page', async () => {
    const { svc } = makeSvc([{ id: '1' }], 20);
    const res = await svc.findByFilter({ page: 1, limit: 20 });
    expect(res.hasNext).toBe(false);
  });

  it('ensures the compound index on init', async () => {
    const { svc, ensureIndexes } = makeSvc();
    await svc.onModuleInit();
    expect(ensureIndexes).toHaveBeenCalledTimes(1);
  });
});
