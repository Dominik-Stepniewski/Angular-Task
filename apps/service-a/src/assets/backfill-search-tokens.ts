/**
 * One-off backfill: derive `searchTokens` for assets stored before the field
 * existed. Without it those documents never match the prefix clause in
 * AssetsService.search(), so typeahead silently misses them.
 *
 * Reuses searchTokens() rather than reimplementing tokenisation in an
 * aggregation pipeline, so backfilled docs are byte-identical to newly
 * ingested ones. Idempotent: re-running only rewrites the same values.
 *
 * Run: npx tsx apps/service-a/src/assets/backfill-search-tokens.ts
 * Env: MONGO_URI (default mongodb://127.0.0.1:27017), MONGO_DB (default lumana)
 */
import { AnyBulkWriteOperation, MongoClient } from 'mongodb';
import { AssetDoc, searchTokens } from './search-tokens';

const BATCH = 500;

export async function backfillSearchTokens(
  uri: string,
  dbName: string,
  onProgress: (done: number) => void = () => undefined,
): Promise<{ scanned: number; updated: number }> {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<AssetDoc>('assets');
    const cursor = col.find({ searchTokens: { $exists: false } });

    let scanned = 0;
    let updated = 0;
    let ops: AnyBulkWriteOperation<AssetDoc>[] = [];

    const flush = async (): Promise<void> => {
      if (ops.length === 0) return;
      const res = await col.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount;
      ops = [];
      onProgress(scanned);
    };

    for await (const doc of cursor) {
      scanned += 1;
      ops.push({
        updateOne: {
          filter: { id: doc.id },
          update: { $set: { searchTokens: searchTokens(doc) } },
        },
      });
      if (ops.length >= BATCH) await flush();
    }
    await flush();

    // The index is normally created by AssetsService.onModuleInit; ensure it
    // here too so a standalone backfill leaves the collection queryable.
    await col.createIndex({ searchTokens: 1 });

    return { scanned, updated };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const uri = process.env['MONGO_URI'] ?? 'mongodb://127.0.0.1:27017';
  const dbName = process.env['MONGO_DB'] ?? 'lumana';
  backfillSearchTokens(uri, dbName, (done) => console.log(`  ...${done} scanned`))
    .then(({ scanned, updated }) => {
      console.log(`backfill complete: scanned=${scanned} updated=${updated}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('backfill failed:', err);
      process.exit(1);
    });
}
