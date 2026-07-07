import { AnnotationsRepository } from './annotations.repository';
import { AnnotationsService } from './annotations.service';
import { UpsertAnnotationDto } from './dto/upsert-annotation.dto';

describe('AnnotationsService', () => {
  const dto = (): UpsertAnnotationDto => ({
    id: 'p1',
    assetId: 'ov-1',
    label: 'cat',
    points: [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.1, 0.3],
    ],
    rotationRad: 0,
  });

  it('stamps updatedAt + a default createdAt, then returns the persisted document', async () => {
    const persisted = { id: 'p1', assetId: 'ov-1', label: 'cat', points: [], rotationRad: 0, createdAt: 'C', updatedAt: 'U' };
    const upsert = jest.fn().mockResolvedValue(persisted);
    const svc = new AnnotationsService({ upsert } as unknown as AnnotationsRepository);

    const result = await svc.upsert(dto());

    expect(result).toBe(persisted);
    const passed = upsert.mock.calls[0][0];
    expect(passed).toMatchObject({ id: 'p1', assetId: 'ov-1', label: 'cat', rotationRad: 0 });
    expect(typeof passed.createdAt).toBe('string');
    expect(typeof passed.updatedAt).toBe('string');
  });

  it('passes a supplied createdAt through to the repo', async () => {
    const upsert = jest.fn().mockImplementation(async (a) => a);
    const svc = new AnnotationsService({ upsert } as unknown as AnnotationsRepository);
    await svc.upsert({ ...dto(), createdAt: '2020-01-01T00:00:00.000Z' });
    expect(upsert.mock.calls[0][0].createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('lists annotations for an asset', async () => {
    const rows = [{ id: 'p1', assetId: 'ov-1' }];
    const findByAsset = jest.fn().mockResolvedValue(rows);
    const svc = new AnnotationsService({ findByAsset } as unknown as AnnotationsRepository);
    await expect(svc.list('ov-1')).resolves.toBe(rows);
    expect(findByAsset).toHaveBeenCalledWith('ov-1');
  });

  it('stamps assetId + timestamps on each item and returns a summarizable result', async () => {
    const replaceForAsset = jest.fn().mockResolvedValue(undefined);
    const svc = new AnnotationsService({ replaceForAsset } as unknown as AnnotationsRepository);
    const items = [
      { id: 'p1', groupId: 'g1', label: 'cat', points: [[0, 0], [1, 0], [1, 1]], rotationRad: 0 },
    ] as never;
    const res = await svc.replaceForAsset('ov-1', items);
    const passedDocs = replaceForAsset.mock.calls[0][1];
    expect(replaceForAsset).toHaveBeenCalledWith('ov-1', expect.any(Array));
    expect(passedDocs[0]).toMatchObject({ id: 'p1', assetId: 'ov-1', groupId: 'g1', label: 'cat' });
    expect(typeof passedDocs[0].createdAt).toBe('string');
    expect(res.assetId).toBe('ov-1');
    expect(res.annotations).toHaveLength(1);
  });

  it('ensures indexes on module init', async () => {
    const ensureIndexes = jest.fn().mockResolvedValue(undefined);
    const svc = new AnnotationsService({ ensureIndexes } as unknown as AnnotationsRepository);
    await svc.onModuleInit();
    expect(ensureIndexes).toHaveBeenCalledTimes(1);
  });
});
