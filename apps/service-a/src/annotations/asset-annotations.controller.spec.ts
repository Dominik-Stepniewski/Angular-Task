import { AssetAnnotationsController } from './asset-annotations.controller';
import { AnnotationsService } from './annotations.service';

describe('AssetAnnotationsController', () => {
  it('replaces the set for the path assetId and returns the persisted payload', async () => {
    const replaceForAsset = jest.fn().mockResolvedValue({
      assetId: 'ov-1',
      annotations: [{ id: 'p1' }],
      data: [{ id: 'p1' }],
    });
    const ctrl = new AssetAnnotationsController({ replaceForAsset } as unknown as AnnotationsService);
    const dto = {
      annotations: [
        { id: 'p1', label: 'cat', points: [[0, 0], [1, 0], [1, 1]] as [number, number][], rotationRad: 0 },
      ],
    };
    const res = await ctrl.annotate('ov-1', dto);
    expect(replaceForAsset).toHaveBeenCalledWith('ov-1', dto.annotations);
    expect(res).toMatchObject({ assetId: 'ov-1' });
  });

  it('has a handler named "annotate" so the TimeSeriesInterceptor emits', () => {
    expect(typeof AssetAnnotationsController.prototype.annotate).toBe('function');
  });
});
