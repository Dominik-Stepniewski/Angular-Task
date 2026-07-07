import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EventLog,
  IngestResult,
  Metrics,
  Paginated,
  UploadResult,
} from '../../api/models';
import { SERVICE_B_URL } from '../../api/service-b-config';

@Injectable({ providedIn: 'root' })
export class OpsApiService {
  private readonly http = inject(HttpClient);
  private readonly serviceB = inject(SERVICE_B_URL);

  ingest(query: string, maxRecords: number): Observable<IngestResult> {
    return this.http.post<IngestResult>('/ingest', { query, maxRecords });
  }

  upload(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>('/upload', form);
  }

  logs(opts: { type?: string; from?: string; to?: string; page?: number; limit?: number } = {}): Observable<Paginated<EventLog>> {
    let params = new HttpParams()
      .set('page', opts.page ?? 1)
      .set('limit', opts.limit ?? 20);
    if (opts.type) params = params.set('type', opts.type);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    return this.http.get<Paginated<EventLog>>(`${this.serviceB}/logs`, { params });
  }

  reportPdf(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(`${this.serviceB}/report/pdf`, { params, responseType: 'blob' });
  }

  metrics(from: string, to: string): Observable<Metrics> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Metrics>(`${this.serviceB}/metrics`, { params });
  }
}
