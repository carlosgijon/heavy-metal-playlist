import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Instrument, InstrumentType, BandMember, Microphone, ROLE_LABELS
} from '../../../../core/models/equipment.model';

export interface InstrumentFormData {
  instrument: Instrument | null;
  members: BandMember[];
  microphones: Microphone[];
}

const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  guitar: 'Guitarra', bass: 'Bajo', drums: 'Batería / Percusión',
  keyboard: 'Teclado / Sintetizador', other: 'Otro',
};

@Component({
  selector: 'app-instrument-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        {{ data.instrument ? 'Editar instrumento' : 'Nuevo instrumento' }}
      </h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nombre *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="name"
                 placeholder="Ej: Gibson Les Paul Custom" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
          }
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              @for (entry of typeEntries; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1] }}</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Integrante</span></label>
            <select class="select select-bordered select-sm" formControlName="memberId">
              <option value="">Sin asignar</option>
              @for (m of data.members; track m.id) {
                <option [value]="m.id">{{ m.name }} ({{ roleLabels[m.role] }})</option>
              }
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Marca</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="brand" placeholder="Gibson" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model" placeholder="Les Paul" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Micrófono asignado</span></label>
            <select class="select select-bordered select-sm" formControlName="micId">
              <option value="">Sin micrófono</option>
              @for (mic of data.microphones; track mic.id) {
                <option [value]="mic.id">{{ mic.name }}{{ mic.model ? ' · ' + mic.model : '' }}</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Orden en mesa</span></label>
            <input type="number" class="input input-bordered input-sm" formControlName="channelOrder"
                   min="0" placeholder="0" />
          </div>
        </div>
        <div class="form-control mb-3">
          <label class="label cursor-pointer justify-start gap-3">
            <input type="checkbox" class="checkbox checkbox-sm" formControlName="usesDi" />
            <span class="label-text">Usa caja DI (Direct Injection)</span>
          </label>
        </div>
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
export class InstrumentFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Omit<Instrument, 'id'>>);
  readonly data = inject<InstrumentFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['guitar' as InstrumentType],
    memberId: [''],
    brand: [''],
    model: [''],
    micId: [''],
    usesDi: [false],
    channelOrder: [0],
    notes: [''],
  });

  typeEntries = Object.entries(INSTRUMENT_TYPE_LABELS) as [InstrumentType, string][];
  roleLabels = ROLE_LABELS;

  ngOnInit(): void {
    if (this.data.instrument) {
      const i = this.data.instrument;
      this.form.patchValue({
        name: i.name, type: i.type, memberId: i.memberId ?? '',
        brand: i.brand ?? '', model: i.model ?? '',
        micId: i.micId ?? '', usesDi: i.usesDi,
        channelOrder: i.channelOrder, notes: i.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      memberId: v.memberId || undefined, name: v.name!,
      type: v.type as InstrumentType, brand: v.brand || undefined,
      model: v.model || undefined, micId: v.micId || undefined,
      usesDi: v.usesDi ?? false, channelOrder: v.channelOrder ?? 0,
      notes: v.notes || undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
