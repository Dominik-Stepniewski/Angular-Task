import { SearchActions } from './search.actions';
import { initialSearchState, searchFeature } from './search.reducer';
import { selectSuggestions } from './search.selectors';

const reducer = searchFeature.reducer;

describe('selectSuggestions (BR-3 word breakdown)', () => {
  const stateWith = (...queries: string[]) => {
    let s = initialSearchState;
    for (const q of queries) {
      s = reducer(s, SearchActions.saveQuery({ query: q, resultCount: 1 }));
    }
    return { search: s };
  };

  it('matches stored queries by any token prefix of the input', () => {
    const state = stateWith('dune messiah', 'foundation', 'the hobbit');
    expect(selectSuggestions('du')(state)).toEqual(['dune messiah']);
    expect(selectSuggestions('mess')(state)).toEqual(['dune messiah']);
    expect(selectSuggestions('the')(state)).toEqual(['the hobbit']);
  });

  it('returns nothing for empty/whitespace input', () => {
    const state = stateWith('dune');
    expect(selectSuggestions('')(state)).toEqual([]);
    expect(selectSuggestions('   ')(state)).toEqual([]);
  });

  it('returns nothing when no token matches', () => {
    const state = stateWith('dune', 'foundation');
    expect(selectSuggestions('xyz')(state)).toEqual([]);
  });
});
