import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Annotation } from './models';

@Injectable({ providedIn: 'root' })
export class AnnotationsApiService {
  private readonly http = inject(HttpClient);

  upsert(annotation: Annotation): Observable<Annotation> {
    return this.http.post<Annotation>('/annotations', annotation);
  }

  replace(
    assetId: string,
    annotations: Annotation[],
  ): Observable<{ assetId: string; annotations: Annotation[] }> {
    return this.http.put<{ assetId: string; annotations: Annotation[] }>(
      `/assets/${assetId}/annotations`,
      { annotations },
    );
  }

  list(assetId: string): Observable<Annotation[]> {
    const params = new HttpParams().set('assetId', assetId);
    return this.http.get<Annotation[]>('/annotations', { params });
  }
}
