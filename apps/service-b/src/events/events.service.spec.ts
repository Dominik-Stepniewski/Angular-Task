import { ActionEvent } from '@lumana/contracts';
import { LogsRepository } from '../logs/logs.repository';
import { EventsService } from './events.service';

describe('EventsService', () => {
  it('maps an ActionEvent to an EventLog keyed by the producer eventId, then inserts', async () => {
    const insert = jest.fn().mockResolvedValue(undefined);
    const svc = new EventsService({ insert } as unknown as LogsRepository);

    const event: ActionEvent = {
      eventId: 'e-1',
      sourceAction: 'search',
      type: 'search',
      payload: { results: 3, total: 10 },
      timestamp: '2026-07-03T10:00:00.000Z',
    };
    await svc.record(event);

    expect(insert).toHaveBeenCalledTimes(1);
    const log = insert.mock.calls[0][0];
    expect(log).toMatchObject({
      id: 'e-1',
      sourceAction: 'search',
      type: 'search',
      payload: { results: 3, total: 10 },
      timestamp: '2026-07-03T10:00:00.000Z',
    });
  });

  it('keeps the producer eventId so redelivered events are idempotent', async () => {
    const insert = jest.fn().mockResolvedValue(undefined);
    const svc = new EventsService({ insert } as unknown as LogsRepository);
    const base: ActionEvent = {
      eventId: 'e-2',
      sourceAction: 'ingest',
      type: 'ingest',
      payload: {},
      timestamp: '2026-07-03T10:00:00.000Z',
    };
    await svc.record(base);
    await svc.record(base);
    expect(insert.mock.calls[0][0].id).toBe('e-2');
    expect(insert.mock.calls[1][0].id).toBe('e-2');
  });
});
