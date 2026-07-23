const writes: string[] = [];
const streamMock = {
  write: jest.fn((chunk: string) => {
    writes.push(chunk);
    return true;
  }),
  end: jest.fn((chunk: string, cb?: () => void) => {
    writes.push(chunk);
    cb?.();
  }),
  on: jest.fn(),
};
const createWriteStream = jest.fn(() => streamMock);
const mkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('node:fs', () => ({
  createWriteStream: () => createWriteStream(),
}));
jest.mock('node:fs/promises', () => ({
  mkdir: (...args: unknown[]) => mkdir(...args),
}));

import { AssetsService } from '../assets/assets.service';
import { IngestService } from './ingest.service';
import { OpenverseClient } from './openverse.client';
import { OpenverseImage } from './map-asset';

describe('IngestService', () => {
  let svc: IngestService;
  let collectPages: jest.Mock;
  let upsertAssets: jest.Mock;

  const img = (i: number): OpenverseImage => ({
    id: `ov-${i}`,
    title: `T${i}`,
    url: `http://x/${i}.jpg`,
    thumbnail: `http://x/${i}-t.jpg`,
    source: 'flickr',
    license: 'by',
    tags: [{ name: `tag${i}` }],
  });

  const pagesOf = (...batches: OpenverseImage[][]) =>
    (async function* () {
      for (const b of batches) yield b;
    })();

  beforeEach(() => {
    writes.length = 0;
    streamMock.write.mockClear();
    streamMock.end.mockClear();
    createWriteStream.mockClear();
    mkdir.mockClear();
    collectPages = jest.fn();
    upsertAssets = jest.fn().mockResolvedValue(0);
    svc = new IngestService(
      { collectPages } as unknown as OpenverseClient,
      { upsertAssets } as unknown as AssetsService,
    );
  });

  it('streams page batches: upserts per batch and appends to the dataset file', async () => {
    collectPages.mockReturnValue(pagesOf([img(1), img(2)], [img(3)]));
    upsertAssets.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const result = await svc.run({ query: 'cat' });

    expect(collectPages).toHaveBeenCalledWith('cat', 500);
    expect(upsertAssets).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ file: 'data/dataset.json', fetched: 3, inserted: 3, pages: 2 });
    expect(mkdir).toHaveBeenCalledWith('data', { recursive: true });

    const written = JSON.parse(writes.join(''));
    expect(written).toHaveLength(3);
    expect(written[0]).toMatchObject({
      id: 'ov-1',
      title: 'T1',
      url: 'http://x/1.jpg',
      tags: ['tag1'],
    });
  });

  it('still upserts (best-effort file) when the dataset stream cannot be opened', async () => {
    createWriteStream.mockImplementationOnce(() => {
      throw new Error('EACCES');
    });
    collectPages.mockReturnValue(pagesOf([img(1)]));
    upsertAssets.mockResolvedValue(1);

    const result = await svc.run({ query: 'cat' });

    expect(result).toMatchObject({ fetched: 1, inserted: 1 });
    expect(upsertAssets).toHaveBeenCalledTimes(1);
  });

  it('defaults query + maxRecords when omitted', async () => {
    collectPages.mockReturnValue(pagesOf());
    const result = await svc.run({});
    expect(collectPages).toHaveBeenCalledWith('nature', 500);
    expect(result.fetched).toBe(0);
    expect(writes.join('')).toBe('[]');
  });

  it('passes an explicit maxRecords through to the client', async () => {
    collectPages.mockReturnValue(pagesOf([img(1)]));
    await svc.run({ query: 'dog', maxRecords: 25 });
    expect(collectPages).toHaveBeenCalledWith('dog', 25);
  });
});
