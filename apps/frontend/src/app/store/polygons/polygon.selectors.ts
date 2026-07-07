import { createSelector } from '@ngrx/store';
import { polygonFeature } from './polygon.reducer';

const cache = new Map<string, ReturnType<typeof build>>();
const build = (resultKey: string) =>
  createSelector(polygonFeature.selectByKey, (byKey) => byKey[resultKey] ?? []);

export const selectPolygonsForKey = (resultKey: string) => {
  let selector = cache.get(resultKey);
  if (!selector) {
    selector = build(resultKey);
    cache.set(resultKey, selector);
  }
  return selector;
};

export const selectShapeCountByKey = createSelector(
  polygonFeature.selectByKey,
  (byKey): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [key, polys] of Object.entries(byKey)) {
      if (polys.length === 0) continue;
      out[key] = new Set(polys.map((p) => p.groupId || p.id)).size;
    }
    return out;
  },
);
