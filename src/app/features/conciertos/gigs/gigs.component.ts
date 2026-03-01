import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus, heroChevronRight, heroCheckCircle, heroPhone } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  Gig, GigStatus, GIG_STATUSES, GIG_STATUS_LABELS, GIG_STATUS_BADGE, GIG_STATUS_NEXT, Venue,
} from '../../../core/models/gig.model';
import { PlaylistWithStats } from '../../../core/models/song.model';
import { GigFormComponent, GigFormData, GigFormResult } from './gig-form/gig-form.component';
import { GigChecklistsDialogComponent, GigChecklistsDialogData } from './gig-checklists/gig-checklists-dialog.component';
import { GigContactsDialogComponent, GigContactsDialogData } from './gig-contacts/gig-contacts-dialog.component';

@Component({
  selector: 'app-gigs',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus, heroChevronRight, heroCheckCircle, heroPhone })],
  template: `
    <!-- Status filter pills -->
    <div class="flex flex-wrap gap-1 mb-3">
      <button class="btn btn-xs" [class.btn-neutral]="statusFilter === null"
              [class.btn-ghost]="statusFilter !== null" (click)="statusFilter = null">
        Todos <span class="badge badge-xs ml-1">{{ gigs.length }}</span>
      </button>
      @for (s of statuses; track s) {
        <button class="btn btn-xs" [class.btn-ghost]="statusFilter !== s"
                [ngClass]="statusFilter === s ? badgeToBtn[s] : ''"
                (click)="statusFilter = s">
          {{ statusLabels[s] }}
          <span class="badge badge-xs ml-1">{{ countByStatus(s) }}</span>
        </button>
      }
    </div>

    <!-- Add button -->
    <div class="flex justify-end mb-3">
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir concierto
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Fecha</th><th>Título</th><th>Sala</th><th>Estado</th><th>Caché</th><th>Seguimiento</th><th></th></tr>
        </thead>
        <tbody>
          @for (g of filtered; track g.id) {
            <tr>
              <td class="whitespace-nowrap text-sm">{{ g.date ? formatDate(g.date) : '—' }}</td>
              <td class="font-medium">{{ g.title }}</td>
              <td class="text-sm opacity-70">{{ g.venueName || '—' }}</td>
              <td>
                <button class="badge badge-sm gap-1 cursor-pointer hover:opacity-80"
                        [ngClass]="statusBadge[g.status]"
                        (click)="advanceStatus(g)"
                        title="Click para avanzar al siguiente estado">
                  {{ statusLabels[g.status] }}
                  @if (g.status !== 'played' && g.status !== 'cancelled') {
                    <ng-icon name="heroChevronRight" size="10" />
                  }
                </button>
              </td>
              <td class="text-sm">{{ g.pay || '—' }}</td>
              <td class="text-xs whitespace-nowrap">
                @if (g.followUpDate) {
                  <span class="badge badge-xs gap-1"
                        [class.badge-error]="isOverdue(g.followUpDate)"
                        [class.badge-warning]="!isOverdue(g.followUpDate)">
                    {{ formatDate(g.followUpDate) }}
                  </span>
                } @else {
                  <span class="opacity-30">—</span>
                }
              </td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" title="Seguimiento" (click)="openContacts(g)">
                    <ng-icon name="heroPhone" size="14" />
                  </button>
                  <button class="btn btn-ghost btn-xs" title="Checklists" (click)="openChecklists(g)">
                    <ng-icon name="heroCheckCircle" size="14" />
                  </button>
                  <button class="btn btn-ghost btn-xs" (click)="openForm(g)">
                    <ng-icon name="heroPencil" size="14" />
                  </button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteGig(g)">
                    <ng-icon name="heroTrash" size="14" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-center opacity-50 py-6">
              {{ statusFilter ? 'No hay conciertos en este estado' : 'No hay conciertos. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class GigsComponent {
  @Input() gigs: Gig[] = [];
  @Input() venues: Venue[] = [];
  @Input() playlists: PlaylistWithStats[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  statusFilter: GigStatus | null = null;
  readonly statuses = GIG_STATUSES;
  readonly statusLabels = GIG_STATUS_LABELS;
  readonly statusBadge = GIG_STATUS_BADGE;
  readonly statusNext = GIG_STATUS_NEXT;

  readonly badgeToBtn: Record<GigStatus, string> = {
    lead: 'btn-neutral', contacted: 'btn-info', negotiating: 'btn-warning',
    hold: 'btn-primary', confirmed: 'btn-success', played: 'btn-neutral', cancelled: 'btn-error',
  };

  get filtered(): Gig[] {
    return this.statusFilter
      ? this.gigs.filter(g => g.status === this.statusFilter)
      : this.gigs;
  }

  countByStatus(s: GigStatus): number {
    return this.gigs.filter(g => g.status === s).length;
  }

  formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  isOverdue(date: string): boolean {
    return date < new Date().toISOString().slice(0, 10);
  }

  async advanceStatus(gig: Gig): Promise<void> {
    const next = this.statusNext[gig.status];
    if (next === gig.status) return;
    try {
      await this.db.updateGigStatus(gig.id, next);
      this.toast.success(`"${gig.title}" → ${this.statusLabels[next]}`);
      this.changed.emit();
    } catch { this.toast.danger('Error al actualizar el estado'); }
  }

  openContacts(gig: Gig): void {
    const ref = this.dialog.open<boolean>(GigContactsDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: false,
      data: { gig } satisfies GigContactsDialogData,
    });
    ref.closed.subscribe(dirty => { if (dirty) this.changed.emit(); });
  }

  openChecklists(gig: Gig): void {
    this.dialog.open<void>(GigChecklistsDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: false,
      data: { gig } satisfies GigChecklistsDialogData,
    });
  }

  openForm(gig: Gig | null): void {
    const ref = this.dialog.open<GigFormResult>(GigFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { gig, venues: this.venues, playlists: this.playlists } satisfies GigFormData,
    });
    ref.closed.subscribe(async r => {
      const result = r as GigFormResult | undefined;
      if (!result) return;
      try {
        if (gig) {
          await this.db.updateGig({ ...result, id: gig.id, createdAt: gig.createdAt });
          this.toast.success(`"${result.title}" actualizado`);
        } else {
          await this.db.createGig(result);
          this.toast.success(`"${result.title}" añadido`);
        }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteGig(gig: Gig): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar concierto', message: `¿Eliminar "${gig.title}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteGig(gig.id);
        this.toast.warning(`"${gig.title}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
