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

  async upsertMany(docs: AssetDoc[]): Promise<number> {
    if (docs.length === 0) return 0;
    const ops: AnyBulkWriteOperation<AssetDoc>[] = docs.map((doc) => ({
      updateOne: {
        filter: { id: doc.id },
        update: { $set: doc },
        upsert: true,
      },
    }));
    const res: BulkWriteResult = await this.collection().bulkWrite(ops, {
      ordered: false,
    });
    return res.upsertedCount + res.modifiedCount;
  }

  async ensureIndexes(): Promise<void> {
    const col = this.collection();
    await col.createIndex({ title: 'text', tags: 'text' });
    await col.createIndex({ id: 1 }, { unique: true });
    await col.createIndex({ searchTokens: 1 });
  }
}
