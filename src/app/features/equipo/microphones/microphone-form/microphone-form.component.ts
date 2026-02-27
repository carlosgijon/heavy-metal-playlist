import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Microphone, MicType, MicUsage, PolarPattern, MicAssignmentType,
  BandMember, Amplifier, Instrument,
  MIC_TYPE_LABELS, POLAR_LABELS, ROLE_LABELS,
} from '../../../../core/models/equipment.model';

export interface MicrophoneFormData {
  microphone: Microphone | null;
  members: BandMember[];
  amplifiers: Amplifier[];
  instruments: Instrument[];
}

// Combined UI value for "¿Dónde va este micrófono?"
type DestinationType = '' | 'member' | 'amplifier' | 'instrument' | 'drums-kick' | 'drums-overhead' | 'drums-snare';

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
          <label class="label"><span class="label-text">Canal</span></label>
          <div class="flex gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-sm" formControlName="monoStereo" value="mono" />
              <span class="label-text">Mono</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-sm" formControlName="monoStereo" value="stereo" />
              <span class="label-text">Estéreo</span>
            </label>
          </div>
        </div>
        <div class="form-control mb-3">
          <label class="label cursor-pointer justify-start gap-3">
            <input type="checkbox" class="checkbox checkbox-sm" formControlName="phantomPower" />
            <span class="label-text">Requiere alimentación fantasma (+48V)</span>
          </label>
        </div>

        <!-- Destino / Asignación -->
        <div class="divider text-xs opacity-60 my-2">Destino en la mesa</div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">¿Dónde va este micrófono?</span></label>
          <select class="select select-bordered select-sm" formControlName="destType"
                  (change)="onDestTypeChange()">
            <option value="">Ambiente / público (sin asignar)</option>
            <option value="member">Micrófono vocal (integrante)</option>
            <option value="amplifier">Amplificador</option>
            <option value="instrument">Instrumento de batería (general)</option>
            <option value="drums-kick">Micrófono de bombo</option>
            <option value="drums-overhead">Micrófonos aéreos de batería (overhead)</option>
            <option value="drums-snare">Micrófono de caja (snare)</option>
          </select>
        </div>

        @if (form.get('destType')?.value === 'member') {
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Integrante (vocal)</span></label>
            <select class="select select-bordered select-sm" formControlName="assignedToId">
              <option value="">— Seleccionar integrante —</option>
              @for (m of data.members; track m.id) {
                <option [value]="m.id">{{ m.name }} ({{ getMemberRoles(m) }})</option>
              }
            </select>
          </div>
        }

        @if (form.get('destType')?.value === 'amplifier') {
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Amplificador</span></label>
            <select class="select select-bordered select-sm" formControlName="assignedToId">
              <option value="">— Seleccionar amplificador —</option>
              @for (a of data.amplifiers; track a.id) {
                <option [value]="a.id">{{ a.name }}{{ a.brand ? ' · ' + a.brand : '' }}</option>
              }
            </select>
          </div>
        }

        @if (form.get('destType')?.value === 'instrument') {
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Instrumento (batería)</span></label>
            @if (drumInstruments.length === 0) {
              <p class="text-xs opacity-60 mt-1">No hay instrumentos de batería. Añade uno en la pestaña Instrumentos.</p>
            } @else {
              <select class="select select-bordered select-sm" formControlName="assignedToId">
                <option value="">— Seleccionar instrumento —</option>
                @for (i of drumInstruments; track i.id) {
                  <option [value]="i.id">{{ i.name }}{{ i.brand ? ' · ' + i.brand : '' }}</option>
                }
              </select>
            }
          </div>
        }

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
    phantomPower: [false],
    monoStereo: ['mono'],
    notes: [''],
    destType: ['' as DestinationType],
    assignedToId: [''],
  });

  micTypeEntries = Object.entries(MIC_TYPE_LABELS) as [MicType, string][];
  polarEntries = Object.entries(POLAR_LABELS) as [PolarPattern, string][];
  private roleLabels = ROLE_LABELS;

  get drumInstruments(): Instrument[] {
    return this.data.instruments.filter(i => i.type === 'drums');
  }

  getMemberRoles(m: BandMember): string {
    return m.roles.map(r => this.roleLabels[r] ?? r).join(', ') || '—';
  }

  ngOnInit(): void {
    if (this.data.microphone) {
      const m = this.data.microphone;
      // Reconstruct combined destType from assignedToType + usage
      let destType: DestinationType = (m.assignedToType ?? '') as DestinationType;
      if (m.assignedToType === 'instrument' && m.usage) {
        if (['drums-kick', 'drums-overhead', 'drums-snare'].includes(m.usage)) {
          destType = m.usage as DestinationType;
        }
      }
      this.form.patchValue({
        name: m.name, brand: m.brand ?? '', model: m.model ?? '',
        type: m.type, polarPattern: m.polarPattern ?? '',
        phantomPower: m.phantomPower, monoStereo: m.monoStereo ?? 'mono',
        notes: m.notes ?? '', destType,
        assignedToId: m.assignedToId ?? '',
      });
    }
  }

  onDestTypeChange(): void {
    this.form.patchValue({ assignedToId: '' });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const destType = v.destType as DestinationType;

    // Derive real assignedToType + usage from combined destType
    let assignedToType: MicAssignmentType | undefined;
    let usage: MicUsage | undefined;
    let assignedToId: string | undefined;

    if (destType === 'member') {
      assignedToType = 'member';
      usage = 'vocal';
      assignedToId = v.assignedToId || undefined;
    } else if (destType === 'amplifier') {
      assignedToType = 'amplifier';
      usage = 'instrument';
      assignedToId = v.assignedToId || undefined;
    } else if (destType === 'instrument') {
      assignedToType = 'instrument';
      usage = 'instrument';
      assignedToId = v.assignedToId || undefined;
    } else if (destType === 'drums-kick') {
      assignedToType = 'instrument';
      usage = 'drums-kick';
      assignedToId = v.assignedToId || undefined;
    } else if (destType === 'drums-overhead') {
      assignedToType = 'instrument';
      usage = 'drums-overhead';
      assignedToId = v.assignedToId || undefined;
    } else if (destType === 'drums-snare') {
      assignedToType = 'instrument';
      usage = 'drums-snare';
      assignedToId = v.assignedToId || undefined;
    }

    this.dialogRef.close({
      name: v.name!, brand: v.brand || undefined, model: v.model || undefined,
      type: v.type as MicType,
      polarPattern: (v.polarPattern || undefined) as PolarPattern | undefined,
      usage,
      phantomPower: v.phantomPower ?? false,
      monoStereo: (v.monoStereo as 'mono' | 'stereo') ?? 'mono',
      notes: v.notes || undefined,
      assignedToType,
      assignedToId,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
