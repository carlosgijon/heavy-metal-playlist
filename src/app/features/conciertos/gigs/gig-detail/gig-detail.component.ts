import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input,
  OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { Chart, registerables } from 'chart.js';
import {
  Gig, GigSummary, GigSummaryTransaction, Venue,
  GigStatus, GIG_STATUS_LABELS, GIG_STATUS_BADGE,
  GigChecklist, ChecklistItem, GigContact,
  GigContactType, GIG_CONTACT_TYPE_LABELS, GIG_CONTACT_TYPES,
  CHECKLIST_CATEGORY_LABELS, ChecklistCategory,
} from '../../../../core/models/gig.model';
import { PlaylistWithStats } from '../../../../core/models/song.model';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../../../core/models/finance.model';
import { DatabaseService } from '../../../../core/services/database.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/confirm-dialog/confirm-dialog.component';
import { TransactionFormComponent, TransactionFormData } from '../../../finanzas/transaction-form/transaction-form.component';
import { GigFormComponent, GigFormData, GigFormResult } from '../gig-form/gig-form.component';

Chart.register(...registerables);

type DetailTab = 'info' | 'resumen' | 'transacciones' | 'merch' | 'contactos' | 'checklist';

@Component({
  selector: 'app-gig-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="flex items-center gap-3 min-w-0">
          <button class="btn btn-ghost btn-sm gap-1" (click)="back.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Conciertos
          </button>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title truncate">{{ gig.title }}</h1>
              <span class="badge badge-sm" [ngClass]="statusBadge[gig.status]">
                {{ statusLabels[gig.status] }}
              </span>
            </div>
            @if (gig.date || gig.venueName) {
              <p class="page-subtitle">
                {{ gig.date ? formatDate(gig.date) : '' }}
                {{ gig.date && gig.venueName ? ' · ' : '' }}
                {{ gig.venueName ?? '' }}
              </p>
            }
          </div>
        </div>
        <div class="page-header-actions">
          @if (loading) { <span class="loading loading-spinner loading-sm"></span> }
          <button class="btn btn-sm btn-outline gap-1" (click)="openEdit()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-bordered mb-5">
        @for (t of tabs; track t.key) {
          <button role="tab" class="tab" [class.tab-active]="tab === t.key"
            (click)="switchTab(t.key)">
            {{ t.label }}
            @if (t.key === 'transacciones' && summary) {
              <span class="badge badge-xs ml-1">{{ summary.transactions.length }}</span>
            }
            @if (t.key === 'merch' && summary) {
              <span class="badge badge-xs badge-success ml-1">{{ summary.merchSales.length }}</span>
            }
          </button>
        }
      </div>

      <!-- ── TAB: INFO ──────────────────────────────────────── -->
      @if (tab === 'info') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Left column: dates & logistics -->
          <div class="card bg-base-200 p-5 space-y-3">
            <h3 class="font-bold text-base opacity-70">Logística</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="opacity-50">Fecha</span><p class="font-medium mt-0.5">{{ gig.date ? formatDate(gig.date) : '—' }}</p></div>
              <div><span class="opacity-50">Hora actuación</span><p class="font-medium mt-0.5">{{ gig.time ?? '—' }}</p></div>
              <div><span class="opacity-50">Load-in</span><p class="font-medium mt-0.5">{{ gig.loadInTime ?? '—' }}</p></div>
              <div><span class="opacity-50">Soundcheck</span><p class="font-medium mt-0.5">{{ gig.soundcheckTime ?? '—' }}</p></div>
              <div><span class="opacity-50">Caché</span><p class="font-medium mt-0.5">{{ gig.pay ?? '—' }}</p></div>
              <div><span class="opacity-50">Asistentes</span><p class="font-medium mt-0.5">{{ gig.attendance ?? '—' }}</p></div>
              <div><span class="opacity-50">Setlist</span>
                <p class="font-medium mt-0.5">{{ gigSetlistName }}</p>
              </div>
            </div>
          </div>
          <!-- Right column: notes -->
          <div class="card bg-base-200 p-5 space-y-3">
            <h3 class="font-bold text-base opacity-70">Notas</h3>
            @if (gig.notes) {
              <p class="text-sm whitespace-pre-wrap">{{ gig.notes }}</p>
            } @else {
              <p class="text-sm opacity-40 italic">Sin notas</p>
            }
          </div>
        </div>
      }

      <!-- ── TAB: RESUMEN ───────────────────────────────────── -->
      @if (tab === 'resumen') {
        @if (!summary) {
          <div class="flex justify-center py-16"><span class="loading loading-spinner loading-lg"></span></div>
        } @else {
          <!-- KPI cards -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="stat bg-base-200 rounded-xl p-4">
              <div class="stat-title text-xs">Ingresos del bolo</div>
              <div class="stat-value text-lg text-success">{{ fmt(gigIncome) }} €</div>
            </div>
            <div class="stat bg-base-200 rounded-xl p-4">
              <div class="stat-title text-xs">Gastos del bolo</div>
              <div class="stat-value text-lg text-error">{{ fmt(gigExpenses) }} €</div>
            </div>
            <div class="stat bg-base-200 rounded-xl p-4">
              <div class="stat-title text-xs">Balance</div>
              <div class="stat-value text-lg" [class.text-success]="gigBalance >= 0" [class.text-error]="gigBalance < 0">
                {{ gigBalance >= 0 ? '+' : '' }}{{ fmt(gigBalance) }} €
              </div>
            </div>
          </div>
          <!-- Charts -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="card bg-base-200 p-4">
              <h3 class="font-semibold text-sm opacity-70 mb-2">Ingresos vs Gastos por categoría</h3>
              <div style="height:220px"><canvas #barCanvas></canvas></div>
            </div>
            <div class="card bg-base-200 p-4">
              <h3 class="font-semibold text-sm opacity-70 mb-2">Distribución de gastos</h3>
              <div style="height:220px"><canvas #donutCanvas></canvas></div>
            </div>
          </div>

          @if (summary.merchSales.length > 0) {
            <div class="card bg-base-200 p-4 mt-5">
              <h3 class="font-semibold text-sm opacity-70 mb-2">Merch vendido en este concierto</h3>
              <div class="stat-value text-lg text-success">{{ fmt(gigMerchTotal) }} €</div>
              <p class="text-sm opacity-60">{{ summary.merchSales.length }} venta(s)</p>
            </div>
          }
        }
      }

      <!-- ── TAB: TRANSACCIONES ─────────────────────────────── -->
      @if (tab === 'transacciones') {
        <div class="flex justify-end mb-3">
          <button class="btn btn-sm btn-primary gap-1" (click)="openTransactionForm()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Añadir transacción
          </button>
        </div>
        @if (!summary || summary.transactions.length === 0) {
          <p class="text-center opacity-50 py-8">Sin transacciones asociadas a este concierto</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm w-full">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th class="text-right">Importe</th><th></th></tr>
              </thead>
              <tbody>
                @for (t of summary.transactions; track t.id) {
                  <tr>
                    <td class="whitespace-nowrap text-sm">{{ formatDate(t.date) }}</td>
                    <td>
                      <span class="badge badge-sm" [class.badge-success]="t.type === 'income'" [class.badge-error]="t.type === 'expense'">
                        {{ t.type === 'income' ? 'Ingreso' : 'Gasto' }}
                      </span>
                    </td>
                    <td class="text-sm">{{ getCategoryLabel(t.type, t.category) }}</td>
                    <td class="text-sm opacity-70">{{ t.description ?? '—' }}</td>
                    <td class="text-right font-mono font-semibold"
                      [class.text-success]="t.type === 'income'"
                      [class.text-error]="t.type === 'expense'">
                      {{ t.type === 'income' ? '+' : '-' }}{{ fmt(t.amount) }} €
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-xs text-error" (click)="deleteTransaction(t)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- ── TAB: MERCH ─────────────────────────────────────── -->
      @if (tab === 'merch') {
        @if (!summary || summary.merchSales.length === 0) {
          <p class="text-center opacity-50 py-8">Sin ventas de merch asociadas a este concierto</p>
          <p class="text-center text-sm opacity-40">Las ventas del TPV se asocian a un concierto cuando lo tienes activo en el TPV de Merch</p>
        } @else {
          <!-- Summary card -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            <div class="stat bg-base-200 rounded-xl p-4">
              <div class="stat-title text-xs">Total merch</div>
              <div class="stat-value text-lg text-success">{{ fmt(gigMerchTotal) }} €</div>
            </div>
            <div class="stat bg-base-200 rounded-xl p-4">
              <div class="stat-title text-xs">Nº de ventas</div>
              <div class="stat-value text-lg">{{ summary.merchSales.length }}</div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm w-full">
              <thead>
                <tr><th>Fecha</th><th>Descripción</th><th class="text-right">Importe</th></tr>
              </thead>
              <tbody>
                @for (s of summary.merchSales; track s.id) {
                  <tr>
                    <td class="whitespace-nowrap text-sm">{{ formatDate(s.date) }}</td>
                    <td class="text-sm opacity-70">{{ s.description ?? '—' }}</td>
                    <td class="text-right font-mono font-semibold text-success">+{{ fmt(s.amount) }} €</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- ── TAB: CONTACTOS ─────────────────────────────────── -->
      @if (tab === 'contactos') {
        <div class="flex justify-end mb-3">
          <button class="btn btn-sm btn-primary gap-1" (click)="openAddContact()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Añadir contacto
          </button>
        </div>

        <!-- Add contact form -->
        @if (showContactForm) {
          <div class="card bg-base-200 p-4 mb-4">
            <h4 class="font-semibold text-sm mb-3">Nuevo registro de contacto</h4>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Fecha</span></label>
                <input class="input input-bordered input-sm" type="date" [(ngModel)]="contactForm.date" />
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Tipo</span></label>
                <select class="select select-bordered select-sm" [(ngModel)]="contactForm.contactType">
                  @for (t of contactTypes; track t) {
                    <option [value]="t">{{ contactTypeLabels[t] }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-control mb-3">
              <label class="label py-1"><span class="label-text text-xs">Notas</span></label>
              <textarea class="textarea textarea-bordered textarea-sm" rows="2"
                [(ngModel)]="contactForm.notes" placeholder="Detalles del contacto..."></textarea>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" (click)="showContactForm = false">Cancelar</button>
              <button class="btn btn-primary btn-sm" (click)="saveContact()">Guardar</button>
            </div>
          </div>
        }

        @if (contacts.length === 0 && !showContactForm) {
          <p class="text-center opacity-50 py-8">Sin registros de seguimiento</p>
        } @else {
          <div class="space-y-2">
            @for (c of contacts; track c.id) {
              <div class="card bg-base-200 p-4 flex-row items-start gap-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="badge badge-sm badge-outline">{{ contactTypeLabels[c.contactType] }}</span>
                    <span class="text-sm opacity-60">{{ formatDate(c.date) }}</span>
                  </div>
                  @if (c.notes) { <p class="text-sm opacity-80">{{ c.notes }}</p> }
                </div>
                <button class="btn btn-ghost btn-xs text-error" (click)="deleteContact(c)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        }
      }

      <!-- ── TAB: CHECKLIST ─────────────────────────────────── -->
      @if (tab === 'checklist') {
        <div class="flex justify-end mb-3 gap-2">
          <button class="btn btn-sm btn-outline gap-1" (click)="openAddChecklist()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" width="14" height="14" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva checklist
          </button>
        </div>

        @if (checklists.length === 0) {
          <p class="text-center opacity-50 py-8">Sin checklists</p>
        } @else {
          <div class="space-y-4">
            @for (cl of checklists; track cl.id) {
              <div class="card bg-base-200 p-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold">{{ cl.name }}</h4>
                  <div class="flex gap-1">
                    <button class="btn btn-xs btn-ghost" title="Reiniciar" (click)="resetChecklist(cl)">↺</button>
                    <button class="btn btn-xs btn-ghost text-error" (click)="deleteChecklist(cl)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" width="12" height="12" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Items -->
                <div class="space-y-1 mb-3">
                  @for (item of (checklistItems[cl.id] || []); track item.id) {
                    <div class="flex items-center gap-2">
                      <input type="checkbox" class="checkbox checkbox-sm" [checked]="item.done"
                        (change)="toggleItem(cl.id, item)" />
                      <span class="text-sm flex-1" [class.line-through]="item.done" [class.opacity-40]="item.done">
                        {{ item.text }}
                      </span>
                      <span class="badge badge-xs badge-outline">{{ categoryLabels[item.category] }}</span>
                      <button class="btn btn-ghost btn-xs text-error opacity-50 hover:opacity-100"
                        (click)="deleteItem(cl.id, item)">×</button>
                    </div>
                  }
                </div>

                <!-- Add item -->
                <div class="flex gap-2">
                  <select class="select select-bordered select-xs w-28"
                    [(ngModel)]="newItemCategory[cl.id]">
                    @for (cat of checklistCategories; track cat) {
                      <option [value]="cat">{{ categoryLabels[cat] }}</option>
                    }
                  </select>
                  <input class="input input-bordered input-xs flex-1"
                    [(ngModel)]="newItemText[cl.id]"
                    placeholder="Añadir tarea..."
                    (keydown.enter)="addItem(cl.id)" />
                  <button class="btn btn-xs btn-primary" (click)="addItem(cl.id)">+</button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class GigDetailComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() gig!: Gig;
  @Input() venues: Venue[] = [];
  @Input() playlists: PlaylistWithStats[] = [];
  @Output() back = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  @ViewChild('barCanvas') barCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  tab: DetailTab = 'info';
  loading = false;
  summary: GigSummary | null = null;

  // Contacts
  contacts: GigContact[] = [];
  showContactForm = false;
  contactForm = { date: new Date().toISOString().slice(0, 10), contactType: 'call' as GigContactType, notes: '' };

  // Checklists
  checklists: GigChecklist[] = [];
  checklistItems: Record<string, ChecklistItem[]> = {};
  newItemText: Record<string, string> = {};
  newItemCategory: Record<string, ChecklistCategory> = {};

  readonly tabs: { key: DetailTab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'resumen', label: 'Resumen' },
    { key: 'transacciones', label: 'Transacciones' },
    { key: 'merch', label: 'Merch' },
    { key: 'contactos', label: 'Contactos' },
    { key: 'checklist', label: 'Checklist' },
  ];

  readonly statusLabels = GIG_STATUS_LABELS;
  readonly statusBadge = GIG_STATUS_BADGE;
  readonly contactTypes = GIG_CONTACT_TYPES;
  readonly contactTypeLabels = GIG_CONTACT_TYPE_LABELS;
  readonly checklistCategories: ChecklistCategory[] = ['equipo', 'logistica', 'documentos', 'otro'];
  readonly categoryLabels = CHECKLIST_CATEGORY_LABELS;

  private barChart: Chart | null = null;
  private donutChart: Chart | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['gig'] && !changes['gig'].firstChange) {
      await this.loadAll();
    }
  }

  ngAfterViewInit(): void {
    if (this.tab === 'resumen' && this.summary) {
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.donutChart?.destroy();
  }

  private async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const [summary, contacts, checklists] = await Promise.all([
        this.db.getGigSummary(this.gig.id),
        this.db.getGigContacts(this.gig.id),
        this.db.getGigChecklists(this.gig.id),
      ]);
      this.summary = summary;
      this.contacts = contacts;
      this.checklists = checklists;

      // Load items for each checklist
      for (const cl of checklists) {
        this.newItemText[cl.id] ??= '';
        this.newItemCategory[cl.id] ??= 'otro';
        this.checklistItems[cl.id] = await this.db.getChecklistItems(cl.id);
      }
    } catch {
      this.toast.danger('Error al cargar los datos del concierto');
    } finally {
      this.loading = false;
      if (this.tab === 'resumen') setTimeout(() => this.buildCharts(), 0);
    }
  }

  async switchTab(t: DetailTab): Promise<void> {
    this.tab = t;
    if (t === 'resumen' && this.summary) {
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  // ── Computed ─────────────────────────────────────────────────────────

  get gigSetlistName(): string {
    if (!this.gig.setlistId) return '—';
    return this.playlists.find(p => p.id === this.gig.setlistId)?.name ?? '—';
  }

  get gigIncome(): number {
    return this.summary?.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0) ?? 0;
  }

  get gigExpenses(): number {
    return this.summary?.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0) ?? 0;
  }

  get gigBalance(): number { return this.gigIncome - this.gigExpenses; }

  get gigMerchTotal(): number {
    return this.summary?.merchSales.reduce((a, s) => a + s.amount, 0) ?? 0;
  }

  // ── Formatters ───────────────────────────────────────────────────────

  formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  fmt(v: number): string {
    return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getCategoryLabel(type: string, category: string): string {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return cats.find(c => c.value === category)?.label ?? category;
  }

  // ── Edit gig ─────────────────────────────────────────────────────────

  openEdit(): void {
    const ref = this.dialog.open<GigFormResult>(GigFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { gig: this.gig, venues: this.venues, playlists: this.playlists } satisfies GigFormData,
    });
    ref.closed.subscribe(async r => {
      const result = r as GigFormResult | undefined;
      if (!result) return;
      try {
        await this.db.updateGig({ ...result, id: this.gig.id, createdAt: this.gig.createdAt });
        this.toast.success(`"${result.title}" actualizado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  // ── Transactions ─────────────────────────────────────────────────────

  openTransactionForm(): void {
    const ref = this.dialog.open<any>(TransactionFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: {
        transaction: null,
        gigs: [this.gig],
        lockedGigId: this.gig.id,
      } satisfies TransactionFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        await this.db.createTransaction({ ...result, gigId: this.gig.id });
        this.toast.success('Transacción añadida');
        await this.loadAll();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteTransaction(t: GigSummaryTransaction): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar transacción', message: `¿Eliminar esta transacción de ${this.fmt(t.amount)} €?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteTransaction(t.id);
        this.toast.warning('Transacción eliminada');
        await this.loadAll();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  // ── Contacts ─────────────────────────────────────────────────────────

  openAddContact(): void { this.showContactForm = true; }

  async saveContact(): Promise<void> {
    try {
      const c = await this.db.createGigContact({ gigId: this.gig.id, ...this.contactForm });
      this.contacts = [c, ...this.contacts];
      this.showContactForm = false;
      this.contactForm = { date: new Date().toISOString().slice(0, 10), contactType: 'call', notes: '' };
    } catch { this.toast.danger('Error al guardar el contacto'); }
  }

  deleteContact(c: GigContact): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar contacto', message: '¿Eliminar este registro?', confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteGigContact(c.id);
        this.contacts = this.contacts.filter(x => x.id !== c.id);
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  // ── Checklists ───────────────────────────────────────────────────────

  openAddChecklist(): void {
    const name = prompt('Nombre de la nueva checklist:');
    if (!name?.trim()) return;
    this.db.createGigChecklist({ gigId: this.gig.id, name: name.trim() }).then(cl => {
      this.checklists = [...this.checklists, cl];
      this.checklistItems[cl.id] = [];
      this.newItemText[cl.id] = '';
      this.newItemCategory[cl.id] = 'otro';
    }).catch(() => this.toast.danger('Error al crear checklist'));
  }

  deleteChecklist(cl: GigChecklist): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar checklist', message: `¿Eliminar "${cl.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteGigChecklistById(cl.id);
        this.checklists = this.checklists.filter(c => c.id !== cl.id);
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  async resetChecklist(cl: GigChecklist): Promise<void> {
    try {
      await this.db.resetChecklistItems(cl.id);
      this.checklistItems[cl.id] = (this.checklistItems[cl.id] ?? []).map(i => ({ ...i, done: false }));
    } catch { this.toast.danger('Error al reiniciar'); }
  }

  async addItem(checklistId: string): Promise<void> {
    const text = this.newItemText[checklistId]?.trim();
    if (!text) return;
    const category = this.newItemCategory[checklistId] ?? 'otro';
    try {
      const item = await this.db.createChecklistItem({ checklistId, text, category, sortOrder: (this.checklistItems[checklistId]?.length ?? 0) });
      this.checklistItems[checklistId] = [...(this.checklistItems[checklistId] ?? []), item];
      this.newItemText[checklistId] = '';
    } catch { this.toast.danger('Error al añadir'); }
  }

  async toggleItem(checklistId: string, item: ChecklistItem): Promise<void> {
    try {
      const updated = await this.db.updateChecklistItem(item.id, { ...item, done: !item.done });
      this.checklistItems[checklistId] = (this.checklistItems[checklistId] ?? []).map(i => i.id === updated.id ? updated : i);
    } catch { this.toast.danger('Error al actualizar'); }
  }

  async deleteItem(checklistId: string, item: ChecklistItem): Promise<void> {
    try {
      await this.db.deleteChecklistItemById(item.id);
      this.checklistItems[checklistId] = (this.checklistItems[checklistId] ?? []).filter(i => i.id !== item.id);
    } catch { this.toast.danger('Error al eliminar'); }
  }

  // ── Charts ───────────────────────────────────────────────────────────

  private buildCharts(): void {
    if (!this.summary) return;
    if (!this.barCanvas?.nativeElement || !this.donutCanvas?.nativeElement) return;

    this.barChart?.destroy();
    this.donutChart?.destroy();

    // Bar: income categories vs expense categories
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    this.summary.transactions.forEach(t => {
      if (t.type === 'income') incomeByCategory[t.category] = (incomeByCategory[t.category] ?? 0) + t.amount;
      else expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.amount;
    });

    const allLabels = [...new Set([...Object.keys(incomeByCategory), ...Object.keys(expenseByCategory)])];
    const labelNames = allLabels.map(k => {
      const ic = INCOME_CATEGORIES.find(c => c.value === k);
      const ec = EXPENSE_CATEGORIES.find(c => c.value === k);
      return ic?.label ?? ec?.label ?? k;
    });

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labelNames,
        datasets: [
          { label: 'Ingresos', data: allLabels.map(k => incomeByCategory[k] ?? 0), backgroundColor: 'rgba(34,197,94,0.7)', borderColor: 'rgb(34,197,94)', borderWidth: 1, borderRadius: 4 },
          { label: 'Gastos', data: allLabels.map(k => expenseByCategory[k] ?? 0), backgroundColor: 'rgba(239,68,68,0.7)', borderColor: 'rgb(239,68,68)', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${this.fmt(ctx.parsed.y as number)} €` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => `${v} €` } } },
      },
    });

    // Donut: expenses only
    const expenseCats = Object.entries(expenseByCategory);
    if (expenseCats.length > 0) {
      this.donutChart = new Chart(this.donutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: expenseCats.map(([k]) => EXPENSE_CATEGORIES.find(c => c.value === k)?.label ?? k),
          datasets: [{ data: expenseCats.map(([, v]) => v), backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899'], borderWidth: 2 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${this.fmt(ctx.parsed as number)} €` } } },
        },
      });
    }
  }
}
