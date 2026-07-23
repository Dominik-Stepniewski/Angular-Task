import { ActionType } from '@lumana/contracts';

export interface EventLog {
  id: string;
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}
