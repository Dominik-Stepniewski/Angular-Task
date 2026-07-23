import { ApiProperty } from '@nestjs/swagger';
import { IUploadFailure, IUploadResultResponse } from '@lumana/contracts';
import { IngestFileResult } from '../../assets.service';
import { Summarizable } from '../../../shared/domain/action-summary';

export class UploadFailureDto implements IUploadFailure {
  @ApiProperty()
  index!: number;
  @ApiProperty()
  reason!: string;
}

export class UploadResultDto implements IUploadResultResponse, Summarizable {
  @ApiProperty()
  inserted!: number;
  @ApiProperty()
  failedCount!: number;
  @ApiProperty({ type: [UploadFailureDto] })
  failed!: UploadFailureDto[];

  toActionSummary(): Record<string, unknown> {
    return { inserted: this.inserted, failedCount: this.failedCount };
  }

  static fromResult(result: IngestFileResult): UploadResultDto {
    const dto = new UploadResultDto();
    dto.inserted = result.inserted;
    dto.failedCount = result.failedCount;
    dto.failed = result.failed.map((f) => Object.assign(new UploadFailureDto(), f));
    return dto;
  }
}
