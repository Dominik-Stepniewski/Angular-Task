import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { baseUrlInterceptor } from './base-url.interceptor';
import { Annotation } from './models';
import { AnnotationsApiService } from './annotations-api.service';

const annotation: Annotation = {
  id: 'p1',
  assetId: 'ov-1',
  label: 'cat',
  points: [[0.1, 0.1], [0.2, 0.2], [0.1, 0.3]],
  rotationRad: 0,
};

describe('AnnotationsApiService', () => {
  let service: AnnotationsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        provideHttpClient(withInterceptors([baseUrlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AnnotationsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs an annotation to /annotations', () => {
    service.upsert(annotation).subscribe();
    const req = httpMock.expectOne('http://api.test/annotations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(annotation);
    req.flush(annotation);
  });

  it('GETs annotations for an asset', () => {
    service.list('ov-1').subscribe((res) => expect(res).toEqual([annotation]));
    const req = httpMock.expectOne((r) => r.url === 'http://api.test/annotations');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('assetId')).toBe('ov-1');
    req.flush([annotation]);
  });

  it('PUTs the whole working set to /assets/:id/annotations', () => {
    service.replace('ov-1', [annotation]).subscribe();
    const req = httpMock.expectOne('http://api.test/assets/ov-1/annotations');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ annotations: [annotation] });
    req.flush({ assetId: 'ov-1', annotations: [annotation] });
  });
});
