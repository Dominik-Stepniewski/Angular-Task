import { Injectable, Logger } from '@nestjs/common';
import { Asset } from '@lumana/contracts';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { AssetsService } from '../assets/assets.service';
import { IngestDto, IngestResultDto } from './dto/ingest.dto';
import { mapAsset } from './map-asset';
import { OpenverseClient } from './openverse.client';

const DEFAULT_QUERY = 'nature';
const DEFAULT_MAX = 500;
const OUTPUT_FILE = 'data/dataset.json';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly client: OpenverseClient,
    private readonly assets: AssetsService,
  ) {}

  async run(dto: IngestDto): Promise<IngestResultDto> {
    const started = Date.now();
    const q = dto.query ?? DEFAULT_QUERY;
    const max = dto.maxRecords ?? DEFAULT_MAX;

    const { images, pages } = await this.client.collect(q, max);
    const assets: Asset[] = images.map(mapAsset);

    const inserted = await this.assets.upsertAssets(assets);

    await this.writeDatasetFile(assets);

    return {
      file: OUTPUT_FILE,
      fetched: assets.length,
      inserted,
      pages,
      ms: Date.now() - started,
    };
  }

  private async writeDatasetFile(assets: Asset[]): Promise<void> {
    try {
      await mkdir(dirname(OUTPUT_FILE), { recursive: true });
      await writeFile(OUTPUT_FILE, JSON.stringify(assets));
    } catch (err) {
      this.logger.warn(`dataset file write failed (${OUTPUT_FILE}): ${String(err)}`);
    }
  }
}
