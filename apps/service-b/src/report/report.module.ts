import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [LogsModule, MetricsModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
