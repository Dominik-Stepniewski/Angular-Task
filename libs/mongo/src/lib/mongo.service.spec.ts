import { MongoClient } from 'mongodb';
import { MongoService } from './mongo.service';

jest.mock('mongodb');

describe('MongoService', () => {
  const MongoClientMock = MongoClient as unknown as jest.Mock;

  beforeEach(() => MongoClientMock.mockReset());

  it('connects to the given uri/db and returns a collection from the connected db', async () => {
    const fakeCollection = { collectionName: 'books' };
    const fakeDb = { collection: jest.fn().mockReturnValue(fakeCollection) };
    const connect = jest.fn().mockResolvedValue(undefined);
    const db = jest.fn().mockReturnValue(fakeDb);
    MongoClientMock.mockImplementation(() => ({ connect, db, close: jest.fn() }));

    const svc = new MongoService();
    const returnedDb = await svc.connect('mongodb://host:27017', 'lumana');

    expect(MongoClientMock).toHaveBeenCalledWith('mongodb://host:27017');
    expect(connect).toHaveBeenCalledTimes(1);
    expect(db).toHaveBeenCalledWith('lumana');
    expect(returnedDb).toBe(fakeDb);

    const col = svc.getCollection('books');
    expect(fakeDb.collection).toHaveBeenCalledWith('books');
    expect(col).toBe(fakeCollection);
  });

  it('closes the client on module destroy', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    MongoClientMock.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({ collection: jest.fn() }),
      close,
    }));

    const svc = new MongoService();
    await svc.connect('mongodb://host', 'lumana');
    await svc.onModuleDestroy();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not throw on destroy when never connected', async () => {
    const svc = new MongoService();
    await expect(svc.onModuleDestroy()).resolves.not.toThrow();
  });

  it('throws a clear error when getCollection is called before connect', () => {
    const svc = new MongoService();
    expect(() => svc.getCollection('books')).toThrow(/connect\(\) before getCollection/);
  });

  it('is idempotent — a second connect reuses the client, no leak', async () => {
    MongoClientMock.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({ collection: jest.fn() }),
      close: jest.fn(),
    }));

    const svc = new MongoService();
    const first = await svc.connect('mongodb://host', 'lumana');
    const second = await svc.connect('mongodb://host', 'lumana');

    expect(MongoClientMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});
