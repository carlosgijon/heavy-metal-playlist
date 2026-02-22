import { Component, inject, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Instrument, BandMember, Microphone, ROLE_LABELS } from '../../../core/models/equipment.model';
import { InstrumentFormComponent, InstrumentFormData } from './instrument-form/instrument-form.component';

const INSTRUMENT_TYPE_LABELS: Record<string, string> = {
  guitar: 'Guitarra', bass: 'Bajo', drums: 'Batería', keyboard: 'Teclado', other: 'Otro',
};

@Component({
  selector: 'app-instruments',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar instrumento..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir instrumento
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Nombre</th><th>Tipo</th><th>Marca / Modelo</th><th>Integrante</th><th>Mic / DI</th><th>Ch.</th><th></th></tr>
        </thead>
        <tbody>
          @for (i of filtered; track i.id) {
            <tr>
              <td class="font-medium">{{ i.name }}</td>
              <td><span class="badge badge-sm badge-outline">{{ typeLabels[i.type] || i.type }}</span></td>
              <td>{{ brandModel(i.brand, i.model) }}</td>
              <td>{{ getMemberName(i.memberId) }}</td>
              <td>
                @if (i.usesDi) { <span class="badge badge-sm badge-info">DI</span> }
                @else if (i.micId) { <span class="text-sm">{{ getMicName(i.micId) }}</span> }
                @else { <span class="opacity-40">—</span> }
              </td>
              <td class="text-sm opacity-60">{{ i.channelOrder }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(i)"><ng-icon name="heroPencil" size="14" /></button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteInstrument(i)"><ng-icon name="heroTrash" size="14" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay instrumentos. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class InstrumentsComponent implements OnChanges {
  @Input() instruments: Instrument[] = [];
  @Input() members: BandMember[] = [];
  @Input() microphones: Microphone[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';
  typeLabels = INSTRUMENT_TYPE_LABELS;
  roleLabels = ROLE_LABELS;

  private memberMap = new Map<string, string>();
  private micMap = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['members']) this.memberMap = new Map(this.members.map(m => [m.id, m.name]));
    if (changes['microphones']) this.micMap = new Map(this.microphones.map(m => [m.id, m.name + (m.model ? ' · ' + m.model : '')]));
  }

  get filtered(): Instrument[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.instruments.filter(i => i.name.toLowerCase().includes(q)) : this.instruments;
  }

  getMemberName(id?: string): string { return id ? (this.memberMap.get(id) ?? '—') : '—'; }
  getMicName(id?: string): string { return id ? (this.micMap.get(id) ?? '—') : '—'; }
  brandModel(brand?: string, model?: string): string { return [brand, model].filter(s => !!s).join(' ') || '—'; }

  openForm(instrument: Instrument | null): void {
    const ref = this.dialog.open<Omit<Instrument, 'id'>>(InstrumentFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { instrument, members: this.members, microphones: this.microphones } satisfies InstrumentFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (instrument) { await this.db.updateInstrument({ ...result, id: instrument.id }); this.toast.success(`"${result.name}" actualizado`); }
        else { await this.db.createInstrument(result); this.toast.success(`"${result.name}" añadido`); }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteInstrument(instrument: Instrument): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar instrumento', message: `¿Eliminar "${instrument.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteInstrument(instrument.id);
        this.toast.warning(`"${instrument.name}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
