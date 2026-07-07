import { summarize } from './summarize';

describe('summarize', () => {
  it('reduces a search result to results count + pagination scalars', () => {
    const result = { data: [{}, {}, {}], page: 1, limit: 20, total: 42, hasNext: true };
    expect(summarize(result)).toEqual({ results: 3, page: 1, total: 42 });
  });

  it('reduces an upload result to inserted + failedCount', () => {
    const result = { inserted: 3, failedCount: 2, failed: [{ index: 1, reason: 'x' }] };
    expect(summarize(result)).toEqual({ inserted: 3, failedCount: 2 });
  });

  it('reduces an ingest result to fetched + pages', () => {
    const result = { file: 'data/dataset.json', fetched: 100, pages: 1, ms: 5 };
    expect(summarize(result)).toEqual({ fetched: 100, pages: 1 });
  });

  it('carries assetId + label for an annotate result', () => {
    const result = { id: 'p1', assetId: 'ov-1', label: 'cat', points: [[0, 0]], rotationRad: 0 };
    expect(summarize(result)).toEqual({ assetId: 'ov-1', label: 'cat' });
  });

  it('summarizes a replace-set result to assetId + results count', () => {
    expect(summarize({ assetId: 'ov-1', data: [{}, {}] })).toEqual({ assetId: 'ov-1', results: 2 });
  });

  it('counts an `annotations` array when there is no `data` alias', () => {
    expect(summarize({ assetId: 'ov-1', annotations: [{}, {}, {}] })).toEqual({
      assetId: 'ov-1',
      results: 3,
    });
  });

  it('returns empty object for primitive or null results', () => {
    expect(summarize(undefined)).toEqual({});
    expect(summarize('str')).toEqual({});
    expect(summarize(null)).toEqual({});
  });
});
