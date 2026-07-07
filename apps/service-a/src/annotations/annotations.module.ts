import { Module } from '@nestjs/common';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsRepository } from './annotations.repository';
import { AnnotationsService } from './annotations.service';
import { AssetAnnotationsController } from './asset-annotations.controller';

@Module({
  controllers: [AnnotationsController, AssetAnnotationsController],
  providers: [AnnotationsService, AnnotationsRepository],
})
export class AnnotationsModule {}
