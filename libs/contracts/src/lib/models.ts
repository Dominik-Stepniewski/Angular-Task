import type { ActionType } from './events';

export interface Asset {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: string;
  license: string;
  tags: string[];
  width?: number;
  height?: number;
  ingestedAt: string;
}

export interface Annotation {
  id: string;
  assetId: string;
  groupId?: string;
  label: string;
  points: [number, number][];
  rotationRad: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventLog {
  id: string;
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}
