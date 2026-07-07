import { PolygonActions } from './polygon.actions';
import { Polygon } from './polygon.models';
import { initialPolygonState, polygonFeature } from './polygon.reducer';
import { selectPolygonsForKey } from './polygon.selectors';

const reducer = polygonFeature.reducer;
const poly = (id: string, key: string): Polygon => ({
  id,
  resultKey: key,
  groupId: id,
  label: 'cat',
  points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
  rotationRad: 0,
});

describe('polygon reducer + selector', () => {
  it('upsert adds a polygon under its resultKey', () => {
    const s = reducer(initialPolygonState, PolygonActions.upsertPolygon({ polygon: poly('p1', 'k1') }));
    expect(s.byKey['k1']).toHaveLength(1);
  });

  it('upsert replaces an existing polygon with the same id', () => {
    let s = reducer(initialPolygonState, PolygonActions.upsertPolygon({ polygon: poly('p1', 'k1') }));
    const moved = { ...poly('p1', 'k1'), rotationRad: 1.5 };
    s = reducer(s, PolygonActions.upsertPolygon({ polygon: moved }));
    expect(s.byKey['k1']).toHaveLength(1);
    expect(s.byKey['k1'][0].rotationRad).toBe(1.5);
  });

  it('keeps polygons of different keys isolated', () => {
    let s = reducer(initialPolygonState, PolygonActions.upsertPolygon({ polygon: poly('p1', 'k1') }));
    s = reducer(s, PolygonActions.upsertPolygon({ polygon: poly('p2', 'k2') }));
    expect(selectPolygonsForKey('k1')({ polygons: s }).map((p) => p.id)).toEqual(['p1']);
    expect(selectPolygonsForKey('k2')({ polygons: s }).map((p) => p.id)).toEqual(['p2']);
  });

  it('delete removes a single polygon; clear empties the key', () => {
    let s = reducer(initialPolygonState, PolygonActions.upsertPolygon({ polygon: poly('p1', 'k1') }));
    s = reducer(s, PolygonActions.upsertPolygon({ polygon: poly('p2', 'k1') }));
    s = reducer(s, PolygonActions.deletePolygon({ resultKey: 'k1', id: 'p1' }));
    expect(s.byKey['k1'].map((p) => p.id)).toEqual(['p2']);
    s = reducer(s, PolygonActions.clearPolygons({ resultKey: 'k1' }));
    expect(s.byKey['k1']).toEqual([]);
  });

  it('hydrate replaces a key with the persisted polygons', () => {
    let s = reducer(initialPolygonState, PolygonActions.upsertPolygon({ polygon: poly('stale', 'k1') }));
    s = reducer(
      s,
      PolygonActions.hydratePolygons({ resultKey: 'k1', polygons: [poly('a', 'k1'), poly('b', 'k1')] }),
    );
    expect(s.byKey['k1'].map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('selectPolygonsForKey returns [] for an unknown key', () => {
    expect(selectPolygonsForKey('nope')({ polygons: initialPolygonState })).toEqual([]);
  });
});
