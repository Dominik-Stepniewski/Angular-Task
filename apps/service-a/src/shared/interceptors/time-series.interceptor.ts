import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import {
  ActionEvent,
  ActionType,
  ACTION_TYPES,
  EventName,
  METRICS_SERVICE_LABEL,
  metricsKey,
} from '@lumana/contracts';
import { RedisService } from '@lumana/redis';
import { lastValueFrom, Observable, tap } from 'rxjs';
import { isSummarizable } from '../domain/action-summary';
import { NATS_CLIENT } from '../nats/nats.constants';

const ACTION_TYPE_SET = new Set<ActionType>(ACTION_TYPES);

@Injectable()
export class TimeSeriesInterceptor
  implements NestInterceptor, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TimeSeriesInterceptor.name);

  constructor(
    private readonly redis: RedisService,
    @Inject(NATS_CLIENT) private readonly nats: ClientProxy,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.nats.connect();
    } catch (err) {
      this.logger.error(`NATS connect failed at bootstrap: ${String(err)}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.nats.close();
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = ctx.getHandler().name;
    if (!ACTION_TYPE_SET.has(handler as ActionType)) {
      return next.handle();
    }
    const type = handler as ActionType;
    return next.handle().pipe(
      tap((result) => {
        void this.redis
          .tsAdd(metricsKey(type), 1, { action: type, service: METRICS_SERVICE_LABEL })
          .catch((err) => this.logger.warn(`metrics write failed: ${String(err)}`));
        const event: ActionEvent = {
          eventId: randomUUID(),
          sourceAction: type,
          type,
          payload: isSummarizable(result) ? result.toActionSummary() : {},
          timestamp: new Date().toISOString(),
        };
        void lastValueFrom(this.nats.emit(EventName.ACTION, event)).catch((err) =>
          this.logger.warn(`event emit failed: ${String(err)}`),
        );
      }),
    );
  }
}
