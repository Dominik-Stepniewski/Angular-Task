import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { IngestController } from './presentation/controllers/ingest.controller';
import { IngestService } from './ingest.service';
import { OpenverseClient } from './openverse.client';

@Module({
  imports: [AssetsModule],
  controllers: [IngestController],
  providers: [IngestService, OpenverseClient],
})
export class IngestModule {}
