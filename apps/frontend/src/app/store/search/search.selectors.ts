import { createSelector } from '@ngrx/store';
import { queryAdapter, searchFeature } from './search.reducer';
import { tokenize } from './search.models';

const { selectAll } = queryAdapter.getSelectors();

export const selectResults = searchFeature.selectResults;
export const selectLoading = searchFeature.selectLoading;
export const selectHasNext = searchFeature.selectHasNext;
export const selectPage = searchFeature.selectPage;
export const selectQ = searchFeature.selectQ;

export const selectAllQueries = createSelector(searchFeature.selectQueries, (queries) =>
  selectAll(queries),
);

const suggestionSelectors = new Map<string, ReturnType<typeof buildSuggestions>>();
const MAX_SUGGESTION_SELECTORS = 200;

const buildSuggestions = (input: string) =>
  createSelector(selectAllQueries, (queries) => {
    const inputTokens = tokenize(input);
    if (inputTokens.length === 0) return [];
    return queries
      .filter((q) => inputTokens.some((it) => q.tokens.some((t) => t.startsWith(it))))
      .map((q) => q.query);
  });

export const selectSuggestions = (input: string) => {
  const cached = suggestionSelectors.get(input);
  if (cached) {
    suggestionSelectors.delete(input);
    suggestionSelectors.set(input, cached);
    return cached;
  }
  const selector = buildSuggestions(input);
  suggestionSelectors.set(input, selector);
  if (suggestionSelectors.size > MAX_SUGGESTION_SELECTORS) {
    suggestionSelectors.delete(suggestionSelectors.keys().next().value as string);
  }
  return selector;
};
