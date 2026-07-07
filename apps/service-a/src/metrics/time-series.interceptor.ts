import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ActionEvent, ActionType, EventName } from '@lumana/contracts';
import { RedisService } from '@lumana/redis';
import { Observable, tap } from 'rxjs';
import { summarize } from './summarize';

export const NATS_CLIENT = 'NATS';

const ACTION_TYPES = new Set<ActionType>(['ingest', 'upload', 'search', 'annotate']);

@Injectable()
export class TimeSeriesInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    @Inject(NATS_CLIENT) private readonly nats: ClientProxy,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = ctx.getHandler().name;
    if (!ACTION_TYPES.has(handler as ActionType)) {
      return next.handle();
    }
    const type = handler as ActionType;
    return next.handle().pipe(
      tap((result) => {
        const key = `svcA:action:${handler}`;
        void this.redis
          .tsAdd(key, 1, { action: handler, service: 'a' })
          .catch(() => undefined);
        const event: ActionEvent = {
          sourceAction: handler,
          type,
          payload: summarize(result),
          timestamp: new Date().toISOString(),
        };
        this.nats.emit(EventName.ACTION, event);
      }),
    );
  }
}
