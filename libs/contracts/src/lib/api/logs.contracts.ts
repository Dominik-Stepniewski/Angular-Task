import { ActionType } from '../events';
import { IPaginationRequest } from '../pagination';

export interface IEventLogResponse {
  id: string;
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface IQueryLogsRequest extends IPaginationRequest {
  from?: string;
  to?: string;
  type?: ActionType;
}
