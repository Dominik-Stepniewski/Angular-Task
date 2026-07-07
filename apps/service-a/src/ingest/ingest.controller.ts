import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IngestDto, IngestResultDto } from './dto/ingest.dto';
import { IngestService } from './ingest.service';

@ApiTags('ingest')
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest images from Openverse into a JSON dataset file' })
  @ApiResponse({ status: 201, type: IngestResultDto })
  ingest(@Body() dto: IngestDto): Promise<IngestResultDto> {
    return this.ingestService.run(dto);
  }
}
