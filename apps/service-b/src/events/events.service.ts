import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActionEvent, EventLog } from '@lumana/contracts';
import { LogsRepository } from '../logs/logs.repository';

@Injectable()
export class EventsService {
  constructor(private readonly repo: LogsRepository) {}

  async record(e: ActionEvent): Promise<void> {
    const log: EventLog = {
      id: randomUUID(),
      sourceAction: e.sourceAction,
      type: e.type,
      payload: e.payload,
      timestamp: e.timestamp,
    };
    await this.repo.insert(log);
  }
}
