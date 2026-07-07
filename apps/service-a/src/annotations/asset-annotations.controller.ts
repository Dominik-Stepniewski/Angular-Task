import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnotationsService } from './annotations.service';
import { ReplaceAnnotationsDto } from './dto/replace-annotations.dto';

@ApiTags('annotations')
@Controller('assets/:assetId/annotations')
export class AssetAnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Put()
  @ApiOperation({
    summary: 'Replace all annotations for an asset (delete-then-insert); emits one annotate event',
  })
  annotate(@Param('assetId') assetId: string, @Body() dto: ReplaceAnnotationsDto) {
    return this.annotations.replaceForAsset(assetId, dto.annotations);
  }
}
