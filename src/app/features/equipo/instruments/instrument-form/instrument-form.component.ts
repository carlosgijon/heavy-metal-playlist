import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  BandMember, Instrument, InstrumentType, Amplifier, Microphone,
  InstrumentRouting, MonoStereo, MIC_USAGE_LABELS,
} from '../../../../core/models/equipment.model';

export interface InstrumentFormData {
  instrument: Instrument | null;
  members: BandMember[];
  amplifiers: Amplifier[];
  microphones: Microphone[];
}

export type InstrumentFormResult = Omit<Instrument, 'id'> & { micIds: string[] };

@Component({
  selector: 'app-instrument-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ data.instrument ? 'Editar instrumento' : 'Nuevo instrumento' }}
      </h3>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Name + Type -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control col-span-2 sm:col-span-1">
            <label class="label"><span class="label-text">Nombre *</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="name"
                   placeholder="Ej: Gibson Les Paul Custom" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
            }
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              <option value="guitar">Guitarra</option>
              <option value="bass">Bajo</option>
              <option value="drums">Batería</option>
              <option value="keyboard">Teclado / Sintetizador</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <!-- Member -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Integrante</span></label>
          <select class="select select-bordered select-sm" formControlName="memberId">
            <option value="">Sin asignar</option>
            @for (m of data.members; track m.id) {
              <option [value]="m.id">{{ m.name }}</option>
            }
          </select>
        </div>

        <!-- Brand + Model -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Marca</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="brand"
                   placeholder="Ej: Gibson" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model"
                   placeholder="Ej: Les Paul Custom" />
          </div>
        </div>

        <!-- Routing — hidden for drums -->
        @if (form.get('type')?.value !== 'drums') {
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Señal / Routing</span></label>
            <select class="select select-bordered select-sm" formControlName="routing">
              <option value="amp">Via Amplificador</option>
              <option value="di">DI box (Direct Injection)</option>
              <option value="mesa">Directo a Mesa</option>
            </select>
          </div>

          <!-- Amp picker — only when routing='amp' -->
          @if (form.get('routing')?.value === 'amp') {
            <div class="form-control mb-3">
              <label class="label"><span class="label-text">Amplificador</span></label>
              <select class="select select-bordered select-sm" formControlName="ampId">
                <option value="">Sin asignar</option>
                @for (a of data.amplifiers; track a.id) {
                  <option [value]="a.id">{{ a.name }}{{ a.brand ? ' — ' + a.brand : '' }}</option>
                }
              </select>
            </div>
          }

          <!-- Mono / Stereo — only when routing != 'amp' -->
          @if (form.get('routing')?.value !== 'amp') {
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
          }
        }

        <!-- Microphones checklist — all instrument types -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Micrófonos asignados</span></label>
          @if (data.microphones.length === 0) {
            <p class="text-xs opacity-60 mt-1">No hay micrófonos. Añade uno en la pestaña Micrófonos.</p>
          } @else {
            <div class="border border-base-300 rounded-lg max-h-40 overflow-y-auto p-2 flex flex-col gap-0.5">
              @for (mic of data.microphones; track mic.id) {
                <label class="flex items-center gap-2 cursor-pointer hover:bg-base-200 rounded px-2 py-1">
                  <input type="checkbox" class="checkbox checkbox-sm"
                         [checked]="isMicSelected(mic.id)"
                         (change)="toggleMic(mic.id)" />
                  <span class="text-sm flex-1">{{ mic.name }}{{ mic.brand ? ' · ' + mic.brand : '' }}</span>
                  @if (mic.usage) {
                    <span class="badge badge-xs badge-outline">{{ micUsageLabel(mic.usage) }}</span>
                  }
                </label>
              }
            </div>
          }
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
export class InstrumentFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<InstrumentFormResult>);
  readonly data = inject<InstrumentFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name:         ['', Validators.required],
    type:         ['guitar' as InstrumentType],
    memberId:     [''],
    brand:        [''],
    model:        [''],
    routing:      ['di' as InstrumentRouting],
    ampId:        [''],
    monoStereo:   ['mono' as MonoStereo],
    channelOrder: [0],
    notes:        [''],
  });

  selectedMicIds = new Set<string>();

  isMicSelected(id: string): boolean { return this.selectedMicIds.has(id); }

  toggleMic(id: string): void {
    if (this.selectedMicIds.has(id)) this.selectedMicIds.delete(id);
    else this.selectedMicIds.add(id);
  }

  micUsageLabel(usage: string): string {
    return (MIC_USAGE_LABELS as Record<string, string>)[usage] ?? usage;
  }

  ngOnInit(): void {
    // Pre-check mics already assigned to this instrument
    const instId = this.data.instrument?.id;
    if (instId) {
      this.data.microphones
        .filter(m => m.assignedToType === 'instrument' && m.assignedToId === instId)
        .forEach(m => this.selectedMicIds.add(m.id));
    }

    if (this.data.instrument) {
      const i = this.data.instrument;
      this.form.patchValue({
        name:         i.name,
        type:         i.type,
        memberId:     i.memberId ?? '',
        brand:        i.brand ?? '',
        model:        i.model ?? '',
        routing:      i.routing ?? 'di',
        ampId:        i.ampId ?? '',
        monoStereo:   i.monoStereo ?? 'mono',
        channelOrder: i.channelOrder,
        notes:        i.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const isDrums = v.type === 'drums';
    const routing = isDrums ? ('di' as InstrumentRouting) : (v.routing as InstrumentRouting);
    this.dialogRef.close({
      name:         v.name!,
      type:         v.type as InstrumentType,
      memberId:     v.memberId || undefined,
      brand:        v.brand || undefined,
      model:        v.model || undefined,
      routing,
      ampId:        routing === 'amp' ? (v.ampId || undefined) : undefined,
      monoStereo:   routing !== 'amp' ? ((v.monoStereo as MonoStereo) ?? 'mono') : 'mono',
      channelOrder: v.channelOrder ?? 0,
      notes:        v.notes || undefined,
      micIds:       [...this.selectedMicIds],
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
