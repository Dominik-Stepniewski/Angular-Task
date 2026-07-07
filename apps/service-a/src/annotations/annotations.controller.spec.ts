import { BadRequestException } from '@nestjs/common';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';

describe('AnnotationsController', () => {
  it('delegates upsert to the service', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'p1' });
    const ctrl = new AnnotationsController({ upsert } as unknown as AnnotationsService);
    const dto = { id: 'p1', assetId: 'ov-1', label: 'cat', points: [[0, 0], [1, 1], [2, 2]] as [number, number][], rotationRad: 0 };
    await expect(ctrl.annotate(dto)).resolves.toEqual({ id: 'p1' });
    expect(upsert).toHaveBeenCalledWith(dto);
  });

  it('lists by assetId', async () => {
    const list = jest.fn().mockResolvedValue([{ id: 'p1' }]);
    const ctrl = new AnnotationsController({ list } as unknown as AnnotationsService);
    await expect(ctrl.list('ov-1')).resolves.toEqual([{ id: 'p1' }]);
    expect(list).toHaveBeenCalledWith('ov-1');
  });

  it('rejects a missing assetId with 400', () => {
    const list = jest.fn();
    const ctrl = new AnnotationsController({ list } as unknown as AnnotationsService);
    expect(() => ctrl.list(undefined)).toThrow(BadRequestException);
    expect(list).not.toHaveBeenCalled();
  });
});
