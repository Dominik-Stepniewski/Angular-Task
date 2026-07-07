import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EventLog, IngestResult, Metrics, UploadResult } from '../../api/models';
import { SearchCacheService } from '../../api/search-cache.service';
import { OpsApiService } from './ops-api.service';

const isoLocal = (offsetMs: number): string =>
  new Date(Date.now() + offsetMs).toISOString().slice(0, 16);

@Component({
  selector: 'app-ops-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Ingest</h2>
      <div class="row">
        <input [value]="query()" (input)="query.set($any($event.target).value)" placeholder="query (e.g. nature)" aria-label="Ingest query" />
        <input type="number" [value]="maxRecords()" (input)="maxRecords.set(+$any($event.target).value)" aria-label="Max records" />
        <button type="button" class="btn btn--primary" [disabled]="ingesting()" (click)="runIngest()">Ingest</button>
      </div>
      @if (ingestResult(); as r) {
        <p class="result">fetched {{ r.fetched }} · inserted {{ r.inserted }} · {{ r.pages }} page(s) · {{ r.ms }}ms → {{ r.file }}</p>
      }
    </section>

    <section class="card">
      <h2>Upload dataset</h2>
      <div class="row">
        <input type="file" accept="application/json,.json" (change)="onFile($event)" aria-label="Dataset file" />
        <button type="button" class="btn btn--primary" [disabled]="!file() || uploading()" (click)="runUpload()">Upload</button>
      </div>
      @if (uploadResult(); as r) {
        <p class="result">inserted {{ r.inserted }} · failed {{ r.failedCount }}</p>
        @if (uploadReasons(); as reasons) {
          <p class="result result--warn">rejected rows: {{ reasons }}</p>
        }
      }
    </section>

    <section class="card">
      <h2>Logs</h2>
      <div class="row">
        <select [value]="logType()" (change)="logType.set($any($event.target).value)" aria-label="Log type filter">
          <option value="">all</option>
          <option value="ingest">ingest</option>
          <option value="upload">upload</option>
          <option value="search">search</option>
          <option value="annotate">annotate</option>
        </select>
        <button type="button" class="btn btn--secondary" (click)="loadLogs()">Load</button>
      </div>
      @if (logs().length > 0) {
        <div class="logs-scroll">
          <table class="logs">
            <thead><tr><th>type</th><th>time</th><th>payload</th></tr></thead>
            <tbody>
              @for (l of logs(); track l.id) {
                <tr><td>{{ l.type }}</td><td>{{ l.timestamp }}</td><td>{{ payloadOf(l) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <section class="card">
      <h2>Report</h2>
      <div class="row">
        <input type="datetime-local" [value]="from()" (input)="from.set($any($event.target).value)" aria-label="Report from" />
        <input type="datetime-local" [value]="to()" (input)="to.set($any($event.target).value)" aria-label="Report to" />
        <button type="button" class="btn btn--primary" [disabled]="downloading()" (click)="downloadReport()">Download PDF</button>
      </div>
    </section>

    <section class="card">
      <h2>Metrics</h2>
      <div class="row">
        <button type="button" class="btn btn--secondary" (click)="loadMetrics()">Refresh</button>
      </div>
      @if (metrics(); as m) {
        <div class="metrics">
          @for (k of actionKeys; track k) {
            <div class="metric"><span class="k">{{ k }}</span><span class="v">{{ m.byType[k] }}</span></div>
          }
        </div>
      }
    </section>
  `,
  styleUrl: './ops-panel.component.scss',
})
export class OpsPanelComponent {
  private readonly api = inject(OpsApiService);
  private readonly searchCache = inject(SearchCacheService);

  readonly actionKeys = ['ingest', 'upload', 'search', 'annotate'] as const;

  readonly query = signal('nature');
  readonly maxRecords = signal(100);
  readonly ingesting = signal(false);
  readonly ingestResult = signal<IngestResult | null>(null);

  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadResult = signal<UploadResult | null>(null);
  readonly uploadReasons = computed(() => {
    const failed = this.uploadResult()?.failed ?? [];
    if (failed.length === 0) return '';
    const counts = new Map<string, number>();
    for (const f of failed) counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1);
    return [...counts.entries()].map(([reason, n]) => `${reason} ×${n}`).join(', ');
  });

  readonly logType = signal('');
  readonly logs = signal<EventLog[]>([]);

  readonly from = signal(isoLocal(-7 * 24 * 3600_000));
  readonly to = signal(isoLocal(0));
  readonly downloading = signal(false);

  readonly metrics = signal<Metrics | null>(null);

  runIngest(): void {
    this.ingesting.set(true);
    this.api.ingest(this.query(), this.maxRecords()).subscribe({
      next: (r) => {
        this.ingestResult.set(r);
        if (r.inserted > 0) this.searchCache.clear();
      },
      complete: () => this.ingesting.set(false),
      error: () => this.ingesting.set(false),
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  runUpload(): void {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.api.upload(f).subscribe({
      next: (r) => {
        this.uploadResult.set(r);
        if (r.inserted > 0) this.searchCache.clear();
      },
      complete: () => this.uploading.set(false),
      error: () => this.uploading.set(false),
    });
  }

  loadLogs(): void {
    this.api.logs({ type: this.logType() || undefined, limit: 50 }).subscribe((res) => this.logs.set(res.data));
  }

  payloadOf(l: EventLog): string {
    return JSON.stringify(l.payload);
  }

  downloadReport(): void {
    this.downloading.set(true);
    this.api.reportPdf(this.toIso(this.from()), this.toIso(this.to())).subscribe({
      next: (blob) => this.triggerDownload(blob, 'annotation-report.pdf'),
      complete: () => this.downloading.set(false),
      error: () => this.downloading.set(false),
    });
  }

  loadMetrics(): void {
    this.api.metrics(this.toIso(this.from()), this.toIso(this.to())).subscribe((m) => this.metrics.set(m));
  }

  private toIso(local: string): string {
    return new Date(local).toISOString();
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
