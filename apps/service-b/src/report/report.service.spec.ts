const renderLine = jest.fn().mockResolvedValue(Buffer.from('line-png'));
const renderBar = jest.fn().mockResolvedValue(Buffer.from('bar-png'));
jest.mock('./chart.util', () => ({
  renderLine: (...a: unknown[]) => renderLine(...a),
  renderBar: (...a: unknown[]) => renderBar(...a),
}));

const image = jest.fn();
const text = jest.fn();
jest.mock('pdfkit', () =>
  jest.fn().mockImplementation(() => {
    const handlers: Record<string, (arg?: unknown) => void> = {};
    const doc: Record<string, unknown> = {
      y: 100,
      on: (ev: string, cb: (arg?: unknown) => void) => {
        handlers[ev] = cb;
        return doc;
      },
      fontSize: () => doc,
      fillColor: () => doc,
      text: (...a: unknown[]) => {
        text(...a);
        return doc;
      },
      moveDown: () => doc,
      addPage: () => doc,
      image: (...a: unknown[]) => {
        image(...a);
        return doc;
      },
      end: () => {
        handlers['data']?.(Buffer.from('%PDF-mock'));
        handlers['end']?.();
      },
    };
    return doc;
  }),
);

import { EventLog } from '@lumana/contracts';
import { LogsRepository } from '../logs/logs.repository';
import { MetricsService } from '../metrics/metrics.service';
import { ReportService } from './report.service';

const annotateLog = (timestamp: string, label: string): EventLog => ({
  id: Math.random().toString(36),
  sourceAction: 'annotate',
  type: 'annotate',
  payload: { label },
  timestamp,
});

describe('ReportService', () => {
  const range = { from: '2026-07-03T00:00:00.000Z', to: '2026-07-03T12:00:00.000Z' };

  beforeEach(() => {
    renderLine.mockClear();
    renderBar.mockClear();
    image.mockClear();
    text.mockClear();
  });

  it('renders KPIs and a requests-over-time chart when there is activity', async () => {
    const findAnnotateInRange = jest
      .fn()
      .mockResolvedValue([annotateLog('2026-07-03T09:00:00.000Z', 'cat')]);
    const getMetrics = jest.fn().mockResolvedValue({
      byType: { ingest: 0, upload: 0, search: 4, annotate: 1 },
      series: [
        { action: 'search', points: [{ t: Date.parse('2026-07-03T09:00:00.000Z'), v: 4 }] },
        { action: 'annotate', points: [{ t: Date.parse('2026-07-03T09:00:00.000Z'), v: 1 }] },
      ],
    });
    const svc = new ReportService(
      { findAnnotateInRange } as unknown as LogsRepository,
      { getMetrics } as unknown as MetricsService,
    );

    const buf = await svc.buildPdf(range);

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(getMetrics).toHaveBeenCalledWith({ from: range.from, to: range.to, bucketMs: 3_600_000 });

    expect(renderLine).toHaveBeenCalledTimes(1);
    expect(renderBar).not.toHaveBeenCalled();
    expect(image).toHaveBeenCalledTimes(1);

    const [, datasets] = renderLine.mock.calls[0] as [string[], { label: string; data: number[] }[]];
    expect(datasets.map((d) => d.label)).toEqual(['Ingest', 'Upload', 'Search', 'Annotate']);
    expect(datasets[2].data).toEqual([4]);

    const rendered = text.mock.calls.map((c) => String(c[0])).join('\n');
    expect(rendered).toContain('Total requests: 5');
    expect(rendered).not.toContain('Requests by time');
  });

  it('emits a no-activity placeholder (no chart) when the range is empty', async () => {
    const svc = new ReportService(
      { findAnnotateInRange: jest.fn().mockResolvedValue([]) } as unknown as LogsRepository,
      {
        getMetrics: jest
          .fn()
          .mockResolvedValue({ byType: { ingest: 0, upload: 0, search: 0, annotate: 0 }, series: [] }),
      } as unknown as MetricsService,
    );

    const buf = await svc.buildPdf(range);

    expect(buf.length).toBeGreaterThan(0);
    expect(renderLine).not.toHaveBeenCalled();
    expect(renderBar).not.toHaveBeenCalled();
    expect(image).not.toHaveBeenCalled();
    expect(text.mock.calls.map((c) => String(c[0])).join('\n')).toContain('No activity');
  });
});
