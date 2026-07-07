export enum EventName {
  ACTION = 'svcA.action',
}

export type ActionType = 'ingest' | 'upload' | 'search' | 'annotate';

export interface ActionEvent {
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}
