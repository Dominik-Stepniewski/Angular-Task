import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Asset } from '../../api/models';
import { SearchActions } from '../../store/search/search.actions';
import { initialSearchState } from '../../store/search/search.reducer';
import { initialPolygonState } from '../../store/polygons/polygon.reducer';
import { ResultFeedComponent } from './result-feed.component';

const assets = (n: number): Asset[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `k${i}`,
    title: `T${i}`,
    url: `u${i}`,
    thumbnail: `t${i}`,
    source: 'flickr',
    license: 'by',
    tags: [],
    ingestedAt: '',
  }));

describe('ResultFeedComponent', () => {
  let store: MockStore;
  let dispatch: jest.SpyInstance;
  const dialog = { open: jest.fn() };

  beforeEach(() => {
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      imports: [ResultFeedComponent],
      providers: [
        provideMockStore({
          initialState: {
            search: { ...initialSearchState, results: assets(20) },
            polygons: initialPolygonState,
          },
        }),
        { provide: MatDialog, useValue: dialog },
      ],
    });
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  });

  const make = () => TestBed.createComponent(ResultFeedComponent).componentInstance;

  type Vp = {
    measureScrollOffset: (from: 'bottom') => number;
    elementRef: { nativeElement: { scrollHeight: number; clientHeight: number } };
  };
  const vp = (bottom: number, scrollHeight = 2000, clientHeight = 600): Vp => ({
    measureScrollOffset: () => bottom,
    elementRef: { nativeElement: { scrollHeight, clientHeight } },
  });
  const call = (cmp: ResultFeedComponent, v: Vp) =>
    (cmp as unknown as { maybeLoadMore: (v: Vp) => void }).maybeLoadMore(v);
  const setSearch = (over: Partial<typeof initialSearchState>) =>
    store.setState({ search: { ...initialSearchState, ...over } });

  it('loads more when the bottom is within the prefetch distance', () => {
    setSearch({ results: assets(20), hasNext: true, loading: false });
    const cmp = make();
    call(cmp, vp(100));
    expect(dispatch).toHaveBeenCalledWith(SearchActions.loadNextBatch());
  });

  it('does not load while far from the bottom', () => {
    setSearch({ results: assets(20), hasNext: true, loading: false });
    const cmp = make();
    call(cmp, vp(900));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('auto-fills when the list does not overflow the viewport', () => {
    setSearch({ results: assets(5), hasNext: true, loading: false });
    const cmp = make();
    call(cmp, vp(900, 320, 600));
    expect(dispatch).toHaveBeenCalledWith(SearchActions.loadNextBatch());
  });

  it('stops at the end of the index (hasNext false)', () => {
    setSearch({ results: assets(20), hasNext: false, loading: false });
    const cmp = make();
    call(cmp, vp(0, 320, 600));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not load while a fetch is in flight', () => {
    setSearch({ results: assets(20), hasNext: true, loading: true });
    const cmp = make();
    call(cmp, vp(0));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not load with no results', () => {
    setSearch({ results: [], hasNext: true, loading: false });
    const cmp = make();
    call(cmp, vp(0, 0, 600));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('opening a row emits openAsset and opens the dialog', () => {
    const cmp = make();
    const asset = assets(1)[0];
    cmp.open(asset);
    expect(dispatch).toHaveBeenCalledWith(SearchActions.openAsset({ asset }));
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('shows the empty-state only for a non-empty query with no matches', () => {
    store.setState({ search: { ...initialSearchState, q: 'cat', results: [] } });
    const fixture = TestBed.createComponent(ResultFeedComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.empty')?.textContent).toContain('cat');
  });

  it('shows a loading hint while an empty-query browse is in flight', () => {
    store.setState({ search: { ...initialSearchState, q: '', results: [], loading: true } });
    const fixture = TestBed.createComponent(ResultFeedComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.empty')?.textContent).toContain('Loading');
    expect(el.querySelector('cdk-virtual-scroll-viewport')).toBeNull();
  });

  it('shows a no-index hint when browse settles with an empty index', () => {
    store.setState({ search: { ...initialSearchState, q: '', results: [], loading: false } });
    const fixture = TestBed.createComponent(ResultFeedComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.empty')?.textContent).toContain('No assets indexed');
  });

  it('groups results into rows and exposes a positive itemSize', () => {
    setSearch({ results: assets(20), hasNext: false, loading: false });
    const cmp = make();
    expect(cmp.rows().length).toBeGreaterThan(0);
    expect(cmp.rows()[0].length).toBe(cmp.columns());
    expect(cmp.rowHeightPx()).toBeGreaterThan(0);
  });

  it('surfaces annotated shape counts from the polygon store', () => {
    store.setState({
      search: { ...initialSearchState, results: assets(3) },
      polygons: {
        byKey: {
          k0: [{ id: 'p', resultKey: 'k0', groupId: 'g', label: '', points: [], rotationRad: 0 }],
        },
      },
    });
    const cmp = make();
    expect(cmp.counts()['k0']).toBe(1);
    expect(cmp.counts()['k1']).toBeUndefined();
  });
});
