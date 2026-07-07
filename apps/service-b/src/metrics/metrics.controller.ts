import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsRangeDto } from './dto/metrics-range.dto';
import { MetricsResult, MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Action metrics (totals + time series) for the Ops dashboard' })
  get(@Query() dto: MetricsRangeDto): Promise<MetricsResult> {
    return this.metrics.getMetrics(dto);
  }
}
