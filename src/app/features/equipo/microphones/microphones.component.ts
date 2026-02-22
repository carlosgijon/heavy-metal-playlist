import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Microphone, MIC_TYPE_LABELS, POLAR_LABELS } from '../../../core/models/equipment.model';
import { MicrophoneFormComponent, MicrophoneFormData } from './microphone-form/microphone-form.component';

@Component({
  selector: 'app-microphones',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar micrófono..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir micrófono
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Nombre</th><th>Marca / Modelo</th><th>Tipo</th><th>Patrón</th><th>+48V</th><th>Notas</th><th></th></tr>
        </thead>
        <tbody>
          @for (m of filtered; track m.id) {
            <tr>
              <td class="font-medium">{{ m.name }}</td>
              <td>{{ brandModel(m.brand, m.model) }}</td>
              <td><span class="badge badge-sm badge-outline">{{ typeLabels[m.type] }}</span></td>
              <td>{{ m.polarPattern ? polarLabels[m.polarPattern] : '—' }}</td>
              <td>
                @if (m.phantomPower) { <span class="badge badge-sm badge-warning">+48V</span> }
                @else { <span class="opacity-40">—</span> }
              </td>
              <td class="text-sm opacity-60">{{ m.notes }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(m)"><ng-icon name="heroPencil" size="14" /></button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteMic(m)"><ng-icon name="heroTrash" size="14" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay micrófonos. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MicrophonesComponent {
  @Input() microphones: Microphone[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';
  typeLabels = MIC_TYPE_LABELS;
  polarLabels = POLAR_LABELS;

  brandModel(brand?: string, model?: string): string { return [brand, model].filter(s => !!s).join(' ') || '—'; }

  get filtered(): Microphone[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.microphones.filter(m =>
      m.name.toLowerCase().includes(q) || m.model?.toLowerCase().includes(q)
    ) : this.microphones;
  }

  openForm(mic: Microphone | null): void {
    const ref = this.dialog.open<Omit<Microphone, 'id'>>(MicrophoneFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { microphone: mic } satisfies MicrophoneFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (mic) { await this.db.updateMicrophone({ ...result, id: mic.id }); this.toast.success(`"${result.name}" actualizado`); }
        else { await this.db.createMicrophone(result); this.toast.success(`"${result.name}" añadido`); }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteMic(mic: Microphone): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar micrófono', message: `¿Eliminar "${mic.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteMicrophone(mic.id);
        this.toast.warning(`"${mic.name}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
