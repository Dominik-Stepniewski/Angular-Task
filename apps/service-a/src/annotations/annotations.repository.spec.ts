import { AnnotationsRepository } from './annotations.repository';

describe('AnnotationsRepository.replaceForAsset', () => {
  it('deletes existing rows for the asset then inserts the new set', async () => {
    const deleteMany = jest.fn().mockResolvedValue({});
    const insertMany = jest.fn().mockResolvedValue({});
    const col = { deleteMany, insertMany };
    const repo = new AnnotationsRepository({ getCollection: () => col } as never);
    const docs = [{ id: 'p1', assetId: 'ov-1' }] as never;
    await repo.replaceForAsset('ov-1', docs);
    expect(deleteMany).toHaveBeenCalledWith({ assetId: 'ov-1' });
    expect(insertMany).toHaveBeenCalledWith(docs, { ordered: false });
  });

  it('skips insertMany when the set is empty (pure clear)', async () => {
    const deleteMany = jest.fn().mockResolvedValue({});
    const insertMany = jest.fn();
    const repo = new AnnotationsRepository({
      getCollection: () => ({ deleteMany, insertMany }),
    } as never);
    await repo.replaceForAsset('ov-1', []);
    expect(deleteMany).toHaveBeenCalledWith({ assetId: 'ov-1' });
    expect(insertMany).not.toHaveBeenCalled();
  });
});
