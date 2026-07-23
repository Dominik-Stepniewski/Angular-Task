import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ANNOTATION_VALIDATION,
  IAnnotationItemRequest,
  IReplaceAnnotationsRequest,
} from '@lumana/contracts';
import { AnnotationProps } from '../../domain/interfaces/annotation.props';

export class AnnotationItemDto implements IAnnotationItemRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

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

  toProps(): Omit<AnnotationProps, 'assetId'> {
    return {
      id: this.id,
      groupId: this.groupId,
      label: this.label,
      points: this.points,
      rotationRad: this.rotationRad,
    };
  }
}

export class ReplaceAnnotationsDto implements IReplaceAnnotationsRequest {
  @ApiProperty({ type: [AnnotationItemDto], description: 'Full working set; empty clears the asset' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationItemDto)
  annotations!: AnnotationItemDto[];
}
