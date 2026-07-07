import { Injectable } from '@nestjs/common';
import { Asset } from '@lumana/contracts';
import { MongoService } from '@lumana/mongo';
import { AnyBulkWriteOperation, BulkWriteResult, Collection } from 'mongodb';

@Injectable()
export class AssetsRepository {
  constructor(private readonly mongo: MongoService) {}

  collection(): Collection<Asset> {
    return this.mongo.getCollection<Asset>('assets');
  }

  findById(id: string): Promise<Asset | null> {
    return this.collection().findOne({ id });
  }

  bulkWrite(ops: AnyBulkWriteOperation<Asset>[]): Promise<BulkWriteResult> {
    return this.collection().bulkWrite(ops, { ordered: false });
  }

  async ensureIndexes(): Promise<void> {
    const col = this.collection();
    await col.createIndex({ title: 'text', tags: 'text' });
    await col.createIndex({ id: 1 }, { unique: true });
  }
}
