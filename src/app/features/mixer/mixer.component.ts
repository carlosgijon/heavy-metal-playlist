import {
  Component, OnDestroy, AfterViewInit, ViewChildren, QueryList,
  ElementRef, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { parseScn, ScnData, ChannelData, XR_COLORS } from './scn-parser';
import { computeEqCurve, computeGeqCurve, logFreqs, fmtFreq, GEQ_FREQS } from './eq-calculator';

Chart.register(...registerables);

const FREQS = logFreqs(200);
const FREQ_LABELS = FREQS.map(f => (f >= 1000 ? `${+(f / 1000).toPrecision(2)}k` : `${Math.round(f)}`));

const CHANNEL_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#84cc16',
  '#f43f5e','#a78bfa','#34d399','#fbbf24','#60a5fa','#fb7185',
];

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mixer.component.html',
  styleUrls: ['./mixer.component.scss'],
})
export class MixerComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('miniCanvas') miniCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  readonly scnData = signal<ScnData | null>(null);
  readonly activeTab = signal<'canales' | 'combinado' | 'buses'>('canales');
  readonly selectedChannel = signal<ChannelData | null>(null);
  readonly isDragging = signal(false);

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

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.destroyAllCharts();
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
      this.scnData.set(parseScn(text, file.name));
      this.selectedChannel.set(null);
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
      else if (tab === 'canales') this.renderMiniCharts();
      else if (tab === 'buses') this.renderMiniCharts();
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

  // ── Chart rendering ─────────────────────────────────────────────────────────

  private renderMiniCharts(): void {
    this.miniCharts.forEach(c => c.destroy());
    this.miniCharts = [];

    const curves = this.activeTab() === 'buses' ? this.busCurves() : this.channelCurves();
    const canvases = this.miniCanvases.toArray();

    curves.forEach((item, i) => {
      const canvas = canvases[i]?.nativeElement;
      if (!canvas) return;
      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: FREQ_LABELS,
          datasets: [{
            data: item.curve,
            borderColor: item.color,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: { target: 'origin', above: item.color + '22', below: item.color + '22' },
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
              grid: { color: '#ffffff08' },
              border: { display: false },
            },
            y: {
              min: -18, max: 18,
              ticks: { display: false },
              grid: { color: '#ffffff08', lineWidth: 0.5 },
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

    this.detailChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: FREQ_LABELS,
        datasets: [{
          label: ch.name,
          data: curve,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          fill: { target: 'origin', above: color + '33', below: color + '33' },
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
              title: (items) => `${items[0].label} Hz`,
              label: (item) => `${(item.raw as number).toFixed(1)} dB`,
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            min: 20, max: 20000,
            ticks: {
              color: '#9ca3af',
              font: { size: 10 },
              callback: (val) => {
                const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
                return ticks.includes(+val) ? fmtFreq(+val) : '';
              },
              maxRotation: 0,
            },
            grid: { color: '#ffffff12' },
          },
          y: {
            min: -18, max: 18,
            ticks: {
              color: '#9ca3af',
              font: { size: 10 },
              callback: (val) => `${val} dB`,
              stepSize: 6,
            },
            grid: { color: '#ffffff12' },
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

    this.combinedChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: FREQ_LABELS,
        datasets: activeChannels.map(item => ({
          label: item.ch.name,
          data: item.curve,
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
            labels: { color: '#d1d5db', font: { size: 11 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              title: (items) => `${items[0].label} Hz`,
              label: (item) => `${item.dataset.label}: ${(item.raw as number).toFixed(1)} dB`,
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            min: 20, max: 20000,
            ticks: {
              color: '#9ca3af',
              font: { size: 11 },
              callback: (val) => {
                const ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
                return ticks.includes(+val) ? fmtFreq(+val) : '';
              },
              maxRotation: 0,
            },
            grid: { color: '#ffffff12' },
            title: { display: true, text: 'Frecuencia (Hz)', color: '#6b7280', font: { size: 11 } },
          },
          y: {
            min: -18, max: 18,
            ticks: {
              color: '#9ca3af',
              font: { size: 11 },
              callback: (val) => `${val} dB`,
              stepSize: 6,
            },
            grid: { color: '#ffffff12' },
            title: { display: true, text: 'Ganancia (dB)', color: '#6b7280', font: { size: 11 } },
          },
        },
      },
    });
  }

  private destroyAllCharts(): void {
    this.combinedChart?.destroy(); this.combinedChart = null;
    this.detailChart?.destroy(); this.detailChart = null;
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
