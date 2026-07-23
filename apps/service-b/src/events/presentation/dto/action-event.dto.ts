import { IsIn, IsISO8601, IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';
import { ACTION_TYPES, ActionEvent, ActionType } from '@lumana/contracts';

export class ActionEventDto implements ActionEvent {
  @IsUUID()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  sourceAction!: string;

  @IsIn(ACTION_TYPES)
  type!: ActionType;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsISO8601()
  timestamp!: string;
}
