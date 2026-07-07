import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { SearchCacheService } from '../../api/search-cache.service';
import { SearchActions } from './search.actions';
import { selectHasNext, selectLoading, selectPage, selectQ } from './search.selectors';

export const loadSearch$ = createEffect(
  (actions$ = inject(Actions), cache = inject(SearchCacheService)) =>
    actions$.pipe(
      ofType(SearchActions.search),
      switchMap(({ q, page }) =>
        cache.search(q, page).pipe(
          map((result) => SearchActions.searchSuccess({ q, page, result })),
          catchError((err) =>
            of(SearchActions.searchFailure({ error: String(err?.message ?? err) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const nextBatch$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(SearchActions.loadNextBatch),
      withLatestFrom(
        store.select(selectQ),
        store.select(selectPage),
        store.select(selectHasNext),
        store.select(selectLoading),
      ),
      filter(([, , , hasNext, loading]) => hasNext && !loading),
      map(([, q, page]) => SearchActions.search({ q, page: page + 1 })),
    ),
  { functional: true },
);

export const saveMeaningfulQuery$ = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(SearchActions.searchSuccess),
      filter(({ q, result }) => q.length > 0 && result.total > 0),
      map(({ q, result }) =>
        SearchActions.saveQuery({ query: q, resultCount: result.total }),
      ),
    ),
  { functional: true },
);
