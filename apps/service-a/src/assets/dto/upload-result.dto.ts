import { ApiProperty } from '@nestjs/swagger';

export class UploadFailureDto {
  @ApiProperty()
  index!: number;
  @ApiProperty()
  reason!: string;
}

export class UploadResultDto {
  @ApiProperty()
  inserted!: number;
  @ApiProperty()
  failedCount!: number;
  @ApiProperty({ type: [UploadFailureDto] })
  failed!: UploadFailureDto[];
}
