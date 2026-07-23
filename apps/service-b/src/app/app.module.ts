import { Module } from '@nestjs/common';
import { MongoModule } from '@lumana/mongo';
import { RedisModule } from '@lumana/redis';
import { loadConfig } from '../config';
import { EventsModule } from '../events/events.module';
import { HealthModule } from '../health/health.module';
import { LogsModule } from '../logs/logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ReportModule } from '../report/report.module';

const config = loadConfig();

@Module({
  imports: [
    MongoModule.forRoot({ uri: config.mongoUri, dbName: config.mongoDb }),
    RedisModule.forRoot({ url: config.redisUrl }),
    EventsModule,
    HealthModule,
    LogsModule,
    ReportModule,
    MetricsModule,
  ],
})
export class AppModule {}
