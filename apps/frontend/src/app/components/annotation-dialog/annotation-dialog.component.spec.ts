import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EMPTY } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Asset } from '../../api/models';
import { API_BASE_URL } from '../../api/api-config';
import { PolygonActions } from '../../store/polygons/polygon.actions';
import { initialPolygonState } from '../../store/polygons/polygon.reducer';
import { Polygon } from '../../store/polygons/polygon.models';
import { AnnotationDialogComponent } from './annotation-dialog.component';

const asset: Asset = {
  id: 'ov-1',
  title: 'Cat',
  url: 'u',
  thumbnail: 't',
  source: 'flickr',
  license: 'by',
  tags: ['cat', 'pet'],
  ingestedAt: '',
};
const ev = (x: number, y: number) =>
  ({ offsetX: x, offsetY: y, clientX: x, clientY: y }) as unknown as PointerEvent;

const poly = (id: string, groupId: string, points: Polygon['points']): Polygon => ({
  id,
  resultKey: 'ov-1',
  groupId,
  label: 'cat',
  points,
  rotationRad: 0,
});

const square: Polygon = poly('p1', 'p1', [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
]);

describe('AnnotationDialogComponent', () => {
  let store: MockStore;
  let dispatch: jest.SpyInstance;
  let close: jest.Mock;

  beforeEach(() => {
    close = jest.fn();
    const dialogRef = {
      close,
      afterOpened: () => EMPTY,
      backdropClick: () => EMPTY,
      keydownEvents: () => EMPTY,
    };
    TestBed.configureTestingModule({
      imports: [AnnotationDialogComponent],
      providers: [
        provideMockStore({ initialState: { polygons: initialPolygonState } }),
        { provide: MAT_DIALOG_DATA, useValue: { asset } },
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  });

  const seed = (polys: Polygon[]) =>
    store.setState({ polygons: { byKey: { 'ov-1': polys } } });

  const make = () => {
    const cmp = TestBed.createComponent(AnnotationDialogComponent).componentInstance;
    cmp.canvasSize = { w: 100, h: 100 };
    return cmp;
  };

  it('builds the image url from the proxy path (same-origin image)', () => {
    expect(make().imageUrl).toBe('http://api.test/assets/ov-1/image');
  });

  it('syncSize sets the backing store to client size × dpr and updates canvasSize', () => {
    const cmp = make();
    const canvas = document.createElement('canvas');
    jest
      .spyOn(canvas, 'getBoundingClientRect')
      .mockReturnValue({ width: 640, height: 360 } as DOMRect);
    (cmp as unknown as { canvasRef: () => { nativeElement: HTMLCanvasElement } }).canvasRef = () => ({
      nativeElement: canvas,
    });
    (cmp as unknown as { syncSize: () => void }).syncSize();
    const dpr = window.devicePixelRatio || 1;
    expect(cmp.canvasSize).toEqual({ w: 640, h: 360 });
    expect(canvas.width).toBe(Math.round(640 * dpr));
    expect(canvas.height).toBe(Math.round(360 * dpr));
  });

  it('syncSize prefers clientWidth/Height over the transform-poisoned rect', () => {
    const cmp = make();
    const canvas = document.createElement('canvas');
    jest
      .spyOn(canvas, 'getBoundingClientRect')
      .mockReturnValue({ width: 416, height: 234 } as DOMRect);
    Object.defineProperty(canvas, 'clientWidth', { value: 520, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 293, configurable: true });
    (cmp as unknown as { canvasRef: () => { nativeElement: HTMLCanvasElement } }).canvasRef = () => ({
      nativeElement: canvas,
    });
    (cmp as unknown as { syncSize: () => void }).syncSize();
    const dpr = window.devicePixelRatio || 1;
    expect(cmp.canvasSize).toEqual({ w: 520, h: 293 });
    expect(canvas.width).toBe(Math.round(520 * dpr));
  });

  it('seeds the working copy from the store and is not dirty on open', () => {
    seed([square]);
    const cmp = make();
    expect(cmp.workingPolys()).toHaveLength(1);
    expect(cmp.dirty()).toBe(false);
  });

  it('becomes dirty once the working copy is mutated', () => {
    seed([square]);
    const cmp = make();
    cmp.workingPolys.update((list) => list.filter(() => false));
    expect(cmp.dirty()).toBe(true);
  });

  it('rect mode drag commits one 4-vertex polygon matching the dragged bounds', () => {
    const cmp = make();
    cmp.mode.set('rect');
    cmp.onPointerDown(ev(10, 10));
    cmp.onPointerMove(ev(50, 60));
    cmp.onPointerUp();

    expect(cmp.workingPolys()).toHaveLength(1);
    expect(cmp.workingPolys()[0].points).toEqual([
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.6 },
      { x: 0.1, y: 0.6 },
    ]);
  });

  it('a rect drawn onto an existing vertex adopts that shape group + label', () => {
    seed([square]);
    const cmp = make();
    cmp.mode.set('rect');
    cmp.onPointerDown(ev(22, 22));
    cmp.onPointerMove(ev(60, 60));
    cmp.onPointerUp();

    const committed = cmp.workingPolys()[cmp.workingPolys().length - 1];
    expect(cmp.workingPolys()).toHaveLength(2);
    expect(committed.groupId).toBe('p1');
    expect(committed.label).toBe('cat');
  });

  it('a rect drawn far from others gets a fresh group', () => {
    const cmp = make();
    cmp.mode.set('rect');
    cmp.onPointerDown(ev(10, 10));
    cmp.onPointerMove(ev(30, 30));
    cmp.onPointerUp();
    const committed = cmp.workingPolys()[0];
    expect(committed.groupId).toBe(committed.id);
  });

  it('a rect drawn while a shape is selected joins that group + inherits its label', () => {
    const a = poly('a', 'g1', [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.1, y: 0.2 },
    ]);
    seed([a]);
    const cmp = make();
    cmp.selectedGroupId.set('g1');
    cmp.mode.set('rect');
    cmp.onPointerDown(ev(60, 60));
    cmp.onPointerMove(ev(80, 80));
    cmp.onPointerUp();

    const committed = cmp.workingPolys()[cmp.workingPolys().length - 1];
    expect(committed.groupId).toBe('g1');
    expect(committed.label).toBe('cat');
  });

  it('draw mode: clicking vertices then near the first closes a polygon', () => {
    const cmp = make();
    cmp.onPointerDown(ev(10, 10));
    cmp.onPointerUp();
    cmp.onPointerDown(ev(80, 10));
    cmp.onPointerUp();
    cmp.onPointerDown(ev(80, 80));
    cmp.onPointerUp();
    cmp.onPointerDown(ev(12, 12));
    cmp.onPointerUp();

    expect(cmp.draft()).toHaveLength(0);
    expect(cmp.workingPolys()).toHaveLength(1);
    expect(cmp.workingPolys()[0].points).toHaveLength(3);
  });

  it('closeDraft ignores a draft with fewer than 3 points', () => {
    const cmp = make();
    cmp.addDraftPoint({ x: 10, y: 10 });
    cmp.addDraftPoint({ x: 80, y: 10 });
    cmp.closeDraft();
    expect(cmp.workingPolys()).toHaveLength(0);
    expect(cmp.draft()).toHaveLength(2);
  });

  it('clamps drawn vertices to the image rect (draw only within the picture)', () => {
    const cmp = make();
    cmp.canvasSize = { w: 100, h: 100 };
    (cmp as unknown as { imageNatural: { w: number; h: number } }).imageNatural = { w: 100, h: 50 };
    cmp.addDraftPoint({ x: 50, y: 10 });
    cmp.addDraftPoint({ x: 50, y: 90 });
    const d = cmp.draft();
    expect(d[0].y).toBe(25);
    expect(d[1].y).toBe(75);
  });

  it('setMode clears an in-progress draft', () => {
    const cmp = make();
    cmp.addDraftPoint({ x: 10, y: 10 });
    cmp.addDraftPoint({ x: 40, y: 10 });
    cmp.setMode('edit');
    expect(cmp.draft()).toHaveLength(0);
  });

  it('handleAt returns the corner under a corner point and rotate over the handle', () => {
    seed([square]);
    const cmp = make();
    cmp.selectedGroupId.set('g-none');
    expect(cmp.handleAt({ x: 20, y: 20 }, 'p1')).toBe('nw');
    expect(cmp.handleAt({ x: 80, y: 80 }, 'p1')).toBe('se');
    expect(cmp.handleAt({ x: 50, y: 80 + 24 }, 'p1')).toBe('rotate');
    expect(cmp.handleAt({ x: 50, y: 50 }, 'p1')).toBeNull();
  });

  it('keeps the rotate handle above a shape with room over it', () => {
    const low = poly('lo', 'lo', [
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.5 },
      { x: 0.7, y: 0.7 },
      { x: 0.5, y: 0.7 },
    ]);
    seed([low]);
    const cmp = make();
    expect(cmp.handleAt({ x: 60, y: 26 }, 'lo')).toBe('rotate');
  });

  it('pointer inside a shape body selects it; empty space deselects', () => {
    seed([square]);
    const cmp = make();
    cmp.mode.set('edit');
    cmp.onPointerDown(ev(50, 50));
    expect(cmp.selectedGroupId()).toBe('p1');
    cmp.onPointerUp();
    cmp.onPointerDown(ev(5, 5));
    expect(cmp.selectedGroupId()).toBeNull();
  });

  it('dragging a selected shape body moves every polygon of its group', () => {
    seed([square]);
    const cmp = make();
    cmp.selectedGroupId.set('p1');
    cmp.mode.set('edit');
    cmp.onPointerDown(ev(50, 50));
    cmp.onPointerMove(ev(60, 55));
    cmp.onPointerUp();
    expect(cmp.workingPolys()[0].points[0].x).toBeCloseTo(0.3, 5);
    expect(cmp.workingPolys()[0].points[0].y).toBeCloseTo(0.25, 5);
  });

  it('clamps a move so the shape stays within the image', () => {
    const sq = poly('m', 'm', [
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.4 },
      { x: 0.6, y: 0.6 },
      { x: 0.4, y: 0.6 },
    ]);
    seed([sq]);
    const cmp = make();
    (cmp as unknown as { imageNatural: { w: number; h: number } }).imageNatural = { w: 100, h: 50 };
    cmp.selectedGroupId.set('m');
    cmp.moveSelectedShape(0, 100);
    const ys = cmp.workingPolys()[0].points.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(0.75, 5);
    expect(Math.min(...ys)).toBeCloseTo(0.55, 5);
  });

  it('dragging a corner handle scales the shape about the opposite corner', () => {
    seed([square]);
    const cmp = make();
    cmp.selectedGroupId.set('p1');
    cmp.mode.set('edit');
    cmp.onPointerDown(ev(80, 80));
    cmp.onPointerMove(ev(140, 140));
    cmp.onPointerUp();
    const pts = cmp.workingPolys()[0].points;
    expect(pts[0]).toEqual({ x: 0.2, y: 0.2 });
    expect(pts[2].x).toBeCloseTo(1.4, 5);
  });

  it('dragging the rotate handle rotates the shape about its center', () => {
    seed([square]);
    const cmp = make();
    cmp.selectedGroupId.set('p1');
    cmp.mode.set('edit');
    cmp.onPointerDown(ev(50, 104));
    cmp.onPointerMove(ev(104, 50));
    cmp.onPointerUp();
    const pts = cmp.workingPolys()[0].points;
    expect(pts).not.toEqual(square.points);
  });

  it('scales every polygon of the selected shape about the anchor', () => {
    const a = poly('a', 'g1', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]);
    const b = poly('b', 'g1', [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.3, y: 0.4 }]);
    seed([a, b]);
    const cmp = make();
    cmp.selectedGroupId.set('g1');
    cmp.scaleSelectedShape(2, 2, { x: 0, y: 0 });

    expect(cmp.workingPolys()[0].points[0]).toEqual({ x: 0.2, y: 0.2 });
    expect(cmp.workingPolys()[1].points[0]).toEqual({ x: 0.6, y: 0.6 });
  });

  it('rotates every polygon of the selected shape about a shared center', () => {
    const a = poly('a', 'g1', [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.5, y: 0.6 }]);
    seed([a]);
    const cmp = make();
    cmp.selectedGroupId.set('g1');
    cmp.rotateSelectedShape(Math.PI, { x: 50, y: 50 });
    const pts = cmp.workingPolys()[0].points;
    expect(pts[0].x).toBeCloseTo(0.5, 5);
    expect(pts[1].x).toBeCloseTo(0.4, 5);
  });

  it('deleteSelected removes every polygon of the selected group', () => {
    const a = poly('a', 'g1', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]);
    const b = poly('b', 'g1', [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.3, y: 0.4 }]);
    const c = poly('c', 'g2', [{ x: 0.6, y: 0.6 }, { x: 0.8, y: 0.6 }, { x: 0.6, y: 0.8 }]);
    seed([a, b, c]);
    const cmp = make();
    cmp.selectedGroupId.set('g1');
    cmp.deleteSelected();
    expect(cmp.workingPolys().map((p) => p.id)).toEqual(['c']);
    expect(cmp.selectedGroupId()).toBeNull();
  });

  it('deleteSelected is a no-op with nothing selected', () => {
    seed([square]);
    const cmp = make();
    cmp.deleteSelected();
    expect(cmp.workingPolys()).toHaveLength(1);
  });

  it('newShape deselects and clears the label field (clean state, no prompt)', () => {
    seed([square]);
    const cmp = make();
    const spy = jest.spyOn(cmp as unknown as { confirmSaveCurrent: () => boolean }, 'confirmSaveCurrent');
    cmp.selectedGroupId.set('p1');
    cmp.label.set('cat');
    cmp.newShape();
    expect(spy).not.toHaveBeenCalled();
    expect(cmp.selectedGroupId()).toBeNull();
    expect(cmp.label()).toBe('');
  });

  it('newShape saves the current work when dirty and the user confirms', () => {
    seed([square]);
    const cmp = make();
    jest.spyOn(cmp as unknown as { confirmSaveCurrent: () => boolean }, 'confirmSaveCurrent').mockReturnValue(true);
    cmp.workingPolys.update((list) => [
      ...list,
      poly('p2', 'p2', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]),
    ]);
    dispatch.mockClear();
    cmp.newShape();
    const saves = dispatch.mock.calls.filter((c) => c[0].type === PolygonActions.saveShapes.type);
    expect(saves).toHaveLength(1);
    expect(cmp.selectedGroupId()).toBeNull();
  });

  it('newShape discards the current work when dirty and the user cancels', () => {
    seed([square]);
    const cmp = make();
    jest.spyOn(cmp as unknown as { confirmSaveCurrent: () => boolean }, 'confirmSaveCurrent').mockReturnValue(false);
    cmp.workingPolys.update((list) => [
      ...list,
      poly('p2', 'p2', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]),
    ]);
    dispatch.mockClear();
    cmp.newShape();
    const saves = dispatch.mock.calls.filter((c) => c[0].type === PolygonActions.saveShapes.type);
    expect(saves).toHaveLength(0);
    expect(cmp.workingPolys()).toHaveLength(1);
    expect(cmp.dirty()).toBe(false);
  });

  it('always shows the label field, with or without a selection', () => {
    seed([square]);
    const fixture = TestBed.createComponent(AnnotationDialogComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.label-field')).not.toBeNull();
    fixture.componentInstance.selectedGroupId.set('p1');
    fixture.detectChanges();
    expect(el.querySelector('.label-field')).not.toBeNull();
  });

  it('label suggestions offer previously-used labels (not image tags), filtered by text', () => {
    seed([
      poly('a', 'a', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]),
      { ...poly('b', 'b', [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.3, y: 0.4 }]), label: 'dog' },
      { ...poly('c', 'c', [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.5, y: 0.6 }]), label: '(unlabeled)' },
    ]);
    const cmp = make();
    cmp.labelFocused.set(true);
    cmp.label.set('');
    expect(cmp.labelSuggestions()).toEqual(['cat', 'dog']);
    cmp.label.set('do');
    expect(cmp.labelSuggestions()).toEqual(['dog']);
    expect(cmp.showLabelSuggestions()).toBe(true);
  });

  it('hides every saved shape until a label is revealed', () => {
    seed([square]);
    const cmp = make();
    expect(cmp.revealedLabel()).toBeNull();
    expect(cmp.visiblePolys()).toHaveLength(0);
  });

  it('pickLabel reveals that label — selecting a match, collapsing the list, without relabeling', () => {
    seed([square]);
    const cmp = make();
    cmp.labelFocused.set(true);
    cmp.pickLabel('cat');
    expect(cmp.revealedLabel()).toBe('cat');
    expect(cmp.selectedGroupId()).toBe('p1');
    expect(cmp.labelFocused()).toBe(false);
    expect(cmp.workingPolys()[0].label).toBe('cat');
    expect(cmp.visiblePolys()).toHaveLength(1);
  });

  it('revealing a label shows only that label’s shapes, plus the selected group', () => {
    const dog = { ...poly('p2', 'p2', [{ x: 0.1, y: 0.1 }, { x: 0.15, y: 0.1 }, { x: 0.1, y: 0.15 }]), label: 'dog' };
    seed([square, dog]);
    const cmp = make();
    cmp.pickLabel('dog');
    expect(cmp.visiblePolys().map((p) => p.label)).toEqual(['dog']);
    cmp.selectedGroupId.set('p1');
    expect(cmp.visiblePolys().map((p) => p.groupId).sort()).toEqual(['p1', 'p2']);
  });

  it('applyLabelToSelected sets the label on the group and reveals it so the shape stays visible', () => {
    const a = poly('a', 'g1', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]);
    const b = poly('b', 'g1', [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.3, y: 0.4 }]);
    seed([a, b]);
    const cmp = make();
    cmp.selectedGroupId.set('g1');
    cmp.label.set('dog');
    cmp.applyLabelToSelected();
    expect(cmp.workingPolys().every((p) => p.label === 'dog')).toBe(true);
    expect(cmp.revealedLabel()).toBe('dog');
  });

  it('save dispatches saveShapes exactly once with the full working set', () => {
    seed([square]);
    const cmp = make();
    cmp.workingPolys.update((list) => [
      ...list,
      poly('p2', 'p2', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }]),
    ]);
    dispatch.mockClear();
    cmp.save();

    const saves = dispatch.mock.calls.filter((c) => c[0].type === PolygonActions.saveShapes.type);
    expect(saves).toHaveLength(1);
    expect(saves[0][0].assetId).toBe('ov-1');
    expect(saves[0][0].polygons).toHaveLength(2);
  });

  it('save substitutes (unlabeled) for a blank label', () => {
    const cmp = make();
    cmp.workingPolys.set([poly('p1', 'p1', [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: 0.2 }])]);
    cmp.workingPolys.update((list) => list.map((p) => ({ ...p, label: '' })));
    cmp.save();
    const saves = dispatch.mock.calls.filter((c) => c[0].type === PolygonActions.saveShapes.type);
    expect(saves[0][0].polygons[0].label).toBe('(unlabeled)');
  });

  it('save is a no-op when the working copy is clean', () => {
    seed([square]);
    const cmp = make();
    dispatch.mockClear();
    cmp.save();
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: PolygonActions.saveShapes.type }),
    );
  });

  it('discard restores the exact opened snapshot', () => {
    seed([square]);
    const cmp = make();
    const snapshot = JSON.stringify(cmp.workingPolys());
    cmp.workingPolys.update((list) => list.filter(() => false));
    expect(cmp.dirty()).toBe(true);
    cmp.discard();
    expect(JSON.stringify(cmp.workingPolys())).toBe(snapshot);
    expect(cmp.dirty()).toBe(false);
  });

  it('snapTargetFor returns the nearest vertex within radius, else null', () => {
    seed([square]);
    const cmp = make();
    expect(cmp.snapTargetFor({ x: 24, y: 22 })).toEqual({ x: 20, y: 20 });
    expect(cmp.snapTargetFor({ x: 50, y: 50 })).toBeNull();
  });

  it('clearAll empties the working copy and marks it dirty', () => {
    seed([square]);
    const cmp = make();
    cmp.clearAll();
    expect(cmp.workingPolys()).toEqual([]);
    expect(cmp.dirty()).toBe(true);
  });

  it('requestClose closes immediately when the working copy is clean', () => {
    seed([square]);
    const cmp = make();
    const confirmSpy = jest.spyOn(cmp as unknown as { confirmDiscard: () => boolean }, 'confirmDiscard');
    cmp.requestClose();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('requestClose discards + closes when dirty and the user confirms', () => {
    seed([square]);
    const cmp = make();
    jest.spyOn(cmp as unknown as { confirmDiscard: () => boolean }, 'confirmDiscard').mockReturnValue(true);
    cmp.workingPolys.update((list) => list.filter(() => false));
    cmp.requestClose();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('requestClose keeps the dialog open when dirty and the user cancels', () => {
    seed([square]);
    const cmp = make();
    jest.spyOn(cmp as unknown as { confirmDiscard: () => boolean }, 'confirmDiscard').mockReturnValue(false);
    cmp.workingPolys.update((list) => list.filter(() => false));
    cmp.requestClose();
    expect(close).not.toHaveBeenCalled();
    expect(cmp.dirty()).toBe(true);
  });
});
