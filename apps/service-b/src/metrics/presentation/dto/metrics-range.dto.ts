import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Min } from 'class-validator';
import { MetricsRangeParams } from '../../metrics.service';

export class MetricsRangeDto {
  @ApiProperty({ description: 'ISO8601 range start' })
  @IsISO8601()
  from!: string;

  @ApiProperty({ description: 'ISO8601 range end' })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ description: 'Aggregation bucket in ms', default: 3600000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  bucketMs?: number;

  toParams(): MetricsRangeParams {
    return { from: this.from, to: this.to, bucketMs: this.bucketMs };
  }
}
