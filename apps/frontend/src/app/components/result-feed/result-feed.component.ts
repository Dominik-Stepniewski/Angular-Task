import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatDialog } from '@angular/material/dialog';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime } from 'rxjs';
import { Store } from '@ngrx/store';
import { Asset } from '../../api/models';
import { SearchActions } from '../../store/search/search.actions';
import {
  selectHasNext,
  selectLoading,
  selectQ,
  selectResults,
} from '../../store/search/search.selectors';
import { selectShapeCountByKey } from '../../store/polygons/polygon.selectors';
import {
  AnnotationDialogComponent,
  AnnotationDialogData,
} from '../annotation-dialog/annotation-dialog.component';
import { chunkRows, computeColumns, DEFAULT_WIDTH, rowHeight } from './gallery.util';

const PREFETCH_PX = 300;
const SCROLL_AUDIT_MS = 100;

@Component({
  selector: 'app-result-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule],
  templateUrl: './result-feed.component.html',
  styleUrl: './result-feed.component.scss',
})
export class ResultFeedComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly destroyRef = inject(DestroyRef);

  readonly results = this.store.selectSignal(selectResults);
  readonly query = this.store.selectSignal(selectQ);
  readonly loading = this.store.selectSignal(selectLoading);
  readonly hasNext = this.store.selectSignal(selectHasNext);
  readonly counts = this.store.selectSignal(selectShapeCountByKey);

  private readonly width = signal(DEFAULT_WIDTH);
  readonly columns = computed(() => computeColumns(this.width()));
  readonly rowHeightPx = computed(() => rowHeight(this.width(), this.columns()));
  readonly rows = computed(() => chunkRows(this.results(), this.columns()));

  readonly skeletons = Array.from({ length: 10 }, (_, i) => i);

  trackByRow = (_: number, row: Asset[]): string => row[0]?.id ?? String(_);

  constructor() {
    effect((onCleanup) => {
      const vp = this.viewport();
      if (!vp) return;
      const sub = vp
        .elementScrolled()
        .pipe(auditTime(SCROLL_AUDIT_MS), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.maybeLoadMore(vp));
      onCleanup(() => sub.unsubscribe());
    });

    effect((onCleanup) => {
      const vp = this.viewport();
      if (!vp || typeof ResizeObserver === 'undefined') return;
      const el = vp.elementRef.nativeElement;
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0) this.width.set(Math.round(w));
      });
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });

    afterRenderEffect(() => {
      const vp = this.viewport();
      this.results();
      this.loading();
      if (vp) this.maybeLoadMore(vp);
    });
  }

  private maybeLoadMore(vp: CdkVirtualScrollViewport): void {
    if (this.results().length === 0 || this.loading() || !this.hasNext()) return;
    const el = vp.elementRef.nativeElement;
    const nearBottom = vp.measureScrollOffset('bottom') < PREFETCH_PX;
    const notFull = el.clientHeight > 0 && el.scrollHeight <= el.clientHeight;
    if (nearBottom || notFull) {
      this.store.dispatch(SearchActions.loadNextBatch());
    }
  }

  open(asset: Asset): void {
    this.store.dispatch(SearchActions.openAsset({ asset }));
    this.dialog.open<AnnotationDialogComponent, AnnotationDialogData>(AnnotationDialogComponent, {
      data: { asset },
      panelClass: 'annotation-dialog-panel',
      maxWidth: '96vw',
      disableClose: true,
    });
  }
}
