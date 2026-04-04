import {
  Component, OnDestroy, AfterViewInit, ViewChildren, QueryList,
  ElementRef, signal, computed, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { parseScn, ScnData, ChannelData, XR_COLORS } from './scn-parser';
import { computeEqCurve, computeGeqCurve, logFreqs, fmtFreq } from './eq-calculator';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { ScnFile } from '../../core/models/mixer.model';
import { Gig, Venue } from '../../core/models/gig.model';

Chart.register(...registerables);

const FREQS = logFreqs(200);

/** Convert a curve (dB array) to Chart.js {x,y} points paired with FREQS */
function toPts(curve: number[]): { x: number; y: number }[] {
  return FREQS.map((f, i) => ({ x: f, y: curve[i] }));
}

const CHANNEL_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#84cc16',
  '#f43f5e','#a78bfa','#34d399','#fbbf24','#60a5fa','#fb7185',
];

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mixer.component.html',
  styleUrls: ['./mixer.component.scss'],
})
export class MixerComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('miniCanvas') miniCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);

  readonly scnData       = signal<ScnData | null>(null);
  readonly activeTab     = signal<'canales' | 'combinado' | 'buses'>('canales');
  readonly selectedChannel = signal<ChannelData | null>(null);
  readonly isDragging    = signal(false);
  readonly debugRaw      = signal<string[]>([]);

  // Library
  readonly scnFiles      = signal<ScnFile[]>([]);
  readonly gigs          = signal<Gig[]>([]);
  readonly venues        = signal<Venue[]>([]);
  readonly showLibrary   = signal(false);
  readonly showSaveModal = signal(false);
  readonly saveName      = signal('');
  readonly saveNotes     = signal('');
  readonly saveGigId     = signal('');
  readonly saveVenueId   = signal('');
  readonly saveLoading   = signal(false);
  readonly loadedFileId  = signal<string | null>(null);

  private combinedChart: Chart | null = null;
  private detailChart: Chart | null = null;
  private miniCharts: Chart[] = [];

  readonly channelCurves = computed(() => {
    const data = this.scnData();
    if (!data) return [];
    return data.inputChannels.map(ch => ({
      ch,
      curve: ch.eqMode === 'GEQ'
        ? computeGeqCurve(ch.geqBands, FREQS)
        : computeEqCurve(ch.eqBands, FREQS),
      color: CHANNEL_COLORS[(ch.number - 1) % CHANNEL_COLORS.length],
      xrColor: XR_COLORS[ch.color] ?? '#6b7280',
    }));
  });

  readonly busCurves = computed(() => {
    const data = this.scnData();
    if (!data) return [];
    return data.buses.map(ch => ({
      ch,
      curve: ch.eqMode === 'GEQ'
        ? computeGeqCurve(ch.geqBands, FREQS)
        : computeEqCurve(ch.eqBands, FREQS),
      color: CHANNEL_COLORS[(ch.number + 8) % CHANNEL_COLORS.length],
      xrColor: XR_COLORS[ch.color] ?? '#6b7280',
    }));
  });

  ngAfterViewInit() {
    this.loadLibrary();
  }

  ngOnDestroy() {
    this.destroyAllCharts();
  }

  // ── Library ─────────────────────────────────────────────────────────────────

  private async loadLibrary(): Promise<void> {
    try {
      const [files, gigs, venues] = await Promise.all([
        this.db.getScnFiles(), this.db.getGigs(), this.db.getVenues(),
      ]);
      this.scnFiles.set(files);
      this.gigs.set(gigs);
      this.venues.set(venues);
    } catch {}
  }

  toggleLibrary(): void { this.showLibrary.update(v => !v); }

  loadFromLibrary(file: ScnFile): void {
    this.destroyAllCharts();
    this.scnData.set(parseScn(file.content, file.name + '.scn'));
    this.debugRaw.set(file.content.split(/\r?\n/).slice(0, 30));
    this.loadedFileId.set(file.id);
    this.selectedChannel.set(null);
    this.showLibrary.set(false);
    setTimeout(() => {
      this.renderMiniCharts();
      if (this.activeTab() === 'combinado') this.renderCombinedChart();
    }, 50);
  }

  openSaveModal(): void {
    const data = this.scnData();
    if (!data) return;
    this.saveName.set(data.sceneName || '');
    this.saveNotes.set('');
    this.saveVenueId.set('');
    this.saveGigId.set('');
    this.showSaveModal.set(true);
  }

  closeSaveModal(): void { this.showSaveModal.set(false); }

  async confirmSave(): Promise<void> {
    const data = this.scnData();
    if (!data || !this.saveName().trim()) return;
    this.saveLoading.set(true);
    try {
      const content = (data as any)._rawContent ?? '';
      const file = await this.db.saveScnFile({
        name: this.saveName().trim(),
        content,
        notes: this.saveNotes() || undefined,
        gigId: this.saveGigId() || undefined,
        venueId: this.saveVenueId() || undefined,
      });
      this.scnFiles.update(list => [file, ...list]);
      this.loadedFileId.set(file.id);
      this.showSaveModal.set(false);
      this.toast.success('Archivo guardado en la biblioteca');
    } catch (e: any) {
      this.toast.danger(e?.toString() ?? 'Error al guardar');
    } finally {
      this.saveLoading.set(false);
    }
  }

  async deleteFromLibrary(file: ScnFile, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.db.deleteScnFile(file.id);
      this.scnFiles.update(list => list.filter(f => f.id !== file.id));
      if (this.loadedFileId() === file.id) this.loadedFileId.set(null);
      this.toast.success('Archivo eliminado');
    } catch (e: any) {
      this.toast.danger(e?.toString() ?? 'Error al eliminar');
    }
  }

  gigName(gigId: string): string {
    const gig = this.gigs().find(g => g.id === gigId);
    return gig ? (gig.venueName ?? gig.title) : gigId;
  }

  venueName(venueId: string): string {
    return this.venues().find(v => v.id === venueId)?.name ?? venueId;
  }

  onSaveGigChange(gigId: string): void {
    this.saveGigId.set(gigId);
    if (gigId) {
      const gig = this.gigs().find(g => g.id === gigId);
      if (gig?.venueId) this.saveVenueId.set(gig.venueId);
    }
  }

  // ── File handling ───────────────────────────────────────────────────────────

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.readFile(input.files[0]);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && (file.name.endsWith('.scn') || file.name.endsWith('.SCN'))) this.readFile(file);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging.set(true); }
  onDragLeave(): void { this.isDragging.set(false); }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.destroyAllCharts();
      const parsed = parseScn(text, file.name) as any;
      parsed._rawContent = text;
      this.scnData.set(parsed);
      this.loadedFileId.set(null);
      this.selectedChannel.set(null);
      // Capture first 30 lines for debug
      this.debugRaw.set(text.split(/\r?\n/).slice(0, 30));
      setTimeout(() => {
        this.renderMiniCharts();
        if (this.activeTab() === 'combinado') this.renderCombinedChart();
      }, 50);
    };
    reader.readAsText(file);
  }

  // ── Tab switching ───────────────────────────────────────────────────────────

  setTab(tab: 'canales' | 'combinado' | 'buses'): void {
    this.activeTab.set(tab);
    this.selectedChannel.set(null);
    setTimeout(() => {
      if (tab === 'combinado') this.renderCombinedChart();
      else this.renderMiniCharts();
    }, 50);
  }

  // ── Channel detail ──────────────────────────────────────────────────────────

  selectChannel(ch: ChannelData): void {
    this.selectedChannel.set(ch);
    setTimeout(() => this.renderDetailChart(ch), 50);
  }

  closeDetail(): void {
    this.selectedChannel.set(null);
    this.detailChart?.destroy();
    this.detailChart = null;
  }

  // ── Theme-aware chart colors ─────────────────────────────────────────────────

  get cardTextColor(): string {
    return this.isDarkTheme() ? '#e5e7eb' : '#111827';
  }

  private isDarkTheme(): boolean {
    const b1 = getComputedStyle(document.documentElement).getPropertyValue('--b1').trim();
    if (!b1) return true;
    const L = parseFloat(b1.split(' ')[0]);
    return isNaN(L) || L < 0.5;
  }

  private chartTextColor(): string  { return this.isDarkTheme() ? '#9ca3af' : '#374151'; }
  private chartGridColor(): string  { return this.isDarkTheme() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'; }
  private chartLegendColor(): string { return this.isDarkTheme() ? '#d1d5db' : '#1f2937'; }

  // ── Chart rendering ─────────────────────────────────────────────────────────

  private renderMiniCharts(): void {
    this.miniCharts.forEach(c => c.destroy());
    this.miniCharts = [];

    const curves = this.activeTab() === 'buses' ? this.busCurves() : this.channelCurves();
    const canvases = this.miniCanvases.toArray();
    const gridColor = this.chartGridColor();

    curves.forEach((item, i) => {
      const canvas = canvases[i]?.nativeElement;
      if (!canvas) return;

      // Adaptive y-axis: at least ±3 dB visible, padded 20%
      const rawMin = Math.min(...item.curve);
      const rawMax = Math.max(...item.curve);
      const span   = Math.max(6, rawMax - rawMin);
      const pad    = span * 0.20;
      const yMin   = Math.min(-3, rawMin - pad);
      const yMax   = Math.max( 3, rawMax + pad);

      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          datasets: [{
            data: toPts(item.curve),
            borderColor: item.color,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: { target: { value: 0 }, above: item.color + '22', below: item.color + '22' },
            tension: 0.3,
          }],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: {
              type: 'logarithmic',
              min: 20, max: 20000,
              ticks: { display: false },
              grid: { color: gridColor },
              border: { display: false },
            },
            y: {
              min: yMin, max: yMax,
              ticks: { display: false },
              grid: { color: gridColor, lineWidth: 0.5 },
              border: { display: false },
            },
          },
        },
      });
      this.miniCharts.push(chart);
    });
  }

  private renderDetailChart(ch: ChannelData): void {
    this.detailChart?.destroy();
    const canvas = document.getElementById('detailCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const curve = ch.eqMode === 'GEQ'
      ? computeGeqCurve(ch.geqBands, FREQS)
      : computeEqCurve(ch.eqBands, FREQS);

    const color = CHANNEL_COLORS[(ch.type === 'ch' ? ch.number - 1 : ch.number + 8) % CHANNEL_COLORS.length];
    const textColor = this.chartTextColor();
    const gridColor = this.chartGridColor();

    this.detailChart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: ch.name,
          data: toPts(curve),
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          fill: { target: { value: 0 }, above: color + '33', below: color + '33' },
          tension: 0.3,
        }],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) => `${fmtFreq((items[0].raw as any).x)} Hz`,
              label: (item) => `${((item.raw as any).y as number).toFixed(1)} dB`,
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            min: 20, max: 20000,
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => {
                const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
                return ticks.includes(+val) ? fmtFreq(+val) : '';
              },
              maxRotation: 0,
            },
            grid: { color: gridColor },
          },
          y: {
            min: -18, max: 18,
            ticks: { color: textColor, font: { size: 10 }, callback: (val) => `${val} dB`, stepSize: 6 },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  renderCombinedChart(): void {
    this.combinedChart?.destroy();
    const canvas = document.getElementById('combinedCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const curves = this.channelCurves();
    const activeChannels = curves.filter(c => c.ch.on && c.ch.eqEnabled);
    const textColor  = this.chartTextColor();
    const gridColor  = this.chartGridColor();
    const legendColor = this.chartLegendColor();

    this.combinedChart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: activeChannels.map(item => ({
          label: item.ch.name,
          data: toPts(item.curve),
          borderColor: item.color,
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        })),
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: legendColor, font: { size: 11 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              title: (items) => `${fmtFreq((items[0].raw as any).x)} Hz`,
              label: (item) => `${item.dataset.label}: ${((item.raw as any).y as number).toFixed(1)} dB`,
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            min: 20, max: 20000,
            ticks: {
              color: textColor, font: { size: 11 },
              callback: (val) => {
                const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
                return ticks.includes(+val) ? fmtFreq(+val) : '';
              },
              maxRotation: 0,
            },
            grid: { color: gridColor },
            title: { display: true, text: 'Frecuencia (Hz)', color: textColor, font: { size: 11 } },
          },
          y: {
            min: -18, max: 18,
            ticks: { color: textColor, font: { size: 11 }, callback: (val) => `${val} dB`, stepSize: 6 },
            grid: { color: gridColor },
            title: { display: true, text: 'Ganancia (dB)', color: textColor, font: { size: 11 } },
          },
        },
      },
    });
  }

  private destroyAllCharts(): void {
    this.combinedChart?.destroy(); this.combinedChart = null;
    this.detailChart?.destroy();   this.detailChart = null;
    this.miniCharts.forEach(c => c.destroy()); this.miniCharts = [];
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  isFinite(n: number): boolean { return Number.isFinite(n); }

  faderPct(db: number): number {
    if (!isFinite(db)) return 0;
    return Math.max(0, Math.min(100, (db + 90) / 90 * 100));
  }

  panLabel(pan: number): string {
    if (pan === 0) return 'C';
    return pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`;
  }

  xrColor(idx: number): string { return XR_COLORS[idx] ?? '#6b7280'; }

  getChannelColor(ch: ChannelData): string {
    return CHANNEL_COLORS[(ch.type === 'ch' ? ch.number - 1 : ch.number + 8) % CHANNEL_COLORS.length];
  }

  trackByKey(_: number, item: { ch: ChannelData }): string { return item.ch.key; }
  trackById(_: number, item: ScnFile): string { return item.id; }

  avgBand(curve: number[], lo: number, hi: number): number {
    const indices = FREQS.map((f, i) => ({ f, i })).filter(({ f }) => f >= lo && f <= hi).map(({ i }) => i);
    if (!indices.length) return 0;
    return indices.reduce((s, i) => s + curve[i], 0) / indices.length;
  }

  maxGain(curve: number[]): number { return Math.max(...curve); }

  peakFreq(curve: number[]): string {
    const idx = curve.indexOf(Math.max(...curve));
    return fmtFreq(FREQS[idx]) + ' Hz';
  }
}
