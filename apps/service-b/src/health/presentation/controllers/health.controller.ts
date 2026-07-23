import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MongoService } from '@lumana/mongo';
import { RedisService } from '@lumana/redis';
import { HealthResponseDto } from '../dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly mongo: MongoService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness/readiness: Mongo + Redis connectivity' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    const [mongo, redis] = await Promise.all([
      this.mongo.ping(),
      this.redis.ping(),
    ]);
    const dto = HealthResponseDto.create({ mongo, redis });
    if (dto.status !== 'ok') {
      throw new ServiceUnavailableException(dto);
    }
    return dto;
  }
}
