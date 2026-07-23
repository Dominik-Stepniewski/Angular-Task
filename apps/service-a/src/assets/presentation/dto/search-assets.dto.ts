import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ISearchAssetsRequest, PAGINATION_DEFAULTS } from '@lumana/contracts';

export class SearchAssetsDto implements ISearchAssetsRequest {
  @ApiPropertyOptional({ description: 'Full-text query over title + tags' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: PAGINATION_DEFAULTS.LIMIT,
    minimum: 1,
    maximum: PAGINATION_DEFAULTS.MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_DEFAULTS.MAX_LIMIT)
  limit?: number;
}
