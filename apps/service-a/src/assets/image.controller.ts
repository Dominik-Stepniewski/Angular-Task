import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';

interface HttpResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@ApiTags('assets')
@Controller()
export class ImageController {
  constructor(private readonly assets: AssetsService) {}

  @Get('assets/:id/image')
  @ApiOperation({ summary: 'Proxy an asset image (same-origin, avoids canvas taint)' })
  async image(@Param('id') id: string, @Res() res: HttpResponse): Promise<void> {
    const { contentType, body } = await this.assets.getImage(id);
    res.setHeader('content-type', contentType);
    res.setHeader('cache-control', 'public, max-age=86400');
    res.send(body);
  }
}
