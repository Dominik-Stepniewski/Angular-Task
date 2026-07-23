import { Body, Controller, Param, Put, UseFilters } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnotationsService } from '../../annotations.service';
import { ReplaceAnnotationsDto } from '../dto/replace-annotations.dto';
import { ReplaceAnnotationsResponseDto } from '../dto/annotation-response.dto';
import { InvalidAnnotationFilter } from '../filters/invalid-annotation.filter';

@ApiTags('annotations')
@Controller('assets/:assetId/annotations')
@UseFilters(InvalidAnnotationFilter)
export class AssetAnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Put()
  @ApiOperation({
    summary: 'Replace all annotations for an asset (delete-then-insert); emits one annotate event',
  })
  @ApiOkResponse({ type: ReplaceAnnotationsResponseDto })
  async annotate(
    @Param('assetId') assetId: string,
    @Body() dto: ReplaceAnnotationsDto,
  ): Promise<ReplaceAnnotationsResponseDto> {
    const entities = await this.annotations.replaceForAsset(
      assetId,
      dto.annotations.map((a) => a.toProps()),
    );
    return ReplaceAnnotationsResponseDto.fromEntities(assetId, entities);
  }
}
