import { ActionType } from '@lumana/contracts';
import { MetricSeries } from '../metrics/metrics.service';
import { LabelCount } from './chart-data';

export const REPORT_ACTIONS: ActionType[] = ['ingest', 'upload', 'search', 'annotate'];

export interface ActivityRow {
  t: number;
  counts: Record<string, number>;
  total: number;
}

export interface ReportKpis {
  totalRequests: number;
  byType: Record<string, number>;
  busiest: { t: number; total: number } | null;
  uniqueLabels: number;
  topLabel: LabelCount | null;
}

export function buildActivityTable(series: MetricSeries[]): ActivityRow[] {
  const byT = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const p of s.points) {
      if (!p.v) continue;
      const row = byT.get(p.t) ?? {};
      row[s.action] = (row[s.action] ?? 0) + p.v;
      byT.set(p.t, row);
    }
  }
  return [...byT.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, counts]) => ({
      t,
      counts,
      total: REPORT_ACTIONS.reduce((sum, a) => sum + (counts[a] ?? 0), 0),
    }));
}

export function buildKpis(
  byType: Record<string, number>,
  rows: ActivityRow[],
  byLabel: LabelCount[],
): ReportKpis {
  const totalRequests = REPORT_ACTIONS.reduce((sum, a) => sum + (byType[a] ?? 0), 0);
  const busiest = rows.length ? rows.reduce((max, r) => (r.total > max.total ? r : max)) : null;
  return {
    totalRequests,
    byType,
    busiest: busiest ? { t: busiest.t, total: busiest.total } : null,
    uniqueLabels: byLabel.length,
    topLabel: byLabel[0] ?? null,
  };
}
