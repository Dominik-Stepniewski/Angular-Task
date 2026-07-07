import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Asset, Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);

  search(q: string, page = 1, limit = 20): Observable<Paginated<Asset>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<Paginated<Asset>>('/assets/search', { params });
  }
}
