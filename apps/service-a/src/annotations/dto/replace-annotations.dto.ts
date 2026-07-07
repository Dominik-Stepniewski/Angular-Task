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

export class AnnotationItemDto {
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
  @ArrayMinSize(3)
  points!: [number, number][];

  @ApiProperty({ description: 'Rotation in radians' })
  @IsNumber()
  rotationRad!: number;
}

export class ReplaceAnnotationsDto {
  @ApiProperty({ type: [AnnotationItemDto], description: 'Full working set; empty clears the asset' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationItemDto)
  annotations!: AnnotationItemDto[];
}
