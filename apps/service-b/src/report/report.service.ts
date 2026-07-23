import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { LogsRepository } from '../logs/logs.repository';
import { MetricsService } from '../metrics/metrics.service';
import { buildChartData } from './chart-data';
import {
  ActivityRow,
  REPORT_ACTIONS,
  ReportKpis,
  buildActivityTable,
  buildKpis,
} from './report-metrics';
import { renderLine } from './chart.util';
const INK = '#111111';
const MUTED = '#555555';
const HOUR_MS = 3_600_000;

export interface ReportRangeParams {
  from: string;
  to: string;
  bucketMs?: number;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly logs: LogsRepository,
    private readonly metrics: MetricsService,
  ) {}

  async buildPdf(params: ReportRangeParams): Promise<Buffer> {
    const from = Date.parse(params.from);
    const to = Date.parse(params.to);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new BadRequestException('INVALID_RANGE');
    }
    const bucketMs = params.bucketMs ?? HOUR_MS;

    const rows = await this.logs.findAnnotateInRange(
      new Date(from).toISOString(),
      new Date(to).toISOString(),
    );
    const { byLabel } = buildChartData(rows);

    const metrics = await this.metrics.getMetrics({ from: params.from, to: params.to, bucketMs });
    const activity = buildActivityTable(metrics.series);
    const kpis = buildKpis(metrics.byType, activity, byLabel);

    return this.render(kpis, activity);
  }

  private async render(kpis: ReportKpis, activity: ActivityRow[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fontSize(20).fillColor(INK).text('Activity Report');
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor(MUTED)
      .text(`Generated ${new Date().toISOString()} · ${kpis.totalRequests} request(s)`);
    doc.moveDown();

    if (kpis.totalRequests === 0) {
      doc.fontSize(14).fillColor(INK).text('No activity for selected range');
      doc.end();
      return done;
    }

    this.renderKpis(doc, kpis);

    if (activity.length > 0) {
      const labels = activity.map((r) => new Date(r.t).toISOString().slice(5, 16).replace('T', ' '));
      const datasets = REPORT_ACTIONS.map((a) => ({
        label: cap(a),
        data: activity.map((r) => r.counts[a] ?? 0),
      }));
      const img = await renderLine(labels, datasets);
      doc.fontSize(14).fillColor(INK).text('Requests over time');
      doc.moveDown(0.3);
      doc.image(img, { fit: [500, 240] });
    }

    doc.end();
    return done;
  }

  private renderKpis(doc: PDFKit.PDFDocument, k: ReportKpis): void {
    doc.fontSize(14).fillColor(INK).text('Summary metrics');
    doc.moveDown(0.3).fontSize(10).fillColor(MUTED);
    doc.text(`Total requests: ${k.totalRequests}`);
    doc.text(REPORT_ACTIONS.map((a) => `${cap(a)} ${k.byType[a] ?? 0}`).join('  ·  '));
    if (k.busiest) {
      doc.text(
        `Busiest bucket: ${new Date(k.busiest.t).toISOString()} (${k.busiest.total} request(s))`,
      );
    }
    doc.text(
      `Unique labels: ${k.uniqueLabels}` +
        (k.topLabel ? `  ·  top: ${k.topLabel.label} (${k.topLabel.count})` : ''),
    );
    doc.moveDown();
  }
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
