import { createActionGroup, props } from '@ngrx/store';
import { Polygon } from './polygon.models';

export const PolygonActions = createActionGroup({
  source: 'Polygon',
  events: {
    'Upsert Polygon': props<{ polygon: Polygon }>(),
    'Delete Polygon': props<{ resultKey: string; id: string }>(),
    'Clear Polygons': props<{ resultKey: string }>(),
    'Hydrate Polygons': props<{ resultKey: string; polygons: Polygon[] }>(),
    'Save Shapes': props<{ assetId: string; polygons: Polygon[] }>(),
    'Save Shapes Success': props<{ resultKey: string; polygons: Polygon[] }>(),
    'Save Shapes Failure': props<{ assetId: string }>(),
  },
});
