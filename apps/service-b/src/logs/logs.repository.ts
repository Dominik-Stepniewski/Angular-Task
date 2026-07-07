import { Injectable } from '@nestjs/common';
import { EventLog } from '@lumana/contracts';
import { Collection, Filter } from 'mongodb';
import { MongoService } from '@lumana/mongo';

@Injectable()
export class LogsRepository {
  constructor(private readonly mongo: MongoService) {}

  collection(): Collection<EventLog> {
    return this.mongo.getCollection<EventLog>('events');
  }

  async insert(log: EventLog): Promise<void> {
    await this.collection().insertOne(log);
  }

  async findByFilter(
    filter: Filter<EventLog>,
    skip: number,
    limit: number,
  ): Promise<[EventLog[], number]> {
    const col = this.collection();
    const [rows, total] = await Promise.all([
      col.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return [rows, total];
  }

  findAnnotateInRange(fromIso: string, toIso: string): Promise<EventLog[]> {
    return this.collection()
      .find({ type: 'annotate', timestamp: { $gte: fromIso, $lte: toIso } })
      .sort({ timestamp: 1 })
      .toArray();
  }

  async ensureIndexes(): Promise<void> {
    await this.collection().createIndex({ type: 1, timestamp: -1 });
  }
}
