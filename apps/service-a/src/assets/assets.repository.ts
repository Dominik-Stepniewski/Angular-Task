import { Injectable } from '@nestjs/common';
import { MongoService } from '@lumana/mongo';
import { AnyBulkWriteOperation, BulkWriteResult, Collection } from 'mongodb';
import { AssetDoc } from './search-tokens';

@Injectable()
export class AssetsRepository {
  constructor(private readonly mongo: MongoService) {}

  collection(): Collection<AssetDoc> {
    return this.mongo.getCollection<AssetDoc>('assets');
  }

  async findById(id: string): Promise<AssetDoc | null> {
    return this.collection().findOne({ id });
  }

  async bulkWrite(
    ops: AnyBulkWriteOperation<AssetDoc>[],
  ): Promise<BulkWriteResult> {
    return this.collection().bulkWrite(ops, { ordered: false });
  }

  async ensureIndexes(): Promise<void> {
    const col = this.collection();
    await col.createIndex({ title: 'text', tags: 'text' });
    await col.createIndex({ id: 1 }, { unique: true });
    await col.createIndex({ searchTokens: 1 });
  }
}
