import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ActionEvent, EventName } from '@lumana/contracts';
import { EventsService } from './events.service';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @EventPattern(EventName.ACTION)
  async onAction(@Payload() event: ActionEvent): Promise<void> {
    await this.events.record(event);
  }
}
