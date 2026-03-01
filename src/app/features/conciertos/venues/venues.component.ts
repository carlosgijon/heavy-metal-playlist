import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus, heroGlobeAlt, heroPhone, heroEnvelope } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Venue } from '../../../core/models/gig.model';
import { VenueFormComponent, VenueFormData, VenueFormResult } from './venue-form/venue-form.component';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus, heroGlobeAlt, heroPhone, heroEnvelope })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar sala o contacto..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir sala
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Sala</th><th>Ciudad</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th>Aforo</th><th>Notas</th><th></th></tr>
        </thead>
        <tbody>
          @for (v of filtered; track v.id) {
            <tr>
              <td class="font-medium">
                {{ v.name }}
                @if (v.website) {
                  <a [href]="v.website" target="_blank" class="ml-1 opacity-50 hover:opacity-100">
                    <ng-icon name="heroGlobeAlt" size="13" />
                  </a>
                }
              </td>
              <td>{{ v.city || '—' }}</td>
              <td>{{ v.bookingName || '—' }}</td>
              <td class="text-sm">
                @if (v.bookingEmail) {
                  <a [href]="'mailto:' + v.bookingEmail" class="link link-hover flex items-center gap-1">
                    <ng-icon name="heroEnvelope" size="13" />{{ v.bookingEmail }}
                  </a>
                } @else { — }
              </td>
              <td class="text-sm">
                @if (v.bookingPhone) {
                  <a [href]="'tel:' + v.bookingPhone" class="link link-hover flex items-center gap-1">
                    <ng-icon name="heroPhone" size="13" />{{ v.bookingPhone }}
                  </a>
                } @else { — }
              </td>
              <td>{{ v.capacity ? (v.capacity | number) + ' pax' : '—' }}</td>
              <td class="text-xs opacity-60 max-w-40 truncate">{{ v.notes }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(v)"><ng-icon name="heroPencil" size="14" /></button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteVenue(v)"><ng-icon name="heroTrash" size="14" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay salas. Añade la primera.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VenuesComponent {
  @Input() venues: Venue[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';

  get filtered(): Venue[] {
    const q = this.search.trim().toLowerCase();
    return q
      ? this.venues.filter(v =>
          v.name.toLowerCase().includes(q) ||
          (v.city ?? '').toLowerCase().includes(q) ||
          (v.bookingName ?? '').toLowerCase().includes(q))
      : this.venues;
  }

  openForm(venue: Venue | null): void {
    const ref = this.dialog.open<VenueFormResult>(VenueFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { venue } satisfies VenueFormData,
    });
    ref.closed.subscribe(async r => {
      const result = r as VenueFormResult | undefined;
      if (!result) return;
      try {
        if (venue) {
          await this.db.updateVenue({ ...result, id: venue.id, createdAt: venue.createdAt });
          this.toast.success(`"${result.name}" actualizada`);
        } else {
          await this.db.createVenue(result);
          this.toast.success(`"${result.name}" añadida`);
        }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar la sala'); }
    });
  }

  deleteVenue(venue: Venue): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar sala', message: `¿Eliminar "${venue.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteVenue(venue.id);
        this.toast.warning(`"${venue.name}" eliminada`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
