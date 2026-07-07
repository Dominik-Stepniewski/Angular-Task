import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ActionType } from '@lumana/contracts';

const ACTION_TYPES: ActionType[] = ['ingest', 'upload', 'search', 'annotate'];

export class QueryLogsDto {
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

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
