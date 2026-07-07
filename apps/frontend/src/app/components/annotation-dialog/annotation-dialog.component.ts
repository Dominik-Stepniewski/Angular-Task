import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Asset } from '../../api/models';
import { API_BASE_URL } from '../../api/api-config';
import {
  boundingBox,
  denormalize,
  hitTest,
  normalize,
  Point,
  rectToPolygon,
  rotate,
  scaleAbout,
  Size,
  snap,
  translate,
} from '../../canvas/polygon.util';
import { PolygonActions } from '../../store/polygons/polygon.actions';
import { Polygon } from '../../store/polygons/polygon.models';
import { selectPolygonsForKey } from '../../store/polygons/polygon.selectors';

export interface AnnotationDialogData {
  asset: Asset;
}

export type Mode = 'draw' | 'rect' | 'edit';

type Corner = 'nw' | 'ne' | 'se' | 'sw';
type Handle = Corner | 'rotate';

const HANDLE_HIT_PX = 10;
const ROTATE_HANDLE_GAP_PX = 24;
const CLOSE_RADIUS_PX = 12;
const SNAP_PX = 10;
const UNLABELED = '(unlabeled)';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

interface Rect {
  min: Point;
  max: Point;
}

@Component({
  selector: 'app-annotation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule],
  templateUrl: './annotation-dialog.component.html',
  styleUrl: './annotation-dialog.component.scss',
})
export class AnnotationDialogComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly apiBase = inject(API_BASE_URL);
  private readonly dialogRef = inject(MatDialogRef<AnnotationDialogComponent>, { optional: true });
  readonly data = inject<AnnotationDialogData>(MAT_DIALOG_DATA);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelInput = viewChild<ElementRef<HTMLInputElement>>('labelInput');

  readonly mode = signal<Mode>('draw');
  readonly draft = signal<Point[]>([]);
  readonly snapTarget = signal<Point | null>(null);
  readonly rectPreview = signal<{ start: Point; end: Point } | null>(null);
  readonly selectedGroupId = signal<string | null>(null);
  readonly revealedLabel = signal<string | null>(null);
  readonly label = signal('');
  readonly imageFailed = signal(false);

  readonly labelFocused = signal(false);
  readonly labelSuggestions = computed(() => {
    const used = new Set<string>();
    for (const p of this.workingPolys()) {
      const l = p.label?.trim();
      if (l && l !== UNLABELED) used.add(l);
    }
    const all = [...used].sort();
    const v = this.label().trim().toLowerCase();
    const matches = v ? all.filter((t) => t.toLowerCase().includes(v)) : all;
    return matches.slice(0, 8);
  });
  readonly showLabelSuggestions = computed(
    () => this.labelFocused() && this.labelSuggestions().length > 0,
  );

  readonly workingPolys = signal<Polygon[]>([]);
  readonly visiblePolys = computed(() => {
    const revealed = this.revealedLabel();
    const gid = this.selectedGroupId();
    return this.workingPolys().filter((p) => p.label === revealed || p.groupId === gid);
  });
  private savedSnapshot: Polygon[] = [];
  readonly dirty = computed(
    () => JSON.stringify(this.workingPolys()) !== JSON.stringify(this.savedSnapshot),
  );

  canvasSize: Size = { w: 800, h: 450 };
  private imageNatural: Size | null = null;

  private resizeObserver?: ResizeObserver;

  private dragging = false;
  private gesture: 'move' | 'scale' | 'rotate' | null = null;
  private grabCorner: Point | null = null;
  private anchor: Point | null = null;
  private dragStart: Point | null = null;

  get resultKey(): string {
    return this.data.asset.id;
  }

  get imageUrl(): string {
    return `${this.apiBase}/assets/${this.data.asset.id}/image`;
  }

  constructor() {
    this.store
      .select(selectPolygonsForKey(this.resultKey))
      .pipe(takeUntilDestroyed())
      .subscribe((polys) => {
        if (!this.dirty()) {
          this.workingPolys.set(clone(polys));
          this.savedSnapshot = clone(polys);
        }
        this.redraw();
      });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    requestAnimationFrame(() => {
      this.syncSize();
      this.redraw();
    });
    this.dialogRef?.afterOpened().subscribe(() => {
      this.syncSize();
      this.redraw();
    });
    this.dialogRef?.backdropClick().subscribe(() => this.requestClose());
    this.dialogRef?.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') {
        this.requestClose();
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        this.selectedGroupId() &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        this.deleteSelected();
      }
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncSize();
        this.redraw();
      });
      this.resizeObserver.observe(canvas);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  setMode(m: Mode): void {
    this.mode.set(m);
    this.draft.set([]);
    this.rectPreview.set(null);
    this.snapTarget.set(null);
    this.redraw();
  }

  onImageLoad(ev: Event): void {
    const img = ev.target as HTMLImageElement;
    if (img.naturalWidth > 0) this.imageNatural = { w: img.naturalWidth, h: img.naturalHeight };
    this.redraw();
  }

  onPointerDown(ev: PointerEvent): void {
    const p = this.toCanvasPoint(ev);
    const m = this.mode();
    if (m === 'rect') {
      const c = this.clampToImage(p);
      this.dragging = true;
      this.rectPreview.set({ start: c, end: c });
      return;
    }
    if (m === 'draw') {
      this.addDraftPoint(p);
      return;
    }
    const gid = this.selectedGroupId();
    if (gid) {
      const h = this.handleAt(p, gid);
      if (h === 'rotate') {
        this.gesture = 'rotate';
        this.anchor = this.shapeCenterPx(gid);
        this.dragStart = p;
        return;
      }
      if (h) {
        const bb = this.shapeBBoxPx(gid);
        this.gesture = 'scale';
        this.grabCorner = this.cornerPoint(bb, h);
        this.anchor = this.cornerPoint(bb, this.opposite(h));
        this.dragStart = p;
        return;
      }
    }
    const hit = this.selectShapeAt(p);
    if (hit) {
      this.gesture = 'move';
      this.dragStart = p;
    } else {
      this.selectedGroupId.set(null);
      this.labelFocused.set(false);
    }
    this.redraw();
  }

  onPointerMove(ev: PointerEvent): void {
    const p = this.toCanvasPoint(ev);
    if (this.mode() === 'rect' && this.dragging) {
      const start = this.rectPreview()?.start ?? this.clampToImage(p);
      this.rectPreview.set({ start, end: this.clampToImage(p) });
      this.redraw();
      return;
    }
    if (this.mode() !== 'edit' || !this.gesture || !this.dragStart) return;
    if (this.gesture === 'move') {
      this.moveSelectedShape(p.x - this.dragStart.x, p.y - this.dragStart.y);
    } else if (this.gesture === 'rotate' && this.anchor) {
      const c = this.anchor;
      const a0 = Math.atan2(this.dragStart.y - c.y, this.dragStart.x - c.x);
      const a1 = Math.atan2(p.y - c.y, p.x - c.x);
      this.rotateSelectedShape(a1 - a0, c);
    } else if (this.gesture === 'scale' && this.anchor && this.grabCorner) {
      const sx = (p.x - this.anchor.x) / (this.grabCorner.x - this.anchor.x || 1);
      const sy = (p.y - this.anchor.y) / (this.grabCorner.y - this.anchor.y || 1);
      this.scaleSelectedShape(sx, sy, this.anchor);
      this.grabCorner = p;
    }
    this.dragStart = p;
    this.redraw();
  }

  onPointerUp(): void {
    if (this.mode() === 'rect' && this.rectPreview()) {
      this.commitRect();
    }
    this.gesture = null;
    this.dragging = false;
    this.dragStart = this.anchor = this.grabCorner = null;
  }

  addDraftPoint(p: Point): void {
    const c = this.clampToImage(p);
    const pts = this.draft();
    if (pts.length >= 3 && this.dist(c, pts[0]) <= CLOSE_RADIUS_PX) {
      this.closeDraft();
      return;
    }
    const snapped = this.snapVertex(c);
    this.snapTarget.set(this.snapTargetFor(c));
    this.draft.set([...pts, snapped]);
    this.redraw();
  }

  closeDraft(): void {
    const pts = this.draft();
    if (pts.length < 3) return;
    this.commitShapePolygon(pts.map((p) => this.snapVertex(p)));
    this.draft.set([]);
    this.snapTarget.set(null);
  }

  commitRect(): void {
    const preview = this.rectPreview();
    this.rectPreview.set(null);
    if (!preview) return;
    const { start, end } = preview;
    if (Math.abs(start.x - end.x) < 2 || Math.abs(start.y - end.y) < 2) return;
    const corners = rectToPolygon(start, end).map((c) => this.snapVertex(c));
    this.commitShapePolygon(corners);
  }

  clearAll(): void {
    this.workingPolys.set([]);
    this.draft.set([]);
    this.rectPreview.set(null);
    this.snapTarget.set(null);
    this.selectedGroupId.set(null);
    this.redraw();
  }

  newShape(): void {
    if (this.dirty()) {
      if (this.confirmSaveCurrent()) this.save();
      else this.discard();
    }
    this.selectedGroupId.set(null);
    this.label.set('');
    this.setLabelInput('');
    this.draft.set([]);
    this.snapTarget.set(null);
    this.labelInput()?.nativeElement.focus();
    this.redraw();
  }

  deleteSelected(): void {
    const gid = this.selectedGroupId();
    if (!gid) return;
    this.workingPolys.update((list) => list.filter((p) => p.groupId !== gid));
    this.selectedGroupId.set(null);
    this.redraw();
  }

  moveSelectedShape(dxPx: number, dyPx: number): void {
    const gid = this.selectedGroupId();
    if (!gid) return;
    let dx = dxPx;
    let dy = dyPx;
    if (this.imageNatural) {
      const bb = this.shapeBBoxPx(gid);
      const r = this.imageRectPx();
      dx = this.clampNum(dxPx, r.min.x - bb.min.x, r.max.x - bb.max.x);
      dy = this.clampNum(dyPx, r.min.y - bb.min.y, r.max.y - bb.max.y);
    }
    this.transformSelected((px) => translate(px, { x: dx, y: dy }));
  }

  scaleSelectedShape(sx: number, sy: number, anchorPx: Point): void {
    this.transformSelected((px) => scaleAbout(px, anchorPx, sx, sy).map((q) => this.clampToImage(q)));
  }

  rotateSelectedShape(rad: number, centerPx: Point): void {
    this.transformSelected((px) => rotate(px, rad, centerPx).map((q) => this.clampToImage(q)));
  }

  private clampNum(v: number, lo: number, hi: number): number {
    if (lo > hi) return 0;
    return Math.min(Math.max(v, lo), hi);
  }

  onLabelInput(ev: Event): void {
    this.label.set((ev.target as HTMLInputElement).value);
    this.labelFocused.set(true);
  }

  onLabelFocus(): void {
    this.labelFocused.set(true);
  }

  onLabelBlur(): void {
    this.labelFocused.set(false);
  }

  pickLabel(tag: string): void {
    this.label.set(tag);
    this.setLabelInput(tag);
    this.revealLabel(tag);
    this.labelFocused.set(false);
  }

  private revealLabel(tag: string): void {
    this.revealedLabel.set(tag);
    const match = this.workingPolys().find((p) => p.label === tag);
    this.selectedGroupId.set(match?.groupId ?? null);
    this.redraw();
    this.canvasRef()?.nativeElement.focus();
  }

  applyLabelToSelected(): void {
    const gid = this.selectedGroupId();
    if (!gid) return;
    const l = this.label();
    this.workingPolys.update((list) =>
      list.map((p) => (p.groupId === gid ? { ...p, label: l } : p)),
    );
    this.revealedLabel.set(l);
    this.redraw();
  }

  save(): void {
    if (!this.dirty()) return;
    const polys = this.workingPolys().map((p) =>
      p.label.trim() === '' ? { ...p, label: UNLABELED } : p,
    );
    this.store.dispatch(PolygonActions.saveShapes({ assetId: this.resultKey, polygons: polys }));
    this.workingPolys.set(polys);
    this.savedSnapshot = clone(polys);
  }

  discard(): void {
    this.workingPolys.set(clone(this.savedSnapshot));
    this.selectedGroupId.set(null);
    this.draft.set([]);
    this.snapTarget.set(null);
    this.redraw();
  }

  requestClose(): void {
    if (this.dirty() && !this.confirmDiscard()) return;
    this.discard();
    this.dialogRef?.close();
  }

  protected confirmDiscard(): boolean {
    return typeof confirm === 'function' ? confirm('Discard unsaved annotation changes?') : true;
  }

  protected confirmSaveCurrent(): boolean {
    return typeof confirm === 'function'
      ? confirm('Save the current annotations before starting a new one?\nOK = Save · Cancel = Discard')
      : true;
  }

  snapTargetFor(p: Point): Point | null {
    return snap(p, this.allVerticesPx(), SNAP_PX);
  }

  private snapVertex(p: Point): Point {
    return this.snapTargetFor(p) ?? p;
  }

  private allVerticesPx(): Point[] {
    return this.workingPolys().flatMap((poly) =>
      poly.points.map((n) => denormalize(n, this.canvasSize)),
    );
  }

  imageRectPx(): Rect {
    const { w: cw, h: ch } = this.canvasSize;
    const nat = this.imageNatural;
    if (!nat || nat.w <= 0 || nat.h <= 0) return { min: { x: 0, y: 0 }, max: { x: cw, y: ch } };
    const scale = Math.min(cw / nat.w, ch / nat.h);
    const dw = nat.w * scale;
    const dh = nat.h * scale;
    const x = (cw - dw) / 2;
    const y = (ch - dh) / 2;
    return { min: { x, y }, max: { x: x + dw, y: y + dh } };
  }

  private clampToImage(p: Point): Point {
    if (!this.imageNatural) return p;
    const r = this.imageRectPx();
    return {
      x: Math.min(Math.max(p.x, r.min.x), r.max.x),
      y: Math.min(Math.max(p.y, r.min.y), r.max.y),
    };
  }

  private setLabelInput(v: string): void {
    const el = this.labelInput()?.nativeElement;
    if (el) el.value = v;
  }

  private commitShapePolygon(pxVerts: Point[]): void {
    const adopted = this.adoptGroup(pxVerts);
    const selGid = this.selectedGroupId();
    const selLabel = selGid ? this.shapePolys(selGid)[0]?.label : undefined;
    const id = newId();
    const groupId = adopted?.groupId ?? selGid ?? id;
    const label = adopted?.label ?? selLabel ?? this.label();
    const poly: Polygon = {
      id,
      resultKey: this.resultKey,
      groupId,
      label,
      points: pxVerts.map((p) => normalize(p, this.canvasSize)),
      rotationRad: 0,
    };
    this.workingPolys.update((list) => [...list, poly]);
    this.selectedGroupId.set(groupId);
    this.redraw();
  }

  private adoptGroup(pxVerts: Point[]): { groupId: string; label: string } | null {
    for (const poly of this.workingPolys()) {
      const polyPx = poly.points.map((n) => denormalize(n, this.canvasSize));
      for (const v of pxVerts) {
        for (const pv of polyPx) {
          if (this.dist(v, pv) <= SNAP_PX) return { groupId: poly.groupId, label: poly.label };
        }
      }
    }
    return null;
  }

  private selectShapeAt(p: Point): Polygon | undefined {
    const hit = this.polygonAt(p);
    if (hit) {
      this.selectedGroupId.set(hit.groupId);
      this.label.set(hit.label);
      requestAnimationFrame(() => {
        this.setLabelInput(hit.label);
        this.labelInput()?.nativeElement.focus();
      });
    }
    return hit;
  }

  private shapePolys(groupId: string): Polygon[] {
    return this.workingPolys().filter((p) => p.groupId === groupId);
  }

  private shapeVertsPx(groupId: string): Point[] {
    return this.shapePolys(groupId).flatMap((poly) =>
      poly.points.map((n) => denormalize(n, this.canvasSize)),
    );
  }

  private shapeBBoxPx(groupId: string): { min: Point; max: Point; center: Point } {
    return boundingBox(this.shapeVertsPx(groupId));
  }

  private shapeCenterPx(groupId: string): Point {
    const px = this.shapeVertsPx(groupId);
    return px.length ? boundingBox(px).center : { x: 0, y: 0 };
  }

  private cornerPoint(bb: { min: Point; max: Point }, c: Corner): Point {
    return c === 'nw'
      ? bb.min
      : c === 'ne'
        ? { x: bb.max.x, y: bb.min.y }
        : c === 'se'
          ? bb.max
          : { x: bb.min.x, y: bb.max.y };
  }

  private opposite(c: Corner): Corner {
    return c === 'nw' ? 'se' : c === 'ne' ? 'sw' : c === 'se' ? 'nw' : 'ne';
  }

  private rotateHandlePx(bb: { min: Point; max: Point }): Point {
    const x = (bb.min.x + bb.max.x) / 2;
    const above = bb.min.y - ROTATE_HANDLE_GAP_PX;
    const y = above < ROTATE_HANDLE_GAP_PX ? bb.max.y + ROTATE_HANDLE_GAP_PX : above;
    return { x, y };
  }

  handleAt(p: Point, gid: string): Handle | null {
    if (this.shapePolys(gid).length === 0) return null;
    const bb = this.shapeBBoxPx(gid);
    if (this.dist(p, this.rotateHandlePx(bb)) <= HANDLE_HIT_PX) return 'rotate';
    for (const c of ['nw', 'ne', 'se', 'sw'] as const) {
      if (this.dist(p, this.cornerPoint(bb, c)) <= HANDLE_HIT_PX) return c;
    }
    return null;
  }

  private transformSelected(fn: (px: Point[]) => Point[]): void {
    const gid = this.selectedGroupId();
    if (!gid) return;
    this.workingPolys.update((list) =>
      list.map((p) =>
        p.groupId === gid
          ? {
              ...p,
              points: fn(p.points.map((n) => denormalize(n, this.canvasSize))).map((px) =>
                normalize(px, this.canvasSize),
              ),
            }
          : p,
      ),
    );
  }

  private polygonAt(p: Point): Polygon | undefined {
    return this.workingPolys().find((poly) =>
      hitTest(
        p,
        poly.points.map((n) => denormalize(n, this.canvasSize)),
      ),
    );
  }

  private toCanvasPoint(ev: PointerEvent): Point {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return { x: ev.offsetX, y: ev.offsetY };
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  private dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private syncSize(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = canvas.clientWidth || rect.width;
    const h = canvas.clientHeight || rect.height;
    if (w > 0 && h > 0) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      this.canvasSize = { w, h };
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private redraw(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gid = this.selectedGroupId();
    for (const poly of this.visiblePolys()) {
      const pts = poly.points.map((n) => denormalize(n, this.canvasSize));
      const selected = poly.groupId === gid;
      this.strokePolygon(ctx, pts, selected ? '#4ade80' : '#ffc24b');
      if (poly.label) this.drawLabel(ctx, pts, poly.label);
    }
    if (gid && this.shapePolys(gid).length > 0) this.drawGroupHandles(ctx, gid);

    if (this.draft().length > 0) this.strokePolygon(ctx, this.draft(), '#4bd6e0', false);
    const rp = this.rectPreview();
    if (rp) this.strokePolygon(ctx, rectToPolygon(rp.start, rp.end), '#4bd6e0');
    const target = this.snapTarget();
    if (target) this.drawSnapTarget(ctx, target);
  }

  private strokePolygon(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    color: string,
    close = true,
  ): void {
    if (pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#4bd6e0';
    for (const p of pts) ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }

  private drawLabel(ctx: CanvasRenderingContext2D, pts: Point[], label: string): void {
    const anchor = pts.reduce((a, p) => (p.y < a.y ? p : a), pts[0]);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffc24b';
    ctx.fillText(label, anchor.x + 4, anchor.y - 4);
  }

  private drawGroupHandles(ctx: CanvasRenderingContext2D, groupId: string): void {
    const bb = this.shapeBBoxPx(groupId);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(bb.min.x, bb.min.y, bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    for (const c of ['nw', 'ne', 'se', 'sw'] as const) {
      const pt = this.cornerPoint(bb, c);
      ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
    }
    const rh = this.rotateHandlePx(bb);
    const edgeY = rh.y < bb.min.y ? bb.min.y : bb.max.y;
    ctx.strokeStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(rh.x, edgeY);
    ctx.lineTo(rh.x, rh.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSnapTarget(ctx: CanvasRenderingContext2D, target: Point): void {
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
  }
}
