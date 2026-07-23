import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IAnnotationResponse, IReplaceAnnotationsResponse } from '@lumana/contracts';
import { AnnotationEntity } from '../../domain/entities/annotation.entity';
import { Summarizable } from '../../../shared/domain/action-summary';

export class AnnotationResponseDto implements IAnnotationResponse, Summarizable {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiPropertyOptional({ description: 'Shape membership; absent ⇒ singleton shape' })
  groupId?: string;

  @ApiProperty({ description: 'Region label' })
  label!: string;

  @ApiProperty({
    description: 'Normalized 0–1 polygon vertices, each an [x, y] pair',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  points!: [number, number][];

  @ApiProperty({ description: 'Rotation in radians' })
  rotationRad!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  toActionSummary(): Record<string, unknown> {
    return { assetId: this.assetId, label: this.label };
  }

  static fromEntity(entity: AnnotationEntity): AnnotationResponseDto {
    const dto = new AnnotationResponseDto();
    dto.id = entity.id;
    dto.assetId = entity.assetId;
    dto.groupId = entity.groupId;
    dto.label = entity.label;
    dto.points = entity.points;
    dto.rotationRad = entity.rotationRad;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class ReplaceAnnotationsResponseDto
  implements IReplaceAnnotationsResponse, Summarizable
{
  @ApiProperty()
  assetId!: string;

  @ApiProperty({ type: [AnnotationResponseDto] })
  annotations!: AnnotationResponseDto[];

  toActionSummary(): Record<string, unknown> {
    return { assetId: this.assetId, results: this.annotations.length };
  }

  static fromEntities(
    assetId: string,
    entities: AnnotationEntity[],
  ): ReplaceAnnotationsResponseDto {
    const dto = new ReplaceAnnotationsResponseDto();
    dto.assetId = assetId;
    dto.annotations = entities.map(AnnotationResponseDto.fromEntity);
    return dto;
  }
}
