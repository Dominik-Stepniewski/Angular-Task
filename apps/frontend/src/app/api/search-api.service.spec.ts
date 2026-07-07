import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { baseUrlInterceptor } from './base-url.interceptor';
import { Paginated } from './models';
import { SearchApiService } from './search-api.service';

describe('SearchApiService', () => {
  let service: SearchApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        provideHttpClient(withInterceptors([baseUrlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SearchApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('hits /assets/search with q/page/limit params, prefixed by the base URL', () => {
    const body: Paginated<never> = { data: [], page: 2, limit: 10, total: 0, hasNext: false };
    service.search('cat', 2, 10).subscribe((res) => expect(res).toEqual(body));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://api.test/assets/search',
    );
    expect(req.request.params.get('q')).toBe('cat');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(body);
  });

  it('omits q when empty', () => {
    service.search('', 1, 20).subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://api.test/assets/search');
    expect(req.request.params.has('q')).toBe(false);
    req.flush({ data: [], page: 1, limit: 20, total: 0, hasNext: false });
  });
});
