import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ActionType } from '@lumana/contracts';
import { Filter } from 'mongodb';
import { LogsRepository } from './logs.repository';
import { EventLog } from '../events/domain/interfaces/event-log.model';
import { EventLogEntity } from '../events/domain/entities/event-log.entity';
import { PaginatedResult } from '../shared/domain/paginated-result';

export interface LogsQuery {
  from?: string;
  to?: string;
  type?: ActionType;
  page?: number;
  limit?: number;
}

@Injectable()
export class LogsService implements OnModuleInit {
  constructor(private readonly repo: LogsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureIndexes();
  }

  async findByFilter(query: LogsQuery): Promise<PaginatedResult<EventLogEntity>> {
    const { from, to, type, page = 1, limit = 20 } = query;

    const fromIso = from ? new Date(from).toISOString() : undefined;
    const toIso = to ? new Date(to).toISOString() : undefined;

    if (fromIso && toIso && fromIso > toIso) {
      throw new BadRequestException('INVALID_RANGE');
    }

    const filter: Filter<EventLog> = {};
    if (type) filter.type = type;
    if (fromIso || toIso) {
      const range: { $gte?: string; $lte?: string } = {};
      if (fromIso) range.$gte = fromIso;
      if (toIso) range.$lte = toIso;
      filter.timestamp = range;
    }

    const [docs, total] = await this.repo.findByFilter(
      filter,
      (page - 1) * limit,
      limit,
    );
    return {
      rows: docs.map(EventLogEntity.fromDocument),
      page,
      limit,
      total,
    };
  }
}
