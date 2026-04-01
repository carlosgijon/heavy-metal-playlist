import { Component, inject, OnInit, AfterViewInit, ViewChild, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrash, heroXMark, heroMapPin, heroClock, heroBanknotes, heroUserCircle, heroCalendarDays } from '@ng-icons/heroicons/outline';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import esLocale from '@fullcalendar/core/locales/es';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  CalendarEvent, Gig, GIG_STATUS_BADGE, GIG_STATUS_LABELS, EVENT_TYPE_LABELS,
} from '../../../core/models/gig.model';
import { BandMember } from '../../../core/models/equipment.model';
import {
  CalendarEventFormComponent, CalendarEventFormData, CalendarEventFormResult,
} from './calendar-event-form/calendar-event-form.component';

interface Popover {
  x: number;
  y: number;
  kind: 'gig' | 'calEvent' | 'followup';
  gig?: Gig;
  calEvent?: CalendarEvent;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, NgIconComponent],
  providers: [provideIcons({ heroTrash, heroXMark, heroMapPin, heroClock, heroBanknotes, heroUserCircle, heroCalendarDays })],
  template: `
    <div #wrapper class="fc-host-wrapper" (click)="closePopover()">
      <full-calendar #fullcal [options]="calendarOptions"></full-calendar>

      <!-- ── Legend ─────────────────────────────────────────────────────── -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1 pb-2 text-xs opacity-60">
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#22c55e"></span>Confirmado
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#f59e0b"></span>En gestión
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#3b82f6"></span>Ensayo
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#ef4444"></span>No disponible
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#a855f7"></span>Seguimiento
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:#eab308"></span>Otro
        </span>
      </div>
    </div>

    <!-- ── Event detail popover ───────────────────────────────────────────── -->
    @if (popover) {
      <div class="card bg-base-200 border border-base-300 shadow-2xl"
           style="position:fixed; z-index:9999; min-width:220px; max-width:290px;"
           [style.left.px]="popover.x"
           [style.top.px]="popover.y"
           (click)="$event.stopPropagation()">
        <div class="card-body p-3 gap-1.5">

          <!-- Close button -->
          <button class="btn btn-xs btn-ghost btn-circle absolute top-1.5 right-1.5"
                  (click)="closePopover()">
            <ng-icon name="heroXMark" size="13" />
          </button>

          <!-- GIG -->
          @if (popover.kind === 'gig' && popover.gig; as gig) {
            <div class="flex items-center gap-2 pr-6 flex-wrap">
              <span class="badge badge-sm" [ngClass]="gigBadge[gig.status]">
                {{ gigStatusLabels[gig.status] }}
              </span>
              <span class="font-semibold text-sm leading-tight">{{ gig.title }}</span>
            </div>
            @if (gig.time) {
              <p class="flex items-center gap-1.5 text-xs opacity-60">
                <ng-icon name="heroClock" size="12" />{{ gig.time }}
              </p>
            }
            @if (gig.venueName) {
              <p class="flex items-center gap-1.5 text-xs opacity-60">
                <ng-icon name="heroMapPin" size="12" />{{ gig.venueName }}
              </p>
            }
            @if (gig.pay) {
              <p class="flex items-center gap-1.5 text-xs opacity-60">
                <ng-icon name="heroBanknotes" size="12" />{{ gig.pay }}
              </p>
            }
            @if (gig.notes) {
              <p class="text-xs opacity-50 line-clamp-2 mt-0.5">{{ gig.notes }}</p>
            }
          }

          <!-- CALENDAR EVENT -->
          @if (popover.kind === 'calEvent' && popover.calEvent; as ev) {
            <div class="flex items-center gap-2 pr-6">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    [style.background]="evtDotColor(ev)"></span>
              <span class="font-semibold text-sm leading-tight">{{ ev.title }}</span>
            </div>
            <p class="text-xs opacity-55">{{ typeLabels[ev.type] }}</p>
            @if (ev.memberName) {
              <p class="flex items-center gap-1.5 text-xs opacity-60">
                <ng-icon name="heroUserCircle" size="12" />{{ ev.memberName }}
              </p>
            }
            @if (ev.endDate && ev.endDate !== ev.date) {
              <p class="flex items-center gap-1.5 text-xs opacity-55">
                <ng-icon name="heroCalendarDays" size="12" />hasta {{ formatIso(ev.endDate) }}
              </p>
            }
            @if (ev.notes) {
              <p class="text-xs opacity-50 line-clamp-2 mt-0.5">{{ ev.notes }}</p>
            }
            <div class="card-actions justify-end mt-1">
              <button class="btn btn-xs btn-error btn-outline gap-1" (click)="deleteEvent(ev)">
                <ng-icon name="heroTrash" size="11" />Eliminar
              </button>
            </div>
          }

          <!-- FOLLOW-UP -->
          @if (popover.kind === 'followup' && popover.gig; as gig) {
            <div class="flex items-center gap-2 pr-6">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-secondary"></span>
              <span class="font-semibold text-sm leading-tight">{{ gig.title }}</span>
            </div>
            <p class="text-xs opacity-55">Seguimiento pendiente</p>
            @if (gig.followUpNote) {
              <p class="text-xs opacity-50 line-clamp-2 mt-0.5">{{ gig.followUpNote }}</p>
            }
          }

        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .fc-host-wrapper {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class CalendarComponent implements OnInit, AfterViewInit {
  @ViewChild('fullcal')  private fullcal!: FullCalendarComponent;
  @ViewChild('wrapper')  private wrapperRef!: ElementRef<HTMLDivElement>;

  private dialog = inject(Dialog);
  private db     = inject(DatabaseService);
  private toast  = inject(ToastService);

  readonly gigBadge        = GIG_STATUS_BADGE;
  readonly gigStatusLabels = GIG_STATUS_LABELS;
  readonly typeLabels      = EVENT_TYPE_LABELS;

  popover: Popover | null = null;

  private events: CalendarEvent[] = [];
  private gigs:   Gig[]           = [];
  members:        BandMember[]    = [];

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    firstDay: 1,
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,multiMonthYear,listMonth',
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      list:  'Lista',
      year:  'Año',
    },
    multiMonthMaxColumns: 3,
    dayMaxEvents: 3,
    height: 'auto',
    expandRows: false,
    events: [],
    eventClick:   (arg) => this.onEventClick(arg),
    dateClick:    (arg) => this.onDateClick(arg),
    moreLinkText: (n)   => `+${n} más`,
    eventDisplay: 'block',
  };

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.applyHeight(), 0);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.applyHeight();
  }

  private applyHeight(): void {
    const wrapper = this.wrapperRef?.nativeElement;
    if (!wrapper) return;
    // 40px = legend row height
    const h = wrapper.clientHeight - 40;
    if (h > 200) {
      this.calendarOptions = { ...this.calendarOptions, height: h, expandRows: true };
    }
  }

  private async load(): Promise<void> {
    try {
      [this.events, this.gigs, this.members] = await Promise.all([
        this.db.getCalendarEvents(),
        this.db.getGigs(),
        this.db.getMembers(),
      ]);
      this.calendarOptions = { ...this.calendarOptions, events: this.buildEvents() };
    } catch {
      this.toast.danger('Error al cargar el calendario');
    }
  }

  private buildEvents(): EventInput[] {
    const result: EventInput[] = [];

    for (const gig of this.gigs) {
      if (!gig.date) continue;
      const c = this.gigColors(gig);
      result.push({
        id: `gig-${gig.id}`,
        title: gig.title,
        start: gig.date,
        allDay: true,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: '#fff',
        extendedProps: { kind: 'gig', data: gig },
      });
    }

    for (const ev of this.events) {
      const c   = this.evtColors(ev);
      const end = ev.endDate && ev.endDate !== ev.date ? this.addOneDay(ev.endDate) : undefined;
      result.push({
        id: `evt-${ev.id}`,
        title: ev.title,
        start: ev.date,
        end,
        allDay: true,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: '#fff',
        extendedProps: { kind: 'calEvent', data: ev },
      });
    }

    for (const gig of this.gigs) {
      if (!gig.followUpDate) continue;
      result.push({
        id: `fu-${gig.id}`,
        title: gig.title,
        start: gig.followUpDate,
        allDay: true,
        backgroundColor: '#a855f7',
        borderColor: '#9333ea',
        textColor: '#fff',
        extendedProps: { kind: 'followup', data: gig },
      });
    }

    return result;
  }

  private gigColors(gig: Gig): { bg: string; border: string } {
    const map: Partial<Record<string, { bg: string; border: string }>> = {
      confirmed:   { bg: '#22c55e', border: '#16a34a' },
      played:      { bg: '#6b7280', border: '#4b5563' },
      cobrado:     { bg: '#10b981', border: '#059669' },
      cancelled:   { bg: '#9ca3af', border: '#6b7280' },
      lead:        { bg: '#8b5cf6', border: '#7c3aed' },
      contacted:   { bg: '#f59e0b', border: '#d97706' },
      negotiating: { bg: '#f59e0b', border: '#d97706' },
      hold:        { bg: '#fb923c', border: '#ea580c' },
    };
    return map[gig.status] ?? { bg: '#f59e0b', border: '#d97706' };
  }

  private evtColors(ev: CalendarEvent): { bg: string; border: string } {
    const map: Record<string, { bg: string; border: string }> = {
      rehearsal:   { bg: '#3b82f6', border: '#2563eb' },
      unavailable: { bg: '#ef4444', border: '#dc2626' },
      other:       { bg: '#eab308', border: '#ca8a04' },
    };
    return map[ev.type] ?? { bg: '#6b7280', border: '#4b5563' };
  }

  evtDotColor(ev: CalendarEvent): string {
    return this.evtColors(ev).bg;
  }

  private addOneDay(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onDateClick(arg: DateClickArg): void {
    this.closePopover();
    const ref = this.dialog.open<CalendarEventFormResult>(CalendarEventFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { event: null, members: this.members, defaultDate: arg.dateStr } satisfies CalendarEventFormData,
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

  onEventClick(arg: EventClickArg): void {
    arg.jsEvent.stopPropagation();
    const props = arg.event.extendedProps;
    const x = Math.min(arg.jsEvent.clientX + 10, window.innerWidth  - 310);
    const y = Math.min(arg.jsEvent.clientY + 10, window.innerHeight - 230);
    this.popover = {
      x, y,
      kind:     props['kind'],
      gig:      (props['kind'] === 'gig' || props['kind'] === 'followup') ? props['data'] as Gig : undefined,
      calEvent: props['kind'] === 'calEvent' ? props['data'] as CalendarEvent : undefined,
    };
  }

  closePopover(): void {
    this.popover = null;
  }

  deleteEvent(event: CalendarEvent): void {
    this.closePopover();
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

  formatIso(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
}
