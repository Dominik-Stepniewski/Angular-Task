import { ActionEvent, ActionType } from '@lumana/contracts';
import { EventLog } from '../interfaces/event-log.model';

export class EventLogEntity implements EventLog {
  id!: string;
  sourceAction!: string;
  type!: ActionType;
  payload!: Record<string, unknown>;
  timestamp!: string;

  get isAnnotate(): boolean {
    return this.type === 'annotate';
  }

  get label(): string | undefined {
    const raw = this.payload?.['label'];
    return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
  }

  occurredWithin(fromIso: string, toIso: string): boolean {
    return this.timestamp >= fromIso && this.timestamp <= toIso;
  }

  toDocument(): EventLog {
    return {
      id: this.id,
      sourceAction: this.sourceAction,
      type: this.type,
      payload: this.payload,
      timestamp: this.timestamp,
    };
  }

  static fromActionEvent(event: ActionEvent): EventLogEntity {
    const entity = new EventLogEntity();
    entity.id = event.eventId;
    entity.sourceAction = event.sourceAction;
    entity.type = event.type;
    entity.payload = event.payload;
    entity.timestamp = event.timestamp;
    return entity;
  }

  static fromDocument(doc: EventLog): EventLogEntity {
    const entity = new EventLogEntity();
    Object.assign(entity, doc);
    return entity;
  }
}
