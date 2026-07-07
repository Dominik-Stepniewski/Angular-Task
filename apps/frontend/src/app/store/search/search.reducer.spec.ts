import { Asset, Paginated } from '../../api/models';
import { SearchActions } from './search.actions';
import { initialSearchState, searchFeature } from './search.reducer';

const reducer = searchFeature.reducer;
const asset = (id: string): Asset => ({
  id,
  title: id,
  url: `u/${id}`,
  thumbnail: `t/${id}`,
  source: 'flickr',
  license: 'by',
  tags: [],
  ingestedAt: '',
});
const page = (data: Asset[], p: number, total: number): Paginated<Asset> => ({
  data,
  page: p,
  limit: 20,
  total,
  hasNext: p * 20 < total,
});

describe('search reducer', () => {
  it('page 1 search clears prior results and sets loading', () => {
    const dirty = { ...initialSearchState, results: [asset('old')] };
    const s = reducer(dirty, SearchActions.search({ q: 'cat', page: 1 }));
    expect(s.results).toEqual([]);
    expect(s.loading).toBe(true);
    expect(s.q).toBe('cat');
  });

  it('searchSuccess page 1 replaces results and sets pagination', () => {
    const s = reducer(
      initialSearchState,
      SearchActions.searchSuccess({ q: 'cat', page: 1, result: page([asset('a')], 1, 40) }),
    );
    expect(s.results.map((a) => a.id)).toEqual(['a']);
    expect(s).toMatchObject({ total: 40, hasNext: true, loading: false });
  });

  it('searchSuccess page > 1 appends the batch', () => {
    const base = reducer(
      initialSearchState,
      SearchActions.searchSuccess({ q: 'cat', page: 1, result: page([asset('a')], 1, 40) }),
    );
    const s = reducer(
      base,
      SearchActions.searchSuccess({ q: 'cat', page: 2, result: page([asset('b')], 2, 40) }),
    );
    expect(s.results.map((a) => a.id)).toEqual(['a', 'b']);
    expect(s.page).toBe(2);
  });

  it('saveQuery upserts a tokenized history entry', () => {
    const s = reducer(initialSearchState, SearchActions.saveQuery({ query: 'The Dune', resultCount: 5 }));
    const entry = s.queries.entities['The Dune'];
    expect(entry).toMatchObject({ query: 'The Dune', resultCount: 5, tokens: ['the', 'dune'] });
  });
});
