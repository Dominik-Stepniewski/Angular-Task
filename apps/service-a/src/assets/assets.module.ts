import { Module } from '@nestjs/common';
import { AssetsController } from './presentation/controllers/assets.controller';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';
import { ImageController } from './presentation/controllers/image.controller';

@Module({
  controllers: [AssetsController, ImageController],
  providers: [AssetsService, AssetsRepository],
  exports: [AssetsService],
})
export class AssetsModule {}
