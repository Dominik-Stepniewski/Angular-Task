import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { loadConfig } from './config';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [config.natsUrl] },
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Service B — consumer / logs / report')
    .setDescription('Consumes Service A events, stores logs, renders PDF reports')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.startAllMicroservices();
  await app.listen(config.port);
  Logger.log(
    `🚀 Service B running on http://localhost:${config.port} (docs: /docs)`,
  );
}

bootstrap();
