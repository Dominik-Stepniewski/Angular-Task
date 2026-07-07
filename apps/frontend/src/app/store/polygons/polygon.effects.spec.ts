import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Annotation, Asset } from '../../api/models';
import { AnnotationsApiService } from '../../api/annotations-api.service';
import { SearchActions } from '../search/search.actions';
import { PolygonActions } from './polygon.actions';
import { Polygon } from './polygon.models';
import { initialPolygonState } from './polygon.reducer';
import * as effects from './polygon.effects';
import { hydratePolygons$, saveShapes$, toAnnotation, toPolygon } from './polygon.effects';

const polygon: Polygon = {
  id: 'p1',
  resultKey: 'ov-1',
  groupId: 'g1',
  label: 'cat',
  points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.1, y: 0.3 }],
  rotationRad: 0,
};

const asset = (id: string): Asset => ({
  id,
  title: id,
  url: 'u',
  thumbnail: 't',
  source: 's',
  license: 'by',
  tags: [],
  ingestedAt: '',
});

describe('polygon effects', () => {
  it('toAnnotation / toPolygon round-trips points and label', () => {
    const a = toAnnotation(polygon);
    expect(a).toMatchObject({ id: 'p1', assetId: 'ov-1', label: 'cat', points: [[0.1, 0.1], [0.2, 0.2], [0.1, 0.3]] });
    expect(toPolygon(a)).toEqual(polygon);
  });

  it('toAnnotation carries groupId through', () => {
    expect(toAnnotation(polygon).groupId).toBe('g1');
  });

  it('toPolygon defaults groupId to the row id when absent (legacy = singleton shape)', () => {
    const a: Annotation = {
      id: 'p1', assetId: 'ov-1', label: 'cat',
      points: [[0, 0]], rotationRad: 0, createdAt: 'C', updatedAt: 'U',
    };
    expect(toPolygon(a).groupId).toBe('p1');
  });

  it('no longer exports persistPolygon$ (per-edit auto-persist removed)', () => {
    expect((effects as Record<string, unknown>)['persistPolygon$']).toBeUndefined();
  });

  it('saveShapes$ PUTs the full set and dispatches saveShapesSuccess', async () => {
    const replace = jest.fn().mockReturnValue(of({ assetId: 'ov-1', annotations: [toAnnotation(polygon)] }));
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(PolygonActions.saveShapes({ assetId: 'ov-1', polygons: [polygon] }))),
        { provide: AnnotationsApiService, useValue: { replace } },
      ],
    });
    const emitted = await TestBed.runInInjectionContext(() => firstValueFrom(saveShapes$()));
    expect(replace).toHaveBeenCalledWith('ov-1', [toAnnotation(polygon)]);
    expect(emitted).toEqual(
      PolygonActions.saveShapesSuccess({ resultKey: 'ov-1', polygons: [polygon] }),
    );
  });

  it('saveShapes$ dispatches saveShapesFailure on API error', async () => {
    const replace = jest.fn().mockReturnValue(throwError(() => new Error('boom')));
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(PolygonActions.saveShapes({ assetId: 'ov-1', polygons: [polygon] }))),
        { provide: AnnotationsApiService, useValue: { replace } },
      ],
    });
    const emitted = await TestBed.runInInjectionContext(() => firstValueFrom(saveShapes$()));
    expect(emitted).toEqual(PolygonActions.saveShapesFailure({ assetId: 'ov-1' }));
  });

  it('hydratePolygons$ fetches + dispatches hydrate when the key is empty', async () => {
    const list = jest.fn().mockReturnValue(of([toAnnotation(polygon)]));
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(SearchActions.openAsset({ asset: asset('ov-1') }))),
        provideMockStore({ initialState: { polygons: initialPolygonState } }),
        { provide: AnnotationsApiService, useValue: { list } },
      ],
    });
    const emitted = await TestBed.runInInjectionContext(() => firstValueFrom(hydratePolygons$()));
    expect(list).toHaveBeenCalledWith('ov-1');
    expect(emitted).toEqual(
      PolygonActions.hydratePolygons({ resultKey: 'ov-1', polygons: [polygon] }),
    );
  });

  it('hydratePolygons$ does NOT fetch when the key already has polygons', async () => {
    const list = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(SearchActions.openAsset({ asset: asset('ov-1') }))),
        provideMockStore({ initialState: { polygons: { byKey: { 'ov-1': [polygon] } } } }),
        { provide: AnnotationsApiService, useValue: { list } },
      ],
    });
    let count = 0;
    await TestBed.runInInjectionContext(async () => {
      hydratePolygons$().subscribe(() => count++);
    });
    expect(count).toBe(0);
    expect(list).not.toHaveBeenCalled();
  });
});
