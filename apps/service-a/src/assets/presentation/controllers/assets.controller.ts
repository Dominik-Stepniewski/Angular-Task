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
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from '../../assets.service';
import { SearchAssetsDto } from '../dto/search-assets.dto';
import { UploadResultDto } from '../dto/upload-result.dto';
import {
  AssetResponseDto,
  PaginatedAssetsResponseDto,
} from '../dto/asset-response.dto';

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
  @ApiOkResponse({ type: UploadResultDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@UploadedFile() file?: UploadedFilePart): Promise<UploadResultDto> {
    if (!file) throw new BadRequestException('NO_FILE');
    if (!isJsonUpload(file)) throw new BadRequestException('BAD_MIME');
    const result = await this.assets.ingestFile(file.buffer);
    return UploadResultDto.fromResult(result);
  }

  @Get('assets/search')
  @ApiOperation({ summary: 'Indexed, paginated full-text asset search' })
  @ApiOkResponse({ type: PaginatedAssetsResponseDto })
  async search(@Query() dto: SearchAssetsDto): Promise<PaginatedAssetsResponseDto> {
    const result = await this.assets.search({
      q: dto.q,
      page: dto.page,
      limit: dto.limit,
    });
    return PaginatedAssetsResponseDto.fromResult(result, AssetResponseDto.fromEntity);
  }
}
