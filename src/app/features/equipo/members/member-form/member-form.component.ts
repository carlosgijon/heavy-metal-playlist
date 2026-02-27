import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  BandMember, MemberRole, StagePosition,
  ROLE_LABELS, STAGE_POSITION_LABELS, Microphone
} from '../../../../core/models/equipment.model';

export interface MemberFormData {
  member: BandMember | null;
  microphones: Microphone[];
}

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-5xl">
      <h3 class="font-bold text-lg mb-4">
        {{ data.member ? 'Editar integrante' : 'Nuevo integrante' }}
      </h3>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Name -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nombre *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="name"
                 placeholder="Nombre del integrante" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
          }
        </div>

        <!-- Roles (multi-select checkboxes) -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Roles *</span></label>
          <div class="flex flex-wrap gap-3">
            @for (entry of roleEntries; track entry[0]) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
                       [checked]="selectedRoles.has(entry[0])"
                       (change)="toggleRole(entry[0])" />
                <span class="label-text">{{ entry[1] }}</span>
              </label>
            }
          </div>
          @if (rolesError) {
            <span class="text-error text-xs mt-1">Selecciona al menos un rol</span>
          }
        </div>

        <!-- Stage Position -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Posición en escenario</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden">
            <!-- Cabeceras de columna (profundidad) -->
            <div class="grid grid-cols-3 bg-base-200 text-xs opacity-60 text-center">
              <div class="py-1">← Fondo</div>
              <div class="py-1">Medio</div>
              <div class="py-1">Frente →</div>
            </div>
            <!-- Botones 3×3 -->
            <div class="grid grid-cols-3 gap-px bg-base-300 p-px">
              @for (pos of stagePositions; track pos) {
                <button type="button"
                        class="btn btn-xs rounded-none"
                        [class.btn-primary]="form.get('stagePosition')?.value === pos"
                        [class.btn-ghost]="form.get('stagePosition')?.value !== pos"
                        (click)="selectPosition(pos)">
                  {{ positionLabels[pos] }}
                </button>
              }
            </div>
            <!-- Indicadores laterales -->
            <div class="flex justify-between bg-base-200 text-xs opacity-50 px-2 py-1">
              <span>↑ Stage Left</span>
              <span>Stage Right ↓</span>
            </div>
          </div>
        </div>

        <!-- Vocal Mic -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Micrófono vocal</span></label>
          <select class="select select-bordered select-sm" formControlName="vocalMicId">
            <option value="">Sin micrófono asignado</option>
            @for (mic of data.microphones; track mic.id) {
              <option [value]="mic.id">{{ mic.name }}{{ mic.model ? ' — ' + mic.model : '' }}</option>
            }
          </select>
        </div>

        <!-- Notes -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Notas</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" formControlName="notes"
                    rows="2" placeholder="Notas opcionales"></textarea>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `,
})
export class MemberFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Omit<BandMember, 'id'>>);
  readonly data = inject<MemberFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    stagePosition: ['' as StagePosition | ''],
    vocalMicId: [''],
    notes: [''],
    sortOrder: [0],
  });

  selectedRoles = new Set<MemberRole>(['vocalist']);
  rolesError = false;

  roleEntries = Object.entries(ROLE_LABELS) as [MemberRole, string][];
  positionLabels = STAGE_POSITION_LABELS;
  stagePositions: StagePosition[] = [
    'back-left',   'mid-left',   'front-left',
    'back-center', 'mid-center', 'front-center',
    'back-right',  'mid-right',  'front-right',
  ];

  ngOnInit(): void {
    if (this.data.member) {
      const m = this.data.member;
      this.selectedRoles = new Set(m.roles as MemberRole[]);
      this.form.patchValue({
        name: m.name,
        stagePosition: m.stagePosition ?? '',
        vocalMicId: m.vocalMicId ?? '',
        notes: m.notes ?? '',
        sortOrder: m.sortOrder,
      });
    }
  }

  toggleRole(role: MemberRole): void {
    if (this.selectedRoles.has(role)) {
      this.selectedRoles.delete(role);
    } else {
      this.selectedRoles.add(role);
    }
    this.rolesError = false;
  }

  selectPosition(pos: StagePosition): void {
    const current = this.form.get('stagePosition')?.value;
    this.form.patchValue({ stagePosition: current === pos ? '' : pos });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.selectedRoles.size === 0) { this.rolesError = true; return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name!,
      roles: [...this.selectedRoles],
      stagePosition: (v.stagePosition || undefined) as StagePosition | undefined,
      vocalMicId: v.vocalMicId || undefined,
      notes: v.notes || undefined,
      sortOrder: v.sortOrder ?? 0,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
