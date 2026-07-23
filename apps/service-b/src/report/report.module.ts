import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ReportController } from './presentation/controllers/report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [LogsModule, MetricsModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
