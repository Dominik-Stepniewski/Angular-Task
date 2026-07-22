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
  templateUrl: './ops-panel.component.html',
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
