import { Component, inject, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { BandMember, Microphone, ROLE_LABELS, STAGE_POSITION_LABELS } from '../../../core/models/equipment.model';
import { MemberFormComponent, MemberFormData } from './member-form/member-form.component';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar integrante..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir integrante
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr>
            <th>Nombre</th><th>Rol</th><th>Posición</th><th>Mic vocal</th><th>Notas</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (m of filtered; track m.id) {
            <tr>
              <td class="font-medium">{{ m.name }}</td>
              <td>{{ getRoleNames(m) }}</td>
              <td>{{ m.stagePosition ? positionLabels[m.stagePosition] : '—' }}</td>
              <td>{{ getMicName(m.vocalMicId) }}</td>
              <td class="text-sm opacity-60">{{ m.notes }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(m)">
                    <ng-icon name="heroPencil" size="14" />
                  </button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteMember(m)">
                    <ng-icon name="heroTrash" size="14" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay integrantes. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MembersComponent implements OnChanges {
  @Input() members: BandMember[] = [];
  @Input() microphones: Microphone[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';
  roleLabels = ROLE_LABELS;
  positionLabels = STAGE_POSITION_LABELS;
  private micMap = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['microphones']) {
      this.micMap = new Map(this.microphones.map(m => [m.id, m.name + (m.model ? ' · ' + m.model : '')]));
    }
  }

  get filtered(): BandMember[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.members.filter(m => m.name.toLowerCase().includes(q)) : this.members;
  }

  getMicName(id?: string): string {
    return id ? (this.micMap.get(id) ?? '—') : '—';
  }

  getRoleNames(m: BandMember): string {
    return m.roles.map(r => this.roleLabels[r] ?? r).join(', ') || '—';
  }

  openForm(member: BandMember | null): void {
    const ref = this.dialog.open<Omit<BandMember, 'id'>>(MemberFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { member, microphones: this.microphones } satisfies MemberFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (member) {
          await this.db.updateMember({ ...result, id: member.id });
          this.toast.success(`"${result.name}" actualizado`);
        } else {
          await this.db.createMember(result);
          this.toast.success(`"${result.name}" añadido`);
        }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteMember(member: BandMember): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar integrante', message: `¿Eliminar a "${member.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteMember(member.id);
        this.toast.warning(`"${member.name}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
