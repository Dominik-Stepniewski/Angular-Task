import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  const good = (i: number) => ({
    id: `ov-${i}`,
    title: `t${i}`,
    url: `http://x/${i}.jpg`,
    thumbnail: `http://x/${i}-t.jpg`,
    source: 'flickr',
    license: 'by',
    tags: [`tag${i}`],
  });

  describe('ingestFile', () => {
    it('upserts valid rows unordered, skips bad rows without aborting the batch', async () => {
      const bulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 2, modifiedCount: 1 });
      const repo = { bulkWrite } as unknown as AssetsRepository;
      const svc = new AssetsService(repo);

      const rows = [good(1), good(2), { title: 'no id' }, good(3), { id: '' }];
      const result = await svc.ingestFile(Buffer.from(JSON.stringify(rows)));

      expect(result.inserted).toBe(3);
      expect(result.failedCount).toBe(2);
      expect(result.failed).toEqual([
        { index: 2, reason: 'MISSING_ID' },
        { index: 4, reason: 'MISSING_ID' },
      ]);

      const ops = bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(3);
      expect(ops[0]).toEqual({
        updateOne: { filter: { id: 'ov-1' }, update: { $set: expect.any(Object) }, upsert: true },
      });
      // searchTokens is derived on write — without it the prefix index is empty.
      expect(ops[0].updateOne.update.$set.searchTokens).toEqual(['t1', 'tag1']);
    });

    it('does not call bulkWrite when every row is invalid', async () => {
      const bulkWrite = jest.fn();
      const svc = new AssetsService({ bulkWrite } as unknown as AssetsRepository);
      const result = await svc.ingestFile(Buffer.from(JSON.stringify([{ nope: 1 }])));
      expect(bulkWrite).not.toHaveBeenCalled();
      expect(result).toEqual({ inserted: 0, failedCount: 1, failed: [{ index: 0, reason: 'MISSING_ID' }] });
    });

    it('throws BadRequest on non-JSON or non-array payloads', async () => {
      const svc = new AssetsService({} as AssetsRepository);
      await expect(svc.ingestFile(Buffer.from('not json'))).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.ingestFile(Buffer.from('{"a":1}'))).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('search', () => {
    const makeCol = (rows: unknown[], total: number) => {
      const cursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(rows),
      };
      return {
        cursor,
        find: jest.fn().mockReturnValue(cursor),
        countDocuments: jest.fn().mockResolvedValue(total),
        estimatedDocumentCount: jest.fn().mockResolvedValue(total),
      };
    };

    const expectedFilter = (q: string, prefix: string) => ({
      $or: [{ $text: { $search: q } }, { searchTokens: { $regex: `^${prefix}` } }],
    });

    it('ORs $text with a prefix match on the trailing token, applies skip/limit, strips internal fields', async () => {
      const col = makeCol(
        [{ _id: 'x', score: 1.5, searchTokens: ['cat'], id: 'ov-1', title: 't1', url: 'u', tags: ['cat'] }],
        45,
      );
      const svc = new AssetsService({ collection: () => col } as unknown as AssetsRepository);

      const res = await svc.search({ q: 'cat', page: 2, limit: 20 });

      expect(col.find).toHaveBeenCalledWith(expectedFilter('cat', 'cat'), { projection: { score: { $meta: 'textScore' } } });
      expect(col.cursor.skip).toHaveBeenCalledWith(20);
      expect(col.cursor.limit).toHaveBeenCalledWith(20);
      expect(col.countDocuments).toHaveBeenCalledWith(expectedFilter('cat', 'cat'));
      expect(res).toMatchObject({ page: 2, limit: 20, total: 45, hasNext: true });
      expect(res.data[0]).not.toHaveProperty('_id');
      expect(res.data[0]).not.toHaveProperty('score');
      expect(res.data[0]).not.toHaveProperty('searchTokens');
      expect(res.data[0].id).toBe('ov-1');
    });

    it('sorts by textScore relevance when q is set, and by id otherwise', async () => {
      const withQ = makeCol([], 0);
      await new AssetsService({ collection: () => withQ } as unknown as AssetsRepository).search({ q: 'cat' });
      expect(withQ.cursor.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' }, id: 1 });

      const noQ = makeCol([], 0);
      await new AssetsService({ collection: () => noQ } as unknown as AssetsRepository).search({});
      expect(noQ.cursor.sort).toHaveBeenCalledWith({ id: 1 });
    });

    it('prefix-matches only the trailing token of a multi-word query', async () => {
      const col = makeCol([], 0);
      const svc = new AssetsService({ collection: () => col } as unknown as AssetsRepository);
      await svc.search({ q: 'golden sun' });
      expect(col.find).toHaveBeenCalledWith(expectedFilter('golden sun', 'sun'), { projection: { score: { $meta: 'textScore' } } });
    });

    it('escapes regex metacharacters in the query so input cannot alter the pattern', async () => {
      const col = makeCol([], 0);
      const svc = new AssetsService({ collection: () => col } as unknown as AssetsRepository);
      await svc.search({ q: 'a.*b' });
      const filter = col.find.mock.calls[0][0];
      expect(filter.$or[1].searchTokens.$regex).toBe('^b');
    });

    it('falls back to a bare $text filter when the query has no word characters', async () => {
      const col = makeCol([], 0);
      const svc = new AssetsService({ collection: () => col } as unknown as AssetsRepository);
      await svc.search({ q: '!!!' });
      expect(col.find).toHaveBeenCalledWith({ $text: { $search: '!!!' } }, { projection: { score: { $meta: 'textScore' } } });
    });

    it('uses estimatedDocumentCount and empty filter when q is absent; hasNext false on last page', async () => {
      const col = makeCol([{ id: 'ov-1', title: 't1', url: 'u', tags: [] }], 20);
      const svc = new AssetsService({ collection: () => col } as unknown as AssetsRepository);

      const res = await svc.search({ page: 1, limit: 20 });

      expect(col.find).toHaveBeenCalledWith({}, undefined);
      expect(col.estimatedDocumentCount).toHaveBeenCalled();
      expect(col.countDocuments).not.toHaveBeenCalled();
      expect(res.hasNext).toBe(false);
    });
  });

  describe('getImage', () => {
    it('throws NotFound when the asset id is unknown', async () => {
      const findById = jest.fn().mockResolvedValue(null);
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      await expect(svc.getImage('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unsafe (private/link-local) asset url before fetching', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'http://169.254.169.254/meta' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      global.fetch = jest.fn();
      await expect(svc.getImage('ov-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('proxies upstream bytes + content-type on success', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'https://x/a.jpg' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: (k: string) => (k === 'content-type' ? 'image/jpeg' : null) },
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }) as unknown as typeof fetch;

      const out = await svc.getImage('ov-1');
      expect((global.fetch as jest.Mock)).toHaveBeenCalledWith('https://x/a.jpg', expect.any(Object));
      expect(out.contentType).toBe('image/jpeg');
      expect(Array.from(out.body)).toEqual([1, 2, 3]);
    });

    it('rejects an image whose declared content-length exceeds the cap', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'https://x/a.jpg' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: (k: string) => (k === 'content-length' ? String(50 * 1024 * 1024) : 'image/jpeg') },
        arrayBuffer: async () => new ArrayBuffer(0),
      }) as unknown as typeof fetch;
      await expect(svc.getImage('ov-1')).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('aborts a stream that exceeds the cap even without content-length', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'https://x/a.jpg' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      const cancel = jest.fn().mockResolvedValue(undefined);
      const reader = { read: jest.fn().mockResolvedValueOnce({ done: false, value: new Uint8Array(21 * 1024 * 1024) }), cancel };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: (k: string) => (k === 'content-type' ? 'image/jpeg' : null) },
        body: { getReader: () => reader },
      }) as unknown as typeof fetch;
      await expect(svc.getImage('ov-1')).rejects.toBeInstanceOf(BadGatewayException);
      expect(cancel).toHaveBeenCalled();
    });

    it('throws BadGateway when the upstream image fetch fails', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'https://x/a.jpg' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
      await expect(svc.getImage('ov-1')).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('throws BadGateway when the upstream fetch rejects', async () => {
      const findById = jest.fn().mockResolvedValue({ id: 'ov-1', url: 'https://x/a.jpg' });
      const svc = new AssetsService({ findById } as unknown as AssetsRepository);
      global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
      await expect(svc.getImage('ov-1')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  it('ensures indexes on module init', async () => {
    const ensureIndexes = jest.fn().mockResolvedValue(undefined);
    const svc = new AssetsService({ ensureIndexes } as unknown as AssetsRepository);
    await svc.onModuleInit();
    expect(ensureIndexes).toHaveBeenCalledTimes(1);
  });
});
