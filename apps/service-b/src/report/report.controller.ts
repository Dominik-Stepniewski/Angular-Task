import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportService } from './report.service';

interface PdfResponse {
  end(chunk: Buffer): void;
}

@ApiTags('report')
@Controller('report')
export class ReportController {
  constructor(private readonly report: ReportService) {}

  @Get('pdf')
  @ApiOperation({
    summary: 'PDF report: KPI summary + per-time request table + requests-over-time chart',
  })
  @ApiOkResponse({ content: { 'application/pdf': {} } })
  @Header('Content-Type', 'application/pdf')
  async pdf(@Query() dto: ReportRangeDto, @Res() res: PdfResponse): Promise<void> {
    const buf = await this.report.buildPdf(dto);
    res.end(buf);
  }
}
