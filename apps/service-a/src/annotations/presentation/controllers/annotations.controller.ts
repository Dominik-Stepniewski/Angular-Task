import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnotationsService } from '../../annotations.service';
import { UpsertAnnotationDto } from '../dto/upsert-annotation.dto';
import { AnnotationResponseDto } from '../dto/annotation-response.dto';
import { InvalidAnnotationFilter } from '../filters/invalid-annotation.filter';

@ApiTags('annotations')
@Controller('annotations')
@UseFilters(InvalidAnnotationFilter)
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Upsert a labeled annotation; emits an annotate event' })
  @ApiOkResponse({ type: AnnotationResponseDto })
  async annotate(@Body() dto: UpsertAnnotationDto): Promise<AnnotationResponseDto> {
    const entity = await this.annotations.upsert(dto.toProps());
    return AnnotationResponseDto.fromEntity(entity);
  }

  @Get()
  @ApiOperation({ summary: 'List annotations for an asset' })
  @ApiOkResponse({ type: [AnnotationResponseDto] })
  async list(@Query('assetId') assetId?: string): Promise<AnnotationResponseDto[]> {
    if (!assetId) throw new BadRequestException('assetId is required');
    const entities = await this.annotations.list(assetId);
    return entities.map(AnnotationResponseDto.fromEntity);
  }
}
