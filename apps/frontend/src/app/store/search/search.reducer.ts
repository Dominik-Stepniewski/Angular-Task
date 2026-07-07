import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import { Asset } from '../../api/models';
import { SearchActions } from './search.actions';
import { SearchQuery, tokenize } from './search.models';

export const queryAdapter = createEntityAdapter<SearchQuery>({
  sortComparer: (a, b) => b.timestamp - a.timestamp,
});

export interface SearchState {
  q: string;
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  loading: boolean;
  results: Asset[];
  queries: EntityState<SearchQuery>;
}

export const initialSearchState: SearchState = {
  q: '',
  page: 1,
  limit: 20,
  total: 0,
  hasNext: false,
  loading: false,
  results: [],
  queries: queryAdapter.getInitialState(),
};

export const searchFeature = createFeature({
  name: 'search',
  reducer: createReducer(
    initialSearchState,
    on(SearchActions.search, (state, { q, page }) => ({
      ...state,
      q,
      page,
      loading: true,
      results: page === 1 ? [] : state.results,
    })),
    on(SearchActions.searchSuccess, (state, { page, result }) => ({
      ...state,
      loading: false,
      page,
      limit: result.limit,
      total: result.total,
      hasNext: result.hasNext,
      results: page === 1 ? result.data : [...state.results, ...result.data],
    })),
    on(SearchActions.searchFailure, (state) => ({ ...state, loading: false })),
    on(SearchActions.saveQuery, (state, { query, resultCount }) => ({
      ...state,
      queries: queryAdapter.upsertOne(
        {
          id: query,
          query,
          resultCount,
          timestamp: Date.now(),
          tokens: tokenize(query),
        },
        state.queries,
      ),
    })),
  ),
});
