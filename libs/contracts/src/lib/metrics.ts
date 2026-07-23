import { ActionType } from './events';

export const METRICS_SERVICE_LABEL = 'a';

export function metricsKey(action: ActionType): string {
  return `svcA:action:${action}`;
}

export interface MetricSample {
  timestamp: number;
  value: number;
}
