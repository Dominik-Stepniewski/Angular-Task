import {
  boundingBox,
  centroid,
  denormalize,
  hitTest,
  normalize,
  Point,
  rectToPolygon,
  rotate,
  scaleAbout,
  snap,
  translate,
} from './polygon.util';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('polygon.util', () => {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('normalize/denormalize round-trip', () => {
    const size = { w: 200, h: 100 };
    const p = { x: 50, y: 25 };
    const back = denormalize(normalize(p, size), size);
    expect(near(back.x, p.x)).toBe(true);
    expect(near(back.y, p.y)).toBe(true);
  });

  it('centroid of a square is its center', () => {
    expect(centroid(square)).toEqual({ x: 5, y: 5 });
  });

  it('centroid of empty is origin', () => {
    expect(centroid([])).toEqual({ x: 0, y: 0 });
  });

  it('translate shifts every point', () => {
    expect(translate(square, { x: 2, y: -3 })).toEqual([
      { x: 2, y: -3 },
      { x: 12, y: -3 },
      { x: 12, y: 7 },
      { x: 2, y: 7 },
    ]);
  });

  it('rotate by 2π returns (approximately) the original', () => {
    const r = rotate(square, Math.PI * 2);
    r.forEach((p, i) => {
      expect(near(p.x, square[i].x, 1e-6)).toBe(true);
      expect(near(p.y, square[i].y, 1e-6)).toBe(true);
    });
  });

  it('rotate by 90° about centroid maps a corner to the next', () => {
    const r = rotate(square, Math.PI / 2);
    expect(near(r[0].x, 10, 1e-6)).toBe(true);
    expect(near(r[0].y, 0, 1e-6)).toBe(true);
  });

  it('hitTest: inside vs outside', () => {
    expect(hitTest({ x: 5, y: 5 }, square)).toBe(true);
    expect(hitTest({ x: 15, y: 5 }, square)).toBe(false);
    expect(hitTest({ x: -1, y: -1 }, square)).toBe(false);
  });
});

describe('snap', () => {
  const targets = [
    { x: 100, y: 100 },
    { x: 200, y: 50 },
  ];
  it('returns the nearest target within radius', () => {
    expect(snap({ x: 106, y: 103 }, targets, 10)).toEqual({ x: 100, y: 100 });
  });
  it('returns null when no target is within radius', () => {
    expect(snap({ x: 140, y: 140 }, targets, 10)).toBeNull();
  });
  it('picks the closest when several are in range', () => {
    const nearTargets = [
      { x: 100, y: 100 },
      { x: 105, y: 100 },
    ];
    expect(snap({ x: 104, y: 100 }, nearTargets, 10)).toEqual({ x: 105, y: 100 });
  });
  it('returns null for empty targets', () => {
    expect(snap({ x: 0, y: 0 }, [], 10)).toBeNull();
  });
});

describe('scaleAbout', () => {
  const sq = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it('scales about the anchor (anchor stays fixed)', () => {
    const out = scaleAbout(sq, { x: 0, y: 0 }, 2, 2);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ]);
  });
  it('supports non-uniform scale', () => {
    const out = scaleAbout(sq, { x: 0, y: 0 }, 2, 3);
    expect(out[2]).toEqual({ x: 20, y: 30 });
  });
});

describe('rectToPolygon', () => {
  it('returns 4 vertices [tl,tr,br,bl] from two opposite corners', () => {
    expect(rectToPolygon({ x: 10, y: 20 }, { x: 50, y: 60 })).toEqual([
      { x: 10, y: 20 },
      { x: 50, y: 20 },
      { x: 50, y: 60 },
      { x: 10, y: 60 },
    ]);
  });
  it('normalizes corner order (drag up-left works)', () => {
    expect(rectToPolygon({ x: 50, y: 60 }, { x: 10, y: 20 })).toEqual([
      { x: 10, y: 20 },
      { x: 50, y: 20 },
      { x: 50, y: 60 },
      { x: 10, y: 60 },
    ]);
  });
});

describe('boundingBox', () => {
  it('computes min, max, center over all points', () => {
    const bb = boundingBox([
      { x: 10, y: 5 },
      { x: 30, y: 25 },
      { x: 20, y: 15 },
    ]);
    expect(bb.min).toEqual({ x: 10, y: 5 });
    expect(bb.max).toEqual({ x: 30, y: 25 });
    expect(bb.center).toEqual({ x: 20, y: 15 });
  });
});
