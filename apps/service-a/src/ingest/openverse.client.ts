import { BadGatewayException, Injectable } from '@nestjs/common';
import { OpenverseImage } from './map-asset';

const BASE = 'https://api.openverse.org/v1/images/';
const PAGE_SIZE = 20;
const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const USER_AGENT = 'lumana-annotation-workbench/1.0';

interface OpenversePage {
  page_count?: number;
  results?: OpenverseImage[];
}

@Injectable()
export class OpenverseClient {
  async collect(query: string, max: number): Promise<{ images: OpenverseImage[]; pages: number }> {
    const images: OpenverseImage[] = [];
    let page = 1;
    let pageCount = Infinity;

    while (images.length < max && page <= pageCount) {
      const json = await this.fetchPage(query, page);
      const results = json.results ?? [];
      if (results.length === 0) break;
      images.push(...results);
      pageCount = json.page_count ?? pageCount;
      page++;
    }

    return { images: images.slice(0, max), pages: page - 1 };
  }

  private async fetchPage(query: string, page: number): Promise<OpenversePage> {
    const url =
      `${BASE}?q=${encodeURIComponent(query)}&page=${page}&page_size=${PAGE_SIZE}`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch {
        if (attempt === MAX_RETRIES - 1) throw new BadGatewayException('UPSTREAM_TIMEOUT');
        await this.backoff(attempt);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt === MAX_RETRIES - 1) throw new BadGatewayException('UPSTREAM_ERROR');
        await this.backoff(attempt);
        continue;
      }
      if (!res.ok) throw new BadGatewayException('UPSTREAM_ERROR');
      return (await res.json()) as OpenversePage;
    }
    throw new BadGatewayException('UPSTREAM_ERROR');
  }

  private backoff(attempt: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 200));
  }
}
