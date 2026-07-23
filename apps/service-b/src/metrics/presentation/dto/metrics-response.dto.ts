import { ApiProperty } from '@nestjs/swagger';
import { ActionType } from '@lumana/contracts';
import { MetricPoint, MetricSeries, MetricsResult } from '../../metrics.service';

export class MetricPointDto implements MetricPoint {
  @ApiProperty({ description: 'Bucket timestamp (epoch ms)' })
  t!: number;

  @ApiProperty({ description: 'Count within the bucket' })
  v!: number;
}

export class MetricSeriesDto implements MetricSeries {
  @ApiProperty({ enum: ['ingest', 'upload', 'search', 'annotate'] })
  action!: ActionType;

  @ApiProperty({ type: [MetricPointDto] })
  points!: MetricPointDto[];
}

export class MetricsResponseDto {
  @ApiProperty({ description: 'Total count per action type', type: 'object', additionalProperties: { type: 'number' } })
  byType!: Record<ActionType, number>;

  @ApiProperty({ type: [MetricSeriesDto] })
  series!: MetricSeriesDto[];

  static fromResult(result: MetricsResult): MetricsResponseDto {
    const dto = new MetricsResponseDto();
    dto.byType = result.byType;
    dto.series = result.series.map((s) => Object.assign(new MetricSeriesDto(), s));
    return dto;
  }
}
