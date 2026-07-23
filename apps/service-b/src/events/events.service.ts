import { Injectable } from '@nestjs/common';
import { ActionEvent } from '@lumana/contracts';
import { LogsRepository } from '../logs/logs.repository';
import { EventLogEntity } from './domain/entities/event-log.entity';

@Injectable()
export class EventsService {
  constructor(private readonly repo: LogsRepository) {}

  async record(event: ActionEvent): Promise<void> {
    const entity = EventLogEntity.fromActionEvent(event);
    await this.repo.insert(entity.toDocument());
  }
}
