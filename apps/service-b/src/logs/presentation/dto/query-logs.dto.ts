import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ACTION_TYPES,
  ActionType,
  IQueryLogsRequest,
  PAGINATION_DEFAULTS,
} from '@lumana/contracts';
import { LogsQuery } from '../../logs.service';

export class QueryLogsDto implements IQueryLogsRequest {
  @ApiPropertyOptional({ description: 'ISO8601 lower bound (inclusive)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO8601 upper bound (inclusive)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: ACTION_TYPES })
  @IsOptional()
  @IsIn(ACTION_TYPES)
  type?: ActionType;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: PAGINATION_DEFAULTS.LIMIT,
    minimum: 1,
    maximum: PAGINATION_DEFAULTS.MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_DEFAULTS.MAX_LIMIT)
  limit?: number;

  toQuery(): LogsQuery {
    return {
      from: this.from,
      to: this.to,
      type: this.type,
      page: this.page,
      limit: this.limit,
    };
  }
}
