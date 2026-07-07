import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventLog, Paginated } from '@lumana/contracts';
import { LogsService } from './logs.service';
import { QueryLogsDto } from './dto/query-logs.dto';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Filtered, paginated event-log query' })
  find(@Query() dto: QueryLogsDto): Promise<Paginated<EventLog>> {
    return this.logs.findByFilter(dto);
  }
}
