import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { loadConfig } from './config';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Service A — ingest / search / producer')
    .setDescription(
      'Openverse image ingest, indexed asset search, annotations, RedisTimeSeries + NATS events',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.port);
  Logger.log(
    `🚀 Service A running on http://localhost:${config.port} (docs: /docs)`,
  );
}

bootstrap().catch((err) => {
  Logger.error(`Service A failed to start: ${String(err)}`);
  process.exit(1);
});
