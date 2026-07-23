import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventName } from '@lumana/contracts';
import { EventsService } from '../../events.service';
import { ActionEventDto } from '../dto/action-event.dto';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @EventPattern(EventName.ACTION)
  async onAction(@Payload() event: ActionEventDto): Promise<void> {
    await this.events.record(event);
  }
}
