export interface IPaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export interface IPaginationRequest {
  page?: number;
  limit?: number;
}
