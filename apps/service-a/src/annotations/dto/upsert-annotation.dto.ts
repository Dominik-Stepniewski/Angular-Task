import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertAnnotationDto {
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
  @ArrayMinSize(3)
  points!: [number, number][];

  @ApiProperty({ description: 'Rotation in radians' })
  @IsNumber()
  rotationRad!: number;

  @ApiPropertyOptional({ description: 'Original creation time; server sets if absent' })
  @IsOptional()
  @IsString()
  createdAt?: string;
}
