import { EventLog } from '../events/domain/interfaces/event-log.model';
import { buildChartData } from './chart-data';

const log = (timestamp: string, label?: string): EventLog => ({
  id: Math.random().toString(36),
  sourceAction: 'annotate',
  type: 'annotate',
  payload: label === undefined ? {} : { label },
  timestamp,
});

describe('buildChartData (annotation activity)', () => {
  it('counts annotations per UTC day (chronological) and per label (descending)', () => {
    const logs = [
      log('2026-07-03T09:00:00.000Z', 'cat'),
      log('2026-07-03T18:00:00.000Z', 'dog'),
      log('2026-07-04T10:00:00.000Z', 'cat'),
      log('2026-07-04T11:00:00.000Z', 'cat'),
    ];

    const chart = buildChartData(logs);

    expect(chart.hasData).toBe(true);
    expect(chart.total).toBe(4);
    expect(chart.perDay).toEqual([
      { date: '2026-07-03', count: 2 },
      { date: '2026-07-04', count: 2 },
    ]);
    expect(chart.byLabel).toEqual([
      { label: 'cat', count: 3 },
      { label: 'dog', count: 1 },
    ]);
  });

  it('buckets missing/empty labels under (unlabeled)', () => {
    const chart = buildChartData([log('2026-07-03T09:00:00.000Z'), log('2026-07-03T10:00:00.000Z', '')]);
    expect(chart.byLabel).toEqual([{ label: '(unlabeled)', count: 2 }]);
  });

  it('reports no data for an empty log set', () => {
    const chart = buildChartData([]);
    expect(chart.hasData).toBe(false);
    expect(chart.total).toBe(0);
    expect(chart.perDay).toEqual([]);
    expect(chart.byLabel).toEqual([]);
  });
});
