import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogsService } from '../../logs.service';
import { QueryLogsDto } from '../dto/query-logs.dto';
import {
  EventLogResponseDto,
  PaginatedLogsResponseDto,
} from '../dto/event-log-response.dto';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Filtered, paginated event-log query' })
  @ApiOkResponse({ type: PaginatedLogsResponseDto })
  async find(@Query() dto: QueryLogsDto): Promise<PaginatedLogsResponseDto> {
    const result = await this.logs.findByFilter(dto.toQuery());
    return PaginatedLogsResponseDto.fromResult(result, EventLogResponseDto.fromEntity);
  }
}
