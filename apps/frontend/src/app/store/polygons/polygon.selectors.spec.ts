import { selectShapeCountByKey } from './polygon.selectors';
import { Polygon } from './polygon.models';

const poly = (id: string, resultKey: string, groupId = id): Polygon => ({
  id,
  resultKey,
  groupId,
  label: '',
  points: [],
  rotationRad: 0,
});

describe('selectShapeCountByKey', () => {
  it('counts distinct groupIds per key, skipping empty keys', () => {
    const byKey = {
      a: [poly('1', 'a', 'g1'), poly('2', 'a', 'g1'), poly('3', 'a', 'g2')],
      b: [poly('4', 'b')],
      c: [],
    };
    expect(selectShapeCountByKey.projector(byKey)).toEqual({ a: 2, b: 1 });
  });

  it('is {} when nothing is annotated', () => {
    expect(selectShapeCountByKey.projector({})).toEqual({});
  });
});
