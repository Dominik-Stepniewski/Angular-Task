import type { Asset, Annotation } from './models';

describe('contracts shapes', () => {
  it('Asset carries image + tag fields', () => {
    const a: Asset = {
      id: 'ov-1',
      title: 'Cat',
      url: 'http://x/full.jpg',
      thumbnail: 'http://x/thumb',
      source: 'flickr',
      license: 'by',
      tags: ['cat'],
      ingestedAt: new Date().toISOString(),
    };
    expect(a.tags).toContain('cat');
  });

  it('Annotation carries a label + normalized points', () => {
    const n: Annotation = {
      id: 'p1',
      assetId: 'ov-1',
      label: 'cat',
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.1, 0.3],
      ],
      rotationRad: 0,
      createdAt: '',
      updatedAt: '',
    };
    expect(n.label).toBe('cat');
    expect(n.points).toHaveLength(3);
  });

  it('Annotation carries an optional groupId (shape membership)', () => {
    const a: Annotation = {
      id: 'p1',
      assetId: 'ov-1',
      groupId: 'g1',
      label: 'cat',
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.1, 0.3],
      ],
      rotationRad: 0,
      createdAt: 'C',
      updatedAt: 'U',
    };
    expect(a.groupId).toBe('g1');
    const b: Annotation = { ...a, groupId: undefined };
    expect(b.groupId).toBeUndefined();
  });
});
