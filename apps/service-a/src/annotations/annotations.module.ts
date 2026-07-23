import { Module } from '@nestjs/common';
import { AnnotationsController } from './presentation/controllers/annotations.controller';
import { AnnotationsRepository } from './annotations.repository';
import { AnnotationsService } from './annotations.service';
import { AssetAnnotationsController } from './presentation/controllers/asset-annotations.controller';

@Module({
  controllers: [AnnotationsController, AssetAnnotationsController],
  providers: [AnnotationsService, AnnotationsRepository],
})
export class AnnotationsModule {}
