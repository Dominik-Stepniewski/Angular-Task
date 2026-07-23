import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IngestRunParams, IngestRunResult } from '../../ingest.service';
import { Summarizable } from '../../../shared/domain/action-summary';

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

  toParams(): IngestRunParams {
    return { query: this.query, maxRecords: this.maxRecords };
  }
}

export class IngestResultDto implements Summarizable {
  @ApiProperty()
  file!: string;
  @ApiProperty()
  fetched!: number;
  @ApiProperty({ description: 'Rows upserted into Mongo (inserted or modified)' })
  inserted!: number;
  @ApiProperty()
  pages!: number;
  @ApiProperty()
  ms!: number;

  toActionSummary(): Record<string, unknown> {
    return { fetched: this.fetched, inserted: this.inserted, pages: this.pages };
  }

  static fromResult(result: IngestRunResult): IngestResultDto {
    return Object.assign(new IngestResultDto(), result);
  }
}
