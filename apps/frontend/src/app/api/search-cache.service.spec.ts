import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Asset, Paginated } from './models';
import { SearchApiService } from './search-api.service';
import { SearchCacheService } from './search-cache.service';

const page = (p: number): Paginated<Asset> => ({ data: [], page: p, limit: 20, total: 0, hasNext: false });

describe('SearchCacheService', () => {
  it('calls the API once per (q,page) and serves repeats from cache', () => {
    const api = { search: jest.fn().mockReturnValue(of(page(1))) };
    TestBed.configureTestingModule({
      providers: [SearchCacheService, { provide: SearchApiService, useValue: api }],
    });
    const cache = TestBed.inject(SearchCacheService);

    cache.search('dune', 1).subscribe();
    cache.search('dune', 1).subscribe();
    expect(api.search).toHaveBeenCalledTimes(1);

    cache.search('dune', 2).subscribe();
    expect(api.search).toHaveBeenCalledTimes(2);
  });

  it('clear() drops cached pages so the next identical search refetches', () => {
    const api = { search: jest.fn().mockReturnValue(of(page(1))) };
    TestBed.configureTestingModule({
      providers: [SearchCacheService, { provide: SearchApiService, useValue: api }],
    });
    const cache = TestBed.inject(SearchCacheService);

    cache.search('dune', 1).subscribe();
    expect(api.search).toHaveBeenCalledTimes(1);

    cache.clear();
    cache.search('dune', 1).subscribe();
    expect(api.search).toHaveBeenCalledTimes(2);
  });
});
