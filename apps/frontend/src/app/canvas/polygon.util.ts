export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export const normalize = (p: Point, s: Size): Point => ({ x: p.x / s.w, y: p.y / s.h });

export const denormalize = (p: Point, s: Size): Point => ({ x: p.x * s.w, y: p.y * s.h });

export const centroid = (pts: Point[]): Point => {
  if (pts.length === 0) return { x: 0, y: 0 };
  const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
};

export const translate = (pts: Point[], delta: Point): Point[] =>
  pts.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));

export const rotate = (pts: Point[], rad: number, pivot: Point = centroid(pts)): Point[] => {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
  });
};

export const snap = (p: Point, targets: Point[], radiusPx: number): Point | null => {
  let best: Point | null = null;
  let bestD = radiusPx;
  for (const t of targets) {
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d <= bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
};

export const scaleAbout = (pts: Point[], anchor: Point, sx: number, sy: number): Point[] =>
  pts.map((p) => ({ x: anchor.x + (p.x - anchor.x) * sx, y: anchor.y + (p.y - anchor.y) * sy }));

export const rectToPolygon = (a: Point, b: Point): Point[] => {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
};

export const boundingBox = (pts: Point[]): { min: Point; max: Point; center: Point } => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const min = { x: Math.min(...xs), y: Math.min(...ys) };
  const max = { x: Math.max(...xs), y: Math.max(...ys) };
  return { min, max, center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 } };
};

export const hitTest = (pt: Point, poly: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};
