import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Annotation } from '@lumana/contracts';
import { AnnotationsService } from './annotations.service';
import { UpsertAnnotationDto } from './dto/upsert-annotation.dto';

@ApiTags('annotations')
@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Upsert a labeled annotation; emits an annotate event' })
  annotate(@Body() dto: UpsertAnnotationDto): Promise<Annotation> {
    return this.annotations.upsert(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List annotations for an asset' })
  list(@Query('assetId') assetId?: string): Promise<Annotation[]> {
    if (!assetId) throw new BadRequestException('assetId is required');
    return this.annotations.list(assetId);
  }
}
