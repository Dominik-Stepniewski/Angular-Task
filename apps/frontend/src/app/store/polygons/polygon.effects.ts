import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { Annotation } from '../../api/models';
import { AnnotationsApiService } from '../../api/annotations-api.service';
import { SearchActions } from '../search/search.actions';
import { PolygonActions } from './polygon.actions';
import { Polygon } from './polygon.models';
import { polygonFeature } from './polygon.reducer';

export const toAnnotation = (p: Polygon): Annotation => ({
  id: p.id,
  assetId: p.resultKey,
  groupId: p.groupId,
  label: p.label,
  points: p.points.map((pt) => [pt.x, pt.y]),
  rotationRad: p.rotationRad,
});

export const toPolygon = (a: Annotation): Polygon => ({
  id: a.id,
  resultKey: a.assetId,
  groupId: a.groupId ?? a.id,
  label: a.label,
  points: a.points.map(([x, y]) => ({ x, y })),
  rotationRad: a.rotationRad,
});

export const saveShapes$ = createEffect(
  (actions$ = inject(Actions), api = inject(AnnotationsApiService)) =>
    actions$.pipe(
      ofType(PolygonActions.saveShapes),
      switchMap(({ assetId, polygons }) =>
        api.replace(assetId, polygons.map(toAnnotation)).pipe(
          map((res) =>
            PolygonActions.saveShapesSuccess({
              resultKey: assetId,
              polygons: res.annotations.map(toPolygon),
            }),
          ),
          catchError(() => of(PolygonActions.saveShapesFailure({ assetId }))),
        ),
      ),
    ),
  { functional: true },
);

export const hydratePolygons$ = createEffect(
  (actions$ = inject(Actions), api = inject(AnnotationsApiService), store = inject(Store)) =>
    actions$.pipe(
      ofType(SearchActions.openAsset),
      withLatestFrom(store.select(polygonFeature.selectByKey)),
      filter(([{ asset }, byKey]) => (byKey[asset.id] ?? []).length === 0),
      switchMap(([{ asset }]) =>
        api.list(asset.id).pipe(
          map((annotations) =>
            PolygonActions.hydratePolygons({
              resultKey: asset.id,
              polygons: annotations.map(toPolygon),
            }),
          ),
          catchError(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);
