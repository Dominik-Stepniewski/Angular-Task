import { EventLog } from '@lumana/contracts';

export interface LineDataset {
  label: string;
  data: number[];
}

export interface DayCount {
  date: string;
  count: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface AnnotationChartData {
  perDay: DayCount[];
  byLabel: LabelCount[];
  total: number;
  hasData: boolean;
}

const UNLABELED = '(unlabeled)';

export function buildChartData(logs: EventLog[]): AnnotationChartData {
  const perDayMap = new Map<string, number>();
  const byLabelMap = new Map<string, number>();

  for (const log of logs) {
    const date = log.timestamp.slice(0, 10);
    perDayMap.set(date, (perDayMap.get(date) ?? 0) + 1);

    const raw = log.payload?.['label'];
    const label = typeof raw === 'string' && raw.length > 0 ? raw : UNLABELED;
    byLabelMap.set(label, (byLabelMap.get(label) ?? 0) + 1);
  }

  const perDay = [...perDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const byLabel = [...byLabelMap.entries()]
    .sort(([la, a], [lb, b]) => b - a || la.localeCompare(lb))
    .map(([label, count]) => ({ label, count }));

  return { perDay, byLabel, total: logs.length, hasData: logs.length > 0 };
}
