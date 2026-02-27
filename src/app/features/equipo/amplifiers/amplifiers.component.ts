import { Component, inject, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Amplifier, Instrument, BandMember, Microphone, ROLE_LABELS, STAGE_POSITION_LABELS } from '../../../core/models/equipment.model';
import { AmplifierFormComponent, AmplifierFormData, AmplifierFormResult } from './amplifier-form/amplifier-form.component';

const AMP_TYPE_LABELS: Record<string, string> = { guitar: 'Guitarra', bass: 'Bajo', keyboard: 'Teclado' };

@Component({
  selector: 'app-amplifiers',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar amplificador..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir amplificador
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Nombre</th><th>Tipo</th><th>Marca / Modelo</th><th>Integrante</th><th>Potencia</th><th>Salida</th><th>Posición</th><th>Notas</th><th></th></tr>
        </thead>
        <tbody>
          @for (a of filtered; track a.id) {
            <tr>
              <td class="font-medium">{{ a.name }}</td>
              <td><span class="badge badge-sm badge-outline">{{ typeLabels[a.type] || a.type }}</span></td>
              <td>{{ brandModel(a.brand, a.model) }}</td>
              <td>{{ getMemberName(a.memberId) }}</td>
              <td>{{ a.wattage ? a.wattage + ' W' : '—' }}</td>
              <td>
                @switch (a.routing) {
                  @case ('di')   { <span class="badge badge-sm badge-info">DI box</span> }
                  @case ('mesa') { <span class="badge badge-sm badge-success">Mesa</span> }
                  @default       { <span class="opacity-40">—</span> }
                }
              </td>
              <td class="text-sm">{{ getPositionLabel(a.stagePosition) }}</td>
              <td class="text-sm opacity-60">{{ a.notes }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(a)"><ng-icon name="heroPencil" size="14" /></button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteAmp(a)"><ng-icon name="heroTrash" size="14" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay amplificadores. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AmplifiersComponent implements OnChanges {
  @Input() amplifiers: Amplifier[] = [];
  @Input() members: BandMember[] = [];
  @Input() instruments: Instrument[] = [];
  @Input() microphones: Microphone[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';
  typeLabels = AMP_TYPE_LABELS;
  roleLabels = ROLE_LABELS;
  private memberMap = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['members']) this.memberMap = new Map(this.members.map(m => [m.id, m.name]));
  }

  get filtered(): Amplifier[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.amplifiers.filter(a => a.name.toLowerCase().includes(q)) : this.amplifiers;
  }

  getMemberName(id?: string): string { return id ? (this.memberMap.get(id) ?? '—') : '—'; }
  getPositionLabel(pos?: string): string { return pos ? (STAGE_POSITION_LABELS[pos as keyof typeof STAGE_POSITION_LABELS] ?? pos) : '—'; }
  brandModel(brand?: string, model?: string): string { return [brand, model].filter(s => !!s).join(' ') || '—'; }

  openForm(amplifier: Amplifier | null): void {
    const ref = this.dialog.open<AmplifierFormResult>(AmplifierFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { amplifier, members: this.members, instruments: this.instruments, microphones: this.microphones } satisfies AmplifierFormData,
    });
    ref.closed.subscribe(async r => {
      const result = r as AmplifierFormResult | undefined;
      if (!result) return;
      try {
        const { instrumentId, micIds, ...ampData } = result;
        let savedId: string;
        if (amplifier) {
          await this.db.updateAmplifier({ ...ampData, id: amplifier.id });
          savedId = amplifier.id;
          this.toast.success(`"${result.name}" actualizado`);
        } else {
          const created = await this.db.createAmplifier(ampData);
          savedId = created.id;
          this.toast.success(`"${result.name}" añadido`);
        }
        await this.db.updateAmplifierInstrumentLink(savedId, instrumentId ?? null);
        await this.db.setAmplifierMics(savedId, micIds);
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteAmp(amp: Amplifier): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar amplificador', message: `¿Eliminar "${amp.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteAmplifier(amp.id);
        this.toast.warning(`"${amp.name}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
