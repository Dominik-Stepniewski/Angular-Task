import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpsertAnnotationDto } from './upsert-annotation.dto';

const base = {
  id: 'p1',
  assetId: 'ov-1',
  label: 'cat',
  points: [
    [0.1, 0.1],
    [0.2, 0.2],
    [0.1, 0.3],
  ],
  rotationRad: 0,
};

const errorsFor = (patch: Record<string, unknown>) =>
  validateSync(plainToInstance(UpsertAnnotationDto, { ...base, ...patch }));

describe('UpsertAnnotationDto', () => {
  it('accepts a valid annotation', () => {
    expect(errorsFor({})).toHaveLength(0);
  });

  it('accepts an optional groupId', () => {
    expect(errorsFor({ groupId: 'g1' })).toHaveLength(0);
  });

  it('rejects an empty label', () => {
    const errors = errorsFor({ label: '' });
    expect(errors.some((e) => e.property === 'label')).toBe(true);
  });

  it('rejects fewer than 3 points', () => {
    const errors = errorsFor({ points: [[0, 0], [1, 1]] });
    expect(errors.some((e) => e.property === 'points')).toBe(true);
  });

  it('rejects a non-numeric rotation', () => {
    const errors = errorsFor({ rotationRad: 'nope' });
    expect(errors.some((e) => e.property === 'rotationRad')).toBe(true);
  });
});
