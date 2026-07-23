import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Filter, Sort } from 'mongodb';
import { AssetsRepository } from './assets.repository';
import { Asset } from './domain/interfaces/asset.model';
import { AssetEntity } from './domain/entities/asset.entity';
import { validateAsset } from './validate-asset';
import { isSafeHttpUrl } from './url-safety';
import { AssetDoc, escapeRegex, trailingToken } from './search-tokens';
import { PaginatedResult } from '../shared/domain/paginated-result';

const IMAGE_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ProxiedImage {
  contentType: string;
  body: Buffer;
}

export interface IngestFileResult {
  inserted: number;
  failedCount: number;
  failed: { index: number; reason: string }[];
}

export interface AssetSearchQuery {
  q?: string;
  page?: number;
  limit?: number;
}

async function readCapped(res: Response, max: number): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > max) throw new BadGatewayException('IMAGE_TOO_LARGE');
    return buf;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new BadGatewayException('IMAGE_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class AssetsService implements OnModuleInit {
  constructor(private readonly repo: AssetsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureIndexes();
  }

  async ingestFile(buf: Buffer): Promise<IngestFileResult> {
    let rows: unknown[];
    try {
      const parsed = JSON.parse(buf.toString());
      if (!Array.isArray(parsed)) throw new Error('not an array');
      rows = parsed;
    } catch {
      throw new BadRequestException('BAD_FILE');
    }

    const failed: { index: number; reason: string }[] = [];
    const valid: AssetEntity[] = [];
    rows.forEach((r, i) => {
      const v = validateAsset(r);
      if (v.ok) valid.push(AssetEntity.fromDocument(v.asset));
      else failed.push({ index: i, reason: v.reason });
    });

    const inserted = await this.upsertAssets(valid);
    return { inserted, failedCount: failed.length, failed };
  }

  upsertAssets(assets: AssetEntity[]): Promise<number> {
    return this.repo.upsertMany(assets.map((e) => e.toDocument()));
  }

  async getImage(id: string): Promise<ProxiedImage> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException('ASSET_NOT_FOUND');
    if (!isSafeHttpUrl(asset.url)) throw new BadRequestException('UNSAFE_URL');

    let res: Response;
    try {
      res = await fetch(asset.url, {
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('UPSTREAM_TIMEOUT');
    }
    if (!res.ok) throw new BadGatewayException('UPSTREAM_ERROR');

    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      throw new BadGatewayException('IMAGE_TOO_LARGE');
    }

    const contentType =
      res.headers.get('content-type') ?? 'application/octet-stream';
    const body = await readCapped(res, MAX_IMAGE_BYTES);
    return { contentType, body };
  }

  async search(query: AssetSearchQuery): Promise<PaginatedResult<AssetEntity>> {
    const { q, page = 1, limit = 20 } = query;
    const filter = q ? buildSearchFilter(q) : {};
    const col = this.repo.collection();
    const sort: Sort = q ? { score: { $meta: 'textScore' }, id: 1 } : { id: 1 };
    const options = q
      ? { projection: { score: { $meta: 'textScore' } } }
      : undefined;
    const [rows, total] = await Promise.all([
      col
        .find(filter, options)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      q ? col.countDocuments(filter) : col.estimatedDocumentCount(),
    ]);
    return {
      rows: rows.map((r) => AssetEntity.fromDocument(stripMongoId(r))),
      page,
      limit,
      total,
    };
  }
}

function buildSearchFilter(q: string): Filter<AssetDoc> {
  const prefix = trailingToken(q);
  const text: Filter<AssetDoc> = { $text: { $search: q } };
  if (!prefix) return text;
  return {
    $or: [text, { searchTokens: { $regex: `^${escapeRegex(prefix)}` } }],
  };
}

function stripMongoId(
  row: AssetDoc & { _id?: unknown; score?: number },
): Asset {
  const { _id, score, searchTokens: _tokens, ...asset } = row;
  void _id;
  void score;
  void _tokens;
  return asset;
}
