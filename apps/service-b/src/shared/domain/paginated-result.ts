export interface PaginatedResult<T> {
  rows: T[];
  page: number;
  limit: number;
  total: number;
}
