import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IAssetResponse } from '@lumana/contracts';
import { PaginatedResponseDto } from '../../../shared/dto/paginated-response.dto';
import { AssetEntity } from '../../domain/entities/asset.entity';

export class AssetResponseDto implements IAssetResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  thumbnail!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  license!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiProperty()
  ingestedAt!: string;

  static fromEntity(entity: AssetEntity): AssetResponseDto {
    const dto = new AssetResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.url = entity.url;
    dto.thumbnail = entity.thumbnail;
    dto.source = entity.source;
    dto.license = entity.license;
    dto.tags = entity.tags;
    dto.width = entity.width;
    dto.height = entity.height;
    dto.ingestedAt = entity.ingestedAt;
    return dto;
  }
}

export class PaginatedAssetsResponseDto extends PaginatedResponseDto<AssetResponseDto> {
  @ApiProperty({ type: [AssetResponseDto] })
  override data!: AssetResponseDto[];
}
