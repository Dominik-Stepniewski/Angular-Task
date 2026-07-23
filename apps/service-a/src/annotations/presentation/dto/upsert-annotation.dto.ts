import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ANNOTATION_VALIDATION, IUpsertAnnotationRequest } from '@lumana/contracts';
import { AnnotationProps } from '../../domain/interfaces/annotation.props';

export class UpsertAnnotationDto implements IUpsertAnnotationRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @ApiPropertyOptional({ description: 'Shape membership; absent ⇒ singleton shape' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: 'Region label' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({
    description: 'Normalized 0–1 polygon vertices, each an [x, y] pair',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  @IsArray()
  @ArrayMinSize(ANNOTATION_VALIDATION.MIN_POLYGON_VERTICES)
  points!: [number, number][];

  @ApiProperty({ description: 'Rotation in radians' })
  @IsNumber()
  rotationRad!: number;

  @ApiPropertyOptional({ description: 'Original creation time; server sets if absent' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  toProps(): AnnotationProps {
    return {
      id: this.id,
      assetId: this.assetId,
      groupId: this.groupId,
      label: this.label,
      points: this.points,
      rotationRad: this.rotationRad,
      createdAt: this.createdAt,
    };
  }
}
