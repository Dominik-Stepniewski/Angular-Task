import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../api/api-config';
import { baseUrlInterceptor } from '../../api/base-url.interceptor';
import { SERVICE_B_URL } from '../../api/service-b-config';
import { OpsApiService } from './ops-api.service';

describe('OpsApiService', () => {
  let service: OpsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://svc-a.test' },
        { provide: SERVICE_B_URL, useValue: 'http://svc-b.test' },
        provideHttpClient(withInterceptors([baseUrlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(OpsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ingest POSTs to Service A /ingest', () => {
    service.ingest('cat', 100).subscribe();
    const req = httpMock.expectOne('http://svc-a.test/ingest');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ query: 'cat', maxRecords: 100 });
    req.flush({ file: 'f', fetched: 1, pages: 1, ms: 1 });
  });

  it('upload POSTs multipart form to Service A /upload', () => {
    const file = new File(['[]'], 'assets.json', { type: 'application/json' });
    service.upload(file).subscribe();
    const req = httpMock.expectOne('http://svc-a.test/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ inserted: 0, failedCount: 0, failed: [] });
  });

  it('logs GETs Service B /logs with filters', () => {
    service.logs({ type: 'annotate', from: 'a', to: 'b', page: 2 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://svc-b.test/logs');
    expect(req.request.params.get('type')).toBe('annotate');
    expect(req.request.params.get('from')).toBe('a');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: [], page: 2, limit: 20, total: 0, hasNext: false });
  });

  it('reportPdf GETs Service B /report/pdf as a blob', () => {
    service.reportPdf('a', 'b').subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://svc-b.test/report/pdf');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('from')).toBe('a');
    req.flush(new Blob(['%PDF']));
  });

  it('metrics GETs Service B /metrics', () => {
    service.metrics('a', 'b').subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://svc-b.test/metrics');
    expect(req.request.params.get('to')).toBe('b');
    req.flush({ byType: { ingest: 0, upload: 0, search: 0, annotate: 0 }, series: [] });
  });
});
