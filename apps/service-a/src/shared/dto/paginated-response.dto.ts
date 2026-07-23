import { ApiProperty } from '@nestjs/swagger';
import { IPaginatedResponse } from '@lumana/contracts';
import { PaginatedResult } from '../domain/paginated-result';
import { Summarizable } from '../domain/action-summary';

export class PaginatedResponseDto<T> implements IPaginatedResponse<T>, Summarizable {
  @ApiProperty({ description: 'Page slice of matching records' })
  data!: T[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total matching records' })
  total!: number;

  @ApiProperty({ description: 'Whether another page exists' })
  hasNext!: boolean;

  toActionSummary(): Record<string, unknown> {
    return { results: this.data.length, total: this.total, page: this.page };
  }

  static fromResult<S, D, R extends PaginatedResponseDto<D>>(
    this: new () => R,
    result: PaginatedResult<S>,
    map: (row: S) => D,
  ): R {
    const dto = new this();
    dto.data = result.rows.map(map);
    dto.page = result.page;
    dto.limit = result.limit;
    dto.total = result.total;
    dto.hasNext = result.page * result.limit < result.total;
    return dto;
  }
}
