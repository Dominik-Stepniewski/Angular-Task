import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [LogsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
