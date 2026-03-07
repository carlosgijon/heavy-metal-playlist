import { AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Chart, registerables } from 'chart.js';
import { MerchItem, MERCH_TYPES, calcMerchAnalysis } from '../../../core/models/merch.model';

Chart.register(...registerables);

@Component({
  selector: 'app-merch-detail-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="merch-detail-box">
      <div class="merch-detail-header">
        <div>
          <h3 class="merch-detail-title">{{ item.name }}</h3>
          <span class="badge badge-outline">{{ typeLabel }}</span>
        </div>
        <button class="btn btn-sm btn-ghost" (click)="close()">✕</button>
      </div>

      <!-- Analysis table -->
      <div class="merch-analysis">
        <table class="analysis-table">
          <tbody>
            <tr>
              <td>Coste producción por unidad</td>
              <td class="val">{{ fmt(item.productionCost) }} €</td>
            </tr>
            <tr>
              <td>PVP por unidad</td>
              <td class="val">{{ fmt(item.sellingPrice) }} €</td>
            </tr>
            <tr>
              <td>Tirada</td>
              <td class="val">{{ item.batchSize }} uds</td>
            </tr>
            <tr>
              <td>Costes fijos</td>
              <td class="val">{{ fmt(item.fixedCosts) }} €</td>
            </tr>
            <tr class="separator">
              <td>Coste total tirada</td>
              <td class="val font-bold">{{ fmt(analysis.totalCost) }} €</td>
            </tr>
            <tr>
              <td>Beneficio por unidad vendida</td>
              <td class="val" [class.text-success]="analysis.profitPerUnit > 0" [class.text-error]="analysis.profitPerUnit <= 0">
                {{ fmt(analysis.profitPerUnit) }} €
              </td>
            </tr>
            <tr>
              <td><strong>Punto de equilibrio</strong></td>
              <td class="val font-bold text-warning">
                {{ analysis.breakEvenUnits === Infinity ? '∞' : analysis.breakEvenUnits + ' uds' }}
              </td>
            </tr>
            <tr>
              <td>Beneficio vendiendo 100%</td>
              <td class="val font-bold" [class.text-success]="analysis.profitAtFull > 0" [class.text-error]="analysis.profitAtFull <= 0">
                {{ fmt(analysis.profitAtFull) }} €
              </td>
            </tr>
            <tr>
              <td>ROI vendiendo 100%</td>
              <td class="val font-bold" [class.text-success]="analysis.roiAtFull > 0">
                {{ analysis.roiAtFull.toFixed(1) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Scenarios table -->
      <div class="scenarios-section">
        <h4 class="scenarios-title">Escenarios de venta</h4>
        <table class="scenarios-table">
          <thead>
            <tr>
              <th>Escenario</th>
              <th>Uds vendidas</th>
              <th>Ingresos</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            @for (s of scenarios; track s.pct) {
              <tr>
                <td>{{ s.pct }}%</td>
                <td>{{ s.units }}</td>
                <td>{{ fmt(s.revenue) }} €</td>
                <td [class.text-success]="s.result >= 0" [class.text-error]="s.result < 0" class="font-semibold">
                  {{ s.result >= 0 ? '+' : '' }}{{ fmt(s.result) }} €
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Break-even chart -->
      <div class="chart-section">
        <h4 class="scenarios-title">Curva de beneficio</h4>
        <div class="merch-chart-wrap">
          <canvas #chartCanvas></canvas>
        </div>
      </div>

      @if (item.notes) {
        <p class="merch-notes">{{ item.notes }}</p>
      }

      <div class="modal-action mt-4">
        <button class="btn btn-ghost btn-sm" (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .merch-detail-box {
      background-color: oklch(var(--b1));
      border-radius: 1rem;
      padding: 1.5rem;
      width: 52rem;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
    }
    .merch-detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .merch-detail-title {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0 0 0.25rem;
    }
    .merch-analysis {
      background: oklch(var(--b2));
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
    }
    .analysis-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      td { padding: 0.3rem 0.4rem; }
      td.val { text-align: right; font-variant-numeric: tabular-nums; }
      tr.separator td { border-top: 1px solid oklch(var(--b3)); padding-top: 0.5rem; }
    }
    .scenarios-section { margin-bottom: 1.25rem; }
    .scenarios-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin-bottom: 0.5rem;
    }
    .scenarios-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      background: oklch(var(--b2));
      border-radius: 0.5rem;
      overflow: hidden;
      th { padding: 0.4rem 0.65rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; opacity: 0.6; }
      td { padding: 0.4rem 0.65rem; border-top: 1px solid oklch(var(--b3)); font-variant-numeric: tabular-nums; }
    }
    .chart-section { margin-bottom: 1rem; }
    .merch-chart-wrap { position: relative; height: 200px; }
    .merch-notes {
      font-size: 0.82rem;
      opacity: 0.6;
      font-style: italic;
      border-top: 1px solid oklch(var(--b3));
      padding-top: 0.75rem;
    }
  `],
})
export class MerchDetailDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly dialogRef = inject(DialogRef);
  readonly item = inject<MerchItem>(DIALOG_DATA);

  readonly Infinity = Infinity;
  readonly analysis = calcMerchAnalysis(this.item);

  get typeLabel(): string {
    return MERCH_TYPES.find(t => t.value === this.item.type)?.label ?? this.item.type;
  }

  get scenarios(): { pct: number; units: number; revenue: number; result: number }[] {
    return [25, 50, 75, 100].map(pct => {
      const units = Math.round(this.item.batchSize * pct / 100);
      const revenue = units * this.item.sellingPrice;
      const result = revenue - this.item.productionCost * units - this.item.fixedCosts;
      return { pct, units, revenue, result };
    });
  }

  private chart: Chart | null = null;

  fmt(v: number): string {
    return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngAfterViewInit(): void {
    const { batchSize, productionCost, sellingPrice, fixedCosts } = this.item;
    const step = Math.max(1, Math.round(batchSize / 40));
    const labels: number[] = [];
    const profits: number[] = [];

    for (let u = 0; u <= batchSize; u += step) {
      labels.push(u);
      profits.push(u * sellingPrice - u * productionCost - fixedCosts);
    }
    if (labels[labels.length - 1] !== batchSize) {
      labels.push(batchSize);
      profits.push(batchSize * sellingPrice - batchSize * productionCost - fixedCosts);
    }

    const be = this.analysis.breakEvenUnits;

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Beneficio/Pérdida (€)',
            data: profits,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Break-even (€0)',
            data: labels.map(() => 0),
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => `${ctx[0].label} unidades`,
              label: ctx => ` ${ctx.dataset.label}: ${this.fmt(ctx.parsed.y as number)} €`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Unidades vendidas' },
            ticks: { maxTicksLimit: 8 },
          },
          y: {
            ticks: { callback: v => `${v} €` },
          },
        },
      },
      plugins: be !== Infinity ? [{
        id: 'breakEvenLine',
        afterDraw(chart) {
          const xScale = chart.scales['x'];
          const yScale = chart.scales['y'];
          const ctx2 = chart.ctx;
          const xPx = xScale.getPixelForValue(be);
          ctx2.save();
          ctx2.setLineDash([4, 4]);
          ctx2.strokeStyle = '#f59e0b';
          ctx2.lineWidth = 1.5;
          ctx2.beginPath();
          ctx2.moveTo(xPx, yScale.top);
          ctx2.lineTo(xPx, yScale.bottom);
          ctx2.stroke();
          ctx2.fillStyle = '#f59e0b';
          ctx2.font = '11px sans-serif';
          ctx2.fillText(`BE: ${be} uds`, xPx + 4, yScale.top + 14);
          ctx2.restore();
        },
      }] : [],
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  close(): void {
    this.dialogRef.close();
  }
}
