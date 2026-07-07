import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchCacheService } from '../../api/search-cache.service';
import { OpsApiService } from './ops-api.service';
import { OpsPanelComponent } from './ops-panel.component';

describe('OpsPanelComponent', () => {
  const searchCache = { clear: jest.fn() };
  const api = {
    ingest: jest.fn().mockReturnValue(of({ file: 'f', fetched: 3, inserted: 3, pages: 1, ms: 5 })),
    upload: jest.fn().mockReturnValue(of({ inserted: 2, failedCount: 0, failed: [] })),
    logs: jest.fn().mockReturnValue(of({ data: [{ id: 'l1', type: 'annotate', timestamp: 't', payload: { label: 'cat' } }], page: 1, limit: 50, total: 1, hasNext: false })),
    reportPdf: jest.fn().mockReturnValue(of(new Blob(['%PDF']))),
    metrics: jest.fn().mockReturnValue(of({ byType: { ingest: 1, upload: 0, search: 4, annotate: 2 }, series: [] })),
  };

  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockClear());
    searchCache.clear.mockClear();
    TestBed.configureTestingModule({
      imports: [OpsPanelComponent],
      providers: [
        { provide: OpsApiService, useValue: api },
        { provide: SearchCacheService, useValue: searchCache },
      ],
    });
  });

  const make = () => TestBed.createComponent(OpsPanelComponent).componentInstance;

  it('runIngest stores the ingest result', () => {
    const cmp = make();
    cmp.query.set('cat');
    cmp.runIngest();
    expect(api.ingest).toHaveBeenCalledWith('cat', 100);
    expect(cmp.ingestResult()?.fetched).toBe(3);
    expect(cmp.ingesting()).toBe(false);
    expect(searchCache.clear).toHaveBeenCalledTimes(1);
  });

  it('runIngest does NOT clear the search cache when nothing new was inserted', () => {
    api.ingest.mockReturnValueOnce(of({ file: 'f', fetched: 0, inserted: 0, pages: 0, ms: 1 }));
    const cmp = make();
    cmp.runIngest();
    expect(searchCache.clear).not.toHaveBeenCalled();
  });

  it('runUpload does nothing without a file, then uploads once one is set', () => {
    const cmp = make();
    cmp.runUpload();
    expect(api.upload).not.toHaveBeenCalled();

    cmp.file.set(new File(['[]'], 'a.json', { type: 'application/json' }));
    cmp.runUpload();
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(cmp.uploadResult()?.inserted).toBe(2);
    expect(searchCache.clear).toHaveBeenCalledTimes(1);
  });

  it('loadLogs stores fetched rows filtered by type', () => {
    const cmp = make();
    cmp.logType.set('annotate');
    cmp.loadLogs();
    expect(api.logs).toHaveBeenCalledWith({ type: 'annotate', limit: 50 });
    expect(cmp.logs()).toHaveLength(1);
  });

  it('loadMetrics stores the metrics result', () => {
    const cmp = make();
    cmp.loadMetrics();
    expect(api.metrics).toHaveBeenCalled();
    expect(cmp.metrics()?.byType.annotate).toBe(2);
  });

  it('downloadReport requests the pdf blob', () => {
    const cmp = make();
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    cmp.downloadReport();
    expect(api.reportPdf).toHaveBeenCalled();
    expect(cmp.downloading()).toBe(false);
  });
});
