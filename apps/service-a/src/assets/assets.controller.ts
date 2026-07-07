import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Asset, Paginated } from '@lumana/contracts';
import { AssetsService } from './assets.service';
import { SearchAssetsDto } from './dto/search-assets.dto';
import { UploadResultDto } from './dto/upload-result.dto';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

interface UploadedFilePart {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
}

function isJsonUpload(file: UploadedFilePart): boolean {
  const mime = file.mimetype?.toLowerCase() ?? '';
  const name = file.originalname?.toLowerCase() ?? '';
  return mime.includes('json') || mime === 'application/octet-stream' || name.endsWith('.json');
}

@ApiTags('assets')
@Controller()
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a JSON array of assets; robust per-row upsert' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(@UploadedFile() file?: UploadedFilePart): Promise<UploadResultDto> {
    if (!file) throw new BadRequestException('NO_FILE');
    if (!isJsonUpload(file)) throw new BadRequestException('BAD_MIME');
    return this.assets.ingestFile(file.buffer);
  }

  @Get('assets/search')
  @ApiOperation({ summary: 'Indexed, paginated full-text asset search' })
  search(@Query() dto: SearchAssetsDto): Promise<Paginated<Asset>> {
    return this.assets.search(dto);
  }
}
