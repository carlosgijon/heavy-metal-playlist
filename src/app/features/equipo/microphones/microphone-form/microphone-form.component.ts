import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Microphone, MicType, MicUsage, PolarPattern,
  MIC_TYPE_LABELS, MIC_USAGE_LABELS, POLAR_LABELS,
} from '../../../../core/models/equipment.model';

export interface MicrophoneFormData { microphone: Microphone | null; }

@Component({
  selector: 'app-microphone-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-4">
        {{ data.microphone ? 'Editar micrófono' : 'Nuevo micrófono' }}
      </h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nombre *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="name"
                 placeholder="Ej: Shure SM58" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
          }
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Marca</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="brand" placeholder="Shure" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model" placeholder="SM58" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              @for (entry of micTypeEntries; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1] }}</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Patrón polar</span></label>
            <select class="select select-bordered select-sm" formControlName="polarPattern">
              <option value="">— Sin especificar —</option>
              @for (entry of polarEntries; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1] }}</option>
              }
            </select>
          </div>
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Uso / Aplicación</span></label>
          <select class="select select-bordered select-sm" formControlName="usage">
            <option value="">— Sin especificar —</option>
            @for (entry of usageEntries; track entry[0]) {
              <option [value]="entry[0]">{{ entry[1] }}</option>
            }
          </select>
        </div>
        <div class="form-control mb-3">
          <label class="label cursor-pointer justify-start gap-3">
            <input type="checkbox" class="checkbox checkbox-sm" formControlName="phantomPower" />
            <span class="label-text">Requiere alimentación fantasma (+48V)</span>
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
export class MicrophoneFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Omit<Microphone, 'id'>>);
  readonly data = inject<MicrophoneFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    brand: [''],
    model: [''],
    type: ['dynamic' as MicType],
    polarPattern: ['' as PolarPattern | ''],
    usage: ['' as MicUsage | ''],
    phantomPower: [false],
    notes: [''],
  });

  micTypeEntries = Object.entries(MIC_TYPE_LABELS) as [MicType, string][];
  polarEntries = Object.entries(POLAR_LABELS) as [PolarPattern, string][];
  usageEntries = Object.entries(MIC_USAGE_LABELS) as [MicUsage, string][];

  ngOnInit(): void {
    if (this.data.microphone) {
      const m = this.data.microphone;
      this.form.patchValue({
        name: m.name, brand: m.brand ?? '', model: m.model ?? '',
        type: m.type, polarPattern: m.polarPattern ?? '',
        usage: m.usage ?? '',
        phantomPower: m.phantomPower, notes: m.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name!, brand: v.brand || undefined, model: v.model || undefined,
      type: v.type as MicType,
      polarPattern: (v.polarPattern || undefined) as PolarPattern | undefined,
      usage: (v.usage || undefined) as MicUsage | undefined,
      phantomPower: v.phantomPower ?? false,
      notes: v.notes || undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
