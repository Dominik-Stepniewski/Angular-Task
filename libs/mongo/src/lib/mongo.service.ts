import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Collection, Db, Document, MongoClient } from 'mongodb';

@Injectable()
export class MongoService implements OnModuleDestroy {
  private client!: MongoClient;
  private db!: Db;

  async connect(uri: string, dbName: string): Promise<Db> {
    if (this.db) return this.db;
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(dbName);
    return this.db;
  }

  async ping(): Promise<boolean> {
    try {
      await this.db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('MongoService: call connect() before getCollection()');
    }
    return this.db.collection<T>(name);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }
}
