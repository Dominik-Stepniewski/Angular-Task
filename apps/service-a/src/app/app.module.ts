import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongoModule } from '@lumana/mongo';
import { RedisModule } from '@lumana/redis';
import { loadConfig } from '../config';
import { AnnotationsModule } from '../annotations/annotations.module';
import { AssetsModule } from '../assets/assets.module';
import { IngestModule } from '../ingest/ingest.module';
import {
  NATS_CLIENT,
  TimeSeriesInterceptor,
} from '../metrics/time-series.interceptor';

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
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TimeSeriesInterceptor }],
})
export class AppModule {}
