import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { AssetsService } from '../assets/assets.service';
import { AssetEntity } from '../assets/domain/entities/asset.entity';
import { OpenverseClient } from './openverse.client';

const DEFAULT_QUERY = 'nature';
const DEFAULT_MAX = 500;
const OUTPUT_FILE = 'data/dataset.json';

export interface IngestRunParams {
  query?: string;
  maxRecords?: number;
}

export interface IngestRunResult {
  file: string;
  fetched: number;
  inserted: number;
  pages: number;
  ms: number;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly client: OpenverseClient,
    private readonly assets: AssetsService,
  ) {}

  async run(params: IngestRunParams): Promise<IngestRunResult> {
    const started = Date.now();
    const q = params.query ?? DEFAULT_QUERY;
    const max = params.maxRecords ?? DEFAULT_MAX;

    let fetched = 0;
    let inserted = 0;
    let pages = 0;

    const file = await this.openDatasetStream();
    try {
      for await (const batch of this.client.collectPages(q, max)) {
        const entities = batch.map((img) => AssetEntity.fromOpenverse(img));
        inserted += await this.assets.upsertAssets(entities);
        this.writeBatch(file, entities, fetched === 0);
        fetched += entities.length;
        pages++;
      }
    } finally {
      await this.closeDatasetStream(file);
    }

    return {
      file: OUTPUT_FILE,
      fetched,
      inserted,
      pages,
      ms: Date.now() - started,
    };
  }

  private async openDatasetStream(): Promise<WriteStream | null> {
    try {
      await mkdir(dirname(OUTPUT_FILE), { recursive: true });
      const stream = createWriteStream(OUTPUT_FILE);
      stream.on('error', (err) =>
        this.logger.warn(`dataset file write failed (${OUTPUT_FILE}): ${String(err)}`),
      );
      stream.write('[');
      return stream;
    } catch (err) {
      this.logger.warn(`dataset file open failed (${OUTPUT_FILE}): ${String(err)}`);
      return null;
    }
  }

  private writeBatch(
    stream: WriteStream | null,
    entities: AssetEntity[],
    first: boolean,
  ): void {
    if (!stream || entities.length === 0) return;
    const chunk = entities.map((e) => JSON.stringify(e)).join(',');
    stream.write(first ? chunk : `,${chunk}`);
  }

  private closeDatasetStream(stream: WriteStream | null): Promise<void> {
    if (!stream) return Promise.resolve();
    return new Promise((resolve) => {
      stream.end(']', () => resolve());
    });
  }
}
