import { createFeature, createReducer, on } from '@ngrx/store';
import { PolygonActions } from './polygon.actions';
import { Polygon } from './polygon.models';

export interface PolygonState {
  byKey: Record<string, Polygon[]>;
}

export const initialPolygonState: PolygonState = { byKey: {} };

export const polygonFeature = createFeature({
  name: 'polygons',
  reducer: createReducer(
    initialPolygonState,
    on(PolygonActions.upsertPolygon, (state, { polygon }) => {
      const existing = state.byKey[polygon.resultKey] ?? [];
      const idx = existing.findIndex((p) => p.id === polygon.id);
      const next =
        idx >= 0
          ? existing.map((p) => (p.id === polygon.id ? polygon : p))
          : [...existing, polygon];
      return { ...state, byKey: { ...state.byKey, [polygon.resultKey]: next } };
    }),
    on(PolygonActions.deletePolygon, (state, { resultKey, id }) => ({
      ...state,
      byKey: {
        ...state.byKey,
        [resultKey]: (state.byKey[resultKey] ?? []).filter((p) => p.id !== id),
      },
    })),
    on(PolygonActions.clearPolygons, (state, { resultKey }) => ({
      ...state,
      byKey: { ...state.byKey, [resultKey]: [] },
    })),
    on(PolygonActions.hydratePolygons, (state, { resultKey, polygons }) => ({
      ...state,
      byKey: { ...state.byKey, [resultKey]: polygons },
    })),
    on(PolygonActions.saveShapesSuccess, (state, { resultKey, polygons }) => ({
      ...state,
      byKey: { ...state.byKey, [resultKey]: polygons },
    })),
  ),
});
