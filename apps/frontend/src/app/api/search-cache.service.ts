import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Asset, Paginated } from './models';
import { SearchApiService } from './search-api.service';

@Injectable({ providedIn: 'root' })
export class SearchCacheService {
  private readonly api = inject(SearchApiService);
  private readonly cache = new Map<string, Paginated<Asset>>();
  private static readonly MAX_ENTRIES = 100;

  search(q: string, page: number, limit = 20): Observable<Paginated<Asset>> {
    const key = `${q}|${page}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return of(hit);
    }
    return this.api.search(q, page, limit).pipe(tap((res) => this.store(key, res)));
  }

  clear(): void {
    this.cache.clear();
  }

  private store(key: string, res: Paginated<Asset>): void {
    this.cache.set(key, res);
    if (this.cache.size > SearchCacheService.MAX_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value as string);
    }
  }
}
