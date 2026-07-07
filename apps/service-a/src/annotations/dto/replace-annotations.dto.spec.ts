import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceAnnotationsDto } from './replace-annotations.dto';

const item = () => ({
  id: 'p1',
  groupId: 'g1',
  label: 'cat',
  points: [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  rotationRad: 0,
});

describe('ReplaceAnnotationsDto', () => {
  it('accepts a valid annotations array (groupId optional)', async () => {
    const dto = plainToInstance(ReplaceAnnotationsDto, {
      annotations: [item(), { ...item(), groupId: undefined }],
    });
    expect(await validate(dto)).toHaveLength(0);
  });
  it('accepts an empty array (clears the asset)', async () => {
    const dto = plainToInstance(ReplaceAnnotationsDto, { annotations: [] });
    expect(await validate(dto)).toHaveLength(0);
  });
  it('rejects an item with fewer than 3 points', async () => {
    const dto = plainToInstance(ReplaceAnnotationsDto, {
      annotations: [{ ...item(), points: [[0, 0], [1, 1]] }],
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
  it('rejects an item with an empty label', async () => {
    const dto = plainToInstance(ReplaceAnnotationsDto, {
      annotations: [{ ...item(), label: '' }],
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
