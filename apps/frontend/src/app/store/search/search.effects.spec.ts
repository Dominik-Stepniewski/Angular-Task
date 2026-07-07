import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of, firstValueFrom } from 'rxjs';
import { Asset, Paginated } from '../../api/models';
import { SearchCacheService } from '../../api/search-cache.service';
import { initialSearchState } from './search.reducer';
import { SearchActions } from './search.actions';
import { loadSearch$, nextBatch$, saveMeaningfulQuery$ } from './search.effects';

const result = (total: number): Paginated<Asset> => ({
  data: [],
  page: 1,
  limit: 20,
  total,
  hasNext: false,
});

describe('search effects', () => {
  function setup(action: unknown, cache: Partial<SearchCacheService> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(action)),
        { provide: SearchCacheService, useValue: cache },
      ],
    });
  }

  it('loadSearch$ maps a successful api call to searchSuccess', async () => {
    const cache = { search: jest.fn().mockReturnValue(of(result(3))) };
    setup(SearchActions.search({ q: 'dune', page: 1 }), cache);
    const emitted = await TestBed.runInInjectionContext(() => firstValueFrom(loadSearch$()));
    expect(cache.search).toHaveBeenCalledWith('dune', 1);
    expect(emitted).toEqual(SearchActions.searchSuccess({ q: 'dune', page: 1, result: result(3) }));
  });

  it('saveMeaningfulQuery$ saves when results > 0 (BR-1)', async () => {
    setup(SearchActions.searchSuccess({ q: 'dune', page: 1, result: result(5) }));
    const emitted = await TestBed.runInInjectionContext(() =>
      firstValueFrom(saveMeaningfulQuery$()),
    );
    expect(emitted).toEqual(SearchActions.saveQuery({ query: 'dune', resultCount: 5 }));
  });

  it('saveMeaningfulQuery$ does NOT save when zero results (BR-1)', async () => {
    setup(SearchActions.searchSuccess({ q: 'dune', page: 1, result: result(0) }));
    let emittedCount = 0;
    await TestBed.runInInjectionContext(async () => {
      const sub = saveMeaningfulQuery$().subscribe(() => emittedCount++);
      sub.unsubscribe();
    });
    expect(emittedCount).toBe(0);
  });

  it('nextBatch$ requests the next page when hasNext and not loading', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(SearchActions.loadNextBatch())),
        provideMockStore({
          initialState: {
            search: { ...initialSearchState, q: 'dune', page: 1, hasNext: true, loading: false },
          },
        }),
      ],
    });
    const emitted = await TestBed.runInInjectionContext(() => firstValueFrom(nextBatch$()));
    expect(emitted).toEqual(SearchActions.search({ q: 'dune', page: 2 }));
  });

  it('nextBatch$ emits nothing when hasNext is false', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideMockActions(of(SearchActions.loadNextBatch())),
        provideMockStore({
          initialState: { search: { ...initialSearchState, hasNext: false } },
        }),
      ],
    });
    let count = 0;
    await TestBed.runInInjectionContext(async () => {
      nextBatch$().subscribe(() => count++);
    });
    expect(count).toBe(0);
  });
});
