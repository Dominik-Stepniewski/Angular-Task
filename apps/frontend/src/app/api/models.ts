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
  createdAt?: string;
  updatedAt?: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export type ActionType = 'ingest' | 'upload' | 'search' | 'annotate';

export interface EventLog {
  id: string;
  sourceAction: string;
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface IngestResult {
  file: string;
  fetched: number;
  inserted: number;
  pages: number;
  ms: number;
}

export interface UploadResult {
  inserted: number;
  failedCount: number;
  failed: { index: number; reason: string }[];
}

export interface Metrics {
  byType: Record<ActionType, number>;
  series: { action: ActionType; points: { t: number; v: number }[] }[];
}
