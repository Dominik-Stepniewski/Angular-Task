import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongoModule } from '@lumana/mongo';
import { RedisModule } from '@lumana/redis';
import { loadConfig } from '../config';
import { AnnotationsModule } from '../annotations/annotations.module';
import { HealthModule } from '../health/health.module';
import { AssetsModule } from '../assets/assets.module';
import { IngestModule } from '../ingest/ingest.module';
import { NATS_CLIENT } from '../shared/nats/nats.constants';
import { TimeSeriesInterceptor } from '../shared/interceptors/time-series.interceptor';

const config = loadConfig();

@Module({
  imports: [
    MongoModule.forRoot({ uri: config.mongoUri, dbName: config.mongoDb }),
    RedisModule.forRoot({ url: config.redisUrl }),
    ClientsModule.register([
      {
        name: NATS_CLIENT,
        transport: Transport.NATS,
        options: { servers: [config.natsUrl] },
      },
    ]),
    IngestModule,
    AssetsModule,
    AnnotationsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TimeSeriesInterceptor }],
})
export class AppModule {}
