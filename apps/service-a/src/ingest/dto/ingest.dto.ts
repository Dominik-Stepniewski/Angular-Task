import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class IngestDto {
  @ApiPropertyOptional({ description: 'Openverse image search query', default: 'nature' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Max records to ingest', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200000)
  maxRecords?: number;
}

export class IngestResultDto {
  @ApiPropertyOptional()
  file!: string;
  @ApiPropertyOptional()
  fetched!: number;
  @ApiPropertyOptional({ description: 'Rows upserted into Mongo (inserted or modified)' })
  inserted!: number;
  @ApiPropertyOptional()
  pages!: number;
  @ApiPropertyOptional()
  ms!: number;
}
