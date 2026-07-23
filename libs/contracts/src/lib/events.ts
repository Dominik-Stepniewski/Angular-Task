export enum EventName {
  ACTION = 'svcA.action',
}

export type ActionType = 'ingest' | 'upload' | 'search' | 'annotate';

export const ACTION_TYPES: readonly ActionType[] = [
  'ingest',
  'upload',
  'search',
  'annotate',
] as const;

export interface ActionEvent {
  eventId: string;
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}
