import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  checks!: Record<string, boolean>;

  static create(checks: Record<string, boolean>): HealthResponseDto {
    const dto = new HealthResponseDto();
    dto.checks = checks;
    dto.status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
    return dto;
  }
}
