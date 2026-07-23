import { Injectable } from '@nestjs/common';
import { Annotation } from './domain/interfaces/annotation.model';
import { MongoService } from '@lumana/mongo';
import { AnyBulkWriteOperation, Collection } from 'mongodb';

@Injectable()
export class AnnotationsRepository {
  constructor(private readonly mongo: MongoService) {}

  collection(): Collection<Annotation> {
    return this.mongo.getCollection<Annotation>('annotations');
  }

  async upsert(a: Annotation): Promise<Annotation> {
    const { createdAt, ...mutable } = a;
    const doc = await this.collection().findOneAndUpdate(
      { id: a.id },
      { $set: mutable, $setOnInsert: { createdAt } },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    );
    return (doc ?? a) as Annotation;
  }

  async replaceForAsset(assetId: string, docs: Annotation[]): Promise<void> {
    const keepIds = docs.map((d) => d.id);
    const ops: AnyBulkWriteOperation<Annotation>[] = [
      { deleteMany: { filter: { assetId, id: { $nin: keepIds } } } },
      ...docs.map((d) => ({
        replaceOne: { filter: { id: d.id }, replacement: d, upsert: true },
      })),
    ];
    await this.collection().bulkWrite(ops, { ordered: true });
  }

  findByAsset(assetId: string): Promise<Annotation[]> {
    return this.collection()
      .find({ assetId }, { projection: { _id: 0 } })
      .sort({ _id: 1 })
      .toArray();
  }

  async ensureIndexes(): Promise<void> {
    const col = this.collection();
    await col.createIndex({ id: 1 }, { unique: true });
    await col.createIndex({ assetId: 1 });
  }
}
