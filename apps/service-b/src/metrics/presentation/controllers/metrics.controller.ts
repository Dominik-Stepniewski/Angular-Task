import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsRangeDto } from '../dto/metrics-range.dto';
import { MetricsResponseDto } from '../dto/metrics-response.dto';
import { MetricsService } from '../../metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Action metrics (totals + time series) for the Ops dashboard' })
  @ApiOkResponse({ type: MetricsResponseDto })
  async get(@Query() dto: MetricsRangeDto): Promise<MetricsResponseDto> {
    const result = await this.metrics.getMetrics(dto.toParams());
    return MetricsResponseDto.fromResult(result);
  }
}
