const writeFile = jest.fn().mockResolvedValue(undefined);
const mkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => writeFile(...args),
  mkdir: (...args: unknown[]) => mkdir(...args),
}));

import { AssetsService } from '../assets/assets.service';
import { IngestService } from './ingest.service';
import { OpenverseClient } from './openverse.client';
import { OpenverseImage } from './map-asset';

describe('IngestService', () => {
  let svc: IngestService;
  let collect: jest.Mock;
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

  beforeEach(() => {
    writeFile.mockClear();
    mkdir.mockClear();
    collect = jest.fn();
    upsertAssets = jest.fn().mockResolvedValue(0);
    svc = new IngestService(
      { collect } as unknown as OpenverseClient,
      { upsertAssets } as unknown as AssetsService,
    );
  });

  it('collects via the client, maps images → Asset, writes the file, and upserts into Mongo', async () => {
    collect.mockResolvedValue({ images: [img(1), img(2)], pages: 1 });
    upsertAssets.mockResolvedValue(2);

    const result = await svc.run({ query: 'cat' });

    expect(collect).toHaveBeenCalledWith('cat', 500);
    expect(result).toMatchObject({ file: 'data/dataset.json', fetched: 2, inserted: 2, pages: 1 });
    expect(mkdir).toHaveBeenCalledWith('data', { recursive: true });

    const written = JSON.parse(writeFile.mock.calls[0][1]);
    expect(written).toHaveLength(2);
    expect(written[0]).toMatchObject({
      id: 'ov-1',
      title: 'T1',
      url: 'http://x/1.jpg',
      tags: ['tag1'],
    });
    expect(upsertAssets).toHaveBeenCalledWith(written);
  });

  it('still upserts (best-effort file) when the dataset file write fails', async () => {
    collect.mockResolvedValue({ images: [img(1)], pages: 1 });
    upsertAssets.mockResolvedValue(1);
    writeFile.mockRejectedValueOnce(new Error('EACCES'));

    const result = await svc.run({ query: 'cat' });

    expect(result).toMatchObject({ fetched: 1, inserted: 1 });
    expect(upsertAssets).toHaveBeenCalledTimes(1);
  });

  it('defaults query + maxRecords when omitted', async () => {
    collect.mockResolvedValue({ images: [], pages: 0 });
    const result = await svc.run({});
    expect(collect).toHaveBeenCalledWith('nature', 500);
    expect(result.fetched).toBe(0);
  });

  it('passes an explicit maxRecords through to the client', async () => {
    collect.mockResolvedValue({ images: [img(1)], pages: 1 });
    await svc.run({ query: 'dog', maxRecords: 25 });
    expect(collect).toHaveBeenCalledWith('dog', 25);
  });
});
