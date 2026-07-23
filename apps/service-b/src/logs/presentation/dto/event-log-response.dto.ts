import { ApiProperty } from '@nestjs/swagger';
import { ActionType, IEventLogResponse } from '@lumana/contracts';
import { EventLogEntity } from '../../../events/domain/entities/event-log.entity';
import { PaginatedResponseDto } from '../../../shared/dto/paginated-response.dto';

export class EventLogResponseDto implements IEventLogResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sourceAction!: string;

  @ApiProperty({ enum: ['ingest', 'upload', 'search', 'annotate'] })
  type!: ActionType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiProperty()
  timestamp!: string;

  static fromEntity(entity: EventLogEntity): EventLogResponseDto {
    const dto = new EventLogResponseDto();
    dto.id = entity.id;
    dto.sourceAction = entity.sourceAction;
    dto.type = entity.type;
    dto.payload = entity.payload;
    dto.timestamp = entity.timestamp;
    return dto;
  }
}

export class PaginatedLogsResponseDto extends PaginatedResponseDto<EventLogResponseDto> {
  @ApiProperty({ type: [EventLogResponseDto] })
  override data!: EventLogResponseDto[];
}
