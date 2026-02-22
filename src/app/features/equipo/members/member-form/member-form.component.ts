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
    <div class="modal-box w-11/12 max-w-lg">
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

        <!-- Role -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Rol *</span></label>
          <select class="select select-bordered select-sm" formControlName="role">
            @for (entry of roleEntries; track entry[0]) {
              <option [value]="entry[0]">{{ entry[1] }}</option>
            }
          </select>
        </div>

        <!-- Stage Position (3x3 grid picker) -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Posición en escenario</span></label>
          <div class="grid grid-cols-3 gap-1 border border-base-300 rounded-lg p-2">
            <div class="col-span-3 text-center text-xs opacity-50 mb-1">↑ FONDO ESCENARIO ↑</div>
            @for (pos of stagePositions; track pos) {
              <button type="button"
                      class="btn btn-xs"
                      [class.btn-primary]="form.get('stagePosition')?.value === pos"
                      [class.btn-ghost]="form.get('stagePosition')?.value !== pos"
                      (click)="selectPosition(pos)">
                {{ positionLabels[pos] }}
              </button>
            }
            <div class="col-span-3 text-center text-xs opacity-50 mt-1">↓ PÚBLICO ↓</div>
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
    role: ['vocalist' as MemberRole],
    stagePosition: ['' as StagePosition | ''],
    vocalMicId: [''],
    notes: [''],
    sortOrder: [0],
  });

  roleEntries = Object.entries(ROLE_LABELS) as [MemberRole, string][];
  positionLabels = STAGE_POSITION_LABELS;
  stagePositions: StagePosition[] = [
    'back-left', 'back-center', 'back-right',
    'mid-left',  'mid-center',  'mid-right',
    'front-left','front-center','front-right',
  ];

  ngOnInit(): void {
    if (this.data.member) {
      this.form.patchValue({
        name: this.data.member.name,
        role: this.data.member.role,
        stagePosition: this.data.member.stagePosition ?? '',
        vocalMicId: this.data.member.vocalMicId ?? '',
        notes: this.data.member.notes ?? '',
        sortOrder: this.data.member.sortOrder,
      });
    }
  }

  selectPosition(pos: StagePosition): void {
    const current = this.form.get('stagePosition')?.value;
    this.form.patchValue({ stagePosition: current === pos ? '' : pos });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name!,
      role: v.role as MemberRole,
      stagePosition: (v.stagePosition || undefined) as StagePosition | undefined,
      vocalMicId: v.vocalMicId || undefined,
      notes: v.notes || undefined,
      sortOrder: v.sortOrder ?? 0,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
