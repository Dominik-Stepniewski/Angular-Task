import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { EventLog, Paginated } from '@lumana/contracts';
import { Filter } from 'mongodb';
import { LogsRepository } from './logs.repository';
import { QueryLogsDto } from './dto/query-logs.dto';

@Injectable()
export class LogsService implements OnModuleInit {
  constructor(private readonly repo: LogsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureIndexes();
  }

  async findByFilter(dto: QueryLogsDto): Promise<Paginated<EventLog>> {
    const { from, to, type, page = 1, limit = 20 } = dto;

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

    const [data, total] = await this.repo.findByFilter(
      filter,
      (page - 1) * limit,
      limit,
    );
    return { data, page, limit, total, hasNext: page * limit < total };
  }
}
