import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronLeft, heroChevronRight, heroPlus, heroTrash } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  CalendarEvent, Gig, GIG_STATUS_BADGE, GIG_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_TYPE_DOT,
} from '../../../core/models/gig.model';
import { BandMember } from '../../../core/models/equipment.model';
import {
  CalendarEventFormComponent, CalendarEventFormData, CalendarEventFormResult,
} from './calendar-event-form/calendar-event-form.component';

interface CalCell {
  date: Date;
  iso: string;        // YYYY-MM-DD
  inMonth: boolean;
  events: CalendarEvent[];
  gigs: Gig[];
  followUps: Gig[];   // gigs whose follow_up_date falls on this day
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ heroChevronLeft, heroChevronRight, heroPlus, heroTrash })],
  template: `
    <div class="flex flex-col h-full">

    <!-- Header: month nav -->
    <div class="flex items-center justify-between mb-2">
      <button class="btn btn-sm btn-ghost" (click)="prevMonth()">
        <ng-icon name="heroChevronLeft" size="16" />
      </button>
      <h2 class="text-base font-semibold capitalize">{{ monthLabel }}</h2>
      <button class="btn btn-sm btn-ghost" (click)="nextMonth()">
        <ng-icon name="heroChevronRight" size="16" />
      </button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-2 mb-2 text-xs opacity-70">
      <span class="flex items-center gap-1"><span class="px-1 py-px rounded bg-base-100 border border-success leading-tight text-[10px]">Txt</span> Concierto confirmado</span>
      <span class="flex items-center gap-1"><span class="px-1 py-px rounded bg-base-100 border border-warning leading-tight text-[10px]">Txt</span> En gestión</span>
      <span class="flex items-center gap-1"><span class="px-1 py-px rounded bg-base-100 border border-info leading-tight text-[10px]">Txt</span> Ensayo</span>
      <span class="flex items-center gap-1"><span class="px-1 py-px rounded bg-base-100 border border-error leading-tight text-[10px]">Txt</span> No disponible</span>
      <span class="flex items-center gap-1"><span class="px-1 py-px rounded bg-base-100 border border-secondary leading-tight text-[10px]">Txt</span> Seguimiento</span>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 text-center text-xs font-semibold opacity-60 mb-1">
      @for (d of dayNames; track d) { <div>{{ d }}</div> }
    </div>

    <!-- Calendar grid: flex-1 fills remaining height; grid-auto-rows divides rows equally -->
    <div class="grid grid-cols-7 gap-px bg-base-300 rounded-lg overflow-hidden border border-base-300 flex-1 min-h-0"
         style="grid-auto-rows: 1fr">
      @for (cell of cells; track cell.iso) {
        <div class="bg-base-100 p-1 flex flex-col cursor-pointer hover:bg-base-200 transition-colors overflow-hidden min-h-0"
             [class.opacity-30]="!cell.inMonth"
             (click)="openDayPanel(cell)">
          <!-- Day number -->
          <span class="text-xs font-medium mb-0.5 leading-none flex-shrink-0"
                [class.text-primary]="cell.iso === todayIso">
            {{ cell.date.getDate() }}
          </span>
          <!-- Event chips -->
          <div class="flex flex-col gap-px overflow-hidden flex-1 min-h-0">
            @for (g of cell.gigs; track g.id) {
              <span class="text-[10px] leading-tight truncate px-1 rounded bg-base-100 border flex-shrink-0"
                    [class.border-success]="g.status === 'confirmed' || g.status === 'played'"
                    [class.border-warning]="g.status !== 'confirmed' && g.status !== 'played' && g.status !== 'cancelled'"
                    [class.border-base-300]="g.status === 'cancelled'"
                    [title]="g.title">{{ g.title }}</span>
            }
            @for (e of cell.events; track e.id) {
              <span class="text-[10px] leading-tight truncate px-1 rounded bg-base-100 border flex-shrink-0"
                    [ngClass]="chipBorder(e)"
                    [title]="e.title">{{ e.title }}</span>
            }
            @for (g of cell.followUps; track g.id) {
              <span class="text-[10px] leading-tight truncate px-1 rounded bg-base-100 border border-secondary flex-shrink-0"
                    [title]="'Seguimiento: ' + g.title">{{ g.title }}</span>
            }
          </div>
        </div>
      }
    </div>

    <!-- Day detail panel -->
    @if (selectedCell) {
      <div class="mt-4 card card-bordered bg-base-200">
        <div class="card-body p-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm">{{ formatSelectedDate() }}</h3>
            <button class="btn btn-xs btn-primary gap-1" (click)="addEvent()">
              <ng-icon name="heroPlus" size="12" /> Añadir evento
            </button>
          </div>

          @if (selectedCell.gigs.length === 0 && selectedCell.events.length === 0 && selectedCell.followUps.length === 0) {
            <p class="text-xs opacity-50">Sin eventos este día.</p>
          }

          @for (g of selectedCell.gigs; track g.id) {
            <div class="flex items-center gap-2 py-1 border-b border-base-300">
              <span class="badge badge-xs" [ngClass]="gigBadge[g.status]">{{ gigStatusLabels[g.status] }}</span>
              <span class="text-sm flex-1">{{ g.title }}</span>
              @if (g.time) { <span class="text-xs opacity-60">{{ g.time }}</span> }
            </div>
          }

          @for (e of selectedCell.events; track e.id) {
            <div class="flex items-center gap-2 py-1 border-b border-base-300">
              <span class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="dotClass(e)"></span>
              <span class="text-sm flex-1">
                {{ e.title }}
                @if (e.memberName) { <span class="opacity-60"> · {{ e.memberName }}</span> }
              </span>
              @if (e.endDate && e.endDate !== e.date) {
                <span class="text-xs opacity-60">hasta {{ formatIso(e.endDate) }}</span>
              }
              <button class="btn btn-ghost btn-xs text-error" (click)="deleteEvent(e)">
                <ng-icon name="heroTrash" size="12" />
              </button>
            </div>
          }
          @for (g of selectedCell.followUps; track g.id) {
            <div class="flex items-center gap-2 py-1 border-b border-base-300">
              <span class="w-2 h-2 rounded-full flex-shrink-0 bg-secondary"></span>
              <span class="badge badge-xs badge-secondary">Seguimiento</span>
              <span class="text-sm flex-1">{{ g.title }}</span>
              @if (g.followUpNote) {
                <span class="text-xs opacity-60 truncate max-w-32">{{ g.followUpNote }}</span>
              }
            </div>
          }
        </div>
      </div>
    }

    </div> <!-- end flex col wrapper -->
  `,
})
export class CalendarComponent implements OnInit {
  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  readonly dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly gigBadge = GIG_STATUS_BADGE;
  readonly gigStatusLabels = GIG_STATUS_LABELS;

  today = new Date();
  todayIso = this.isoDate(this.today);
  viewYear = this.today.getFullYear();
  viewMonth = this.today.getMonth(); // 0-based
  cells: CalCell[] = [];
  selectedCell: CalCell | null = null;

  private events: CalendarEvent[] = [];
  private gigs: Gig[] = [];
  members: BandMember[] = [];

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth, 1)
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      [this.events, this.gigs, this.members] = await Promise.all([
        this.db.getCalendarEvents(),
        this.db.getGigs(),
        this.db.getMembers(),
      ]);
      this.buildCells();
    } catch { this.toast.danger('Error al cargar el calendario'); }
  }

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.selectedCell = null;
    this.buildCells();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.selectedCell = null;
    this.buildCells();
  }

  buildCells(): void {
    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startDow = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    this.cells = Array.from({ length: totalCells }, (_, i) => {
      const date = new Date(this.viewYear, this.viewMonth, 1 - startDow + i);
      const iso = this.isoDate(date);
      const inMonth = date.getMonth() === this.viewMonth;

      const dayEvents = this.events.filter(e => {
        if (e.date === iso) return true;
        if (e.endDate && e.endDate > e.date) return iso >= e.date && iso <= e.endDate;
        return false;
      });
      const dayGigs = this.gigs.filter(g => g.date === iso);
      const followUps = this.gigs.filter(g => g.followUpDate === iso);

      return { date, iso, inMonth, events: dayEvents, gigs: dayGigs, followUps };
    });

    if (this.selectedCell) {
      this.selectedCell = this.cells.find(c => c.iso === this.selectedCell!.iso) ?? null;
    }
  }

  openDayPanel(cell: CalCell): void {
    this.selectedCell = this.selectedCell?.iso === cell.iso ? null : cell;
  }

  addEvent(): void {
    if (!this.selectedCell) return;
    const ref = this.dialog.open<CalendarEventFormResult>(CalendarEventFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { event: null, members: this.members, defaultDate: this.selectedCell.iso } satisfies CalendarEventFormData,
    });
    ref.closed.subscribe(async r => {
      const result = r as CalendarEventFormResult | undefined;
      if (!result) return;
      try {
        await this.db.createCalendarEvent(result);
        this.toast.success(`"${result.title}" añadido`);
        await this.load();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteEvent(event: CalendarEvent): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar evento', message: `¿Eliminar "${event.title}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteCalendarEvent(event.id);
        this.toast.warning(`"${event.title}" eliminado`);
        await this.load();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  dotClass(e: CalendarEvent): string {
    return EVENT_TYPE_DOT[e.type] ?? 'bg-base-content';
  }

  chipBorder(e: CalendarEvent): string {
    const map: Record<string, string> = {
      rehearsal: 'border-info',
      unavailable: 'border-error',
      other: 'border-warning',
    };
    return map[e.type] ?? 'border-base-content';
  }

  formatSelectedDate(): string {
    if (!this.selectedCell) return '';
    return this.selectedCell.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  formatIso(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  private isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
