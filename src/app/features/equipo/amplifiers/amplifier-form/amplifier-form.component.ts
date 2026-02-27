import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Amplifier, AmpType, BandMember, Instrument, Microphone, SpeakerConfig,
  StagePosition, ROLE_LABELS, STAGE_POSITION_LABELS, SPEAKER_CONFIG_LABELS,
  AmpRouting, MonoStereo, MIC_USAGE_LABELS,
} from '../../../../core/models/equipment.model';

export interface AmplifierFormData {
  amplifier: Amplifier | null;
  members: BandMember[];
  instruments: Instrument[];
  microphones: Microphone[];
}

export type AmplifierFormResult = Omit<Amplifier, 'id'> & { instrumentId?: string; micIds: string[] };

const AMP_TYPE_LABELS: Record<AmpType, string> = {
  guitar: 'Guitarra', bass: 'Bajo', keyboard: 'Teclado',
};

// Filas = lateral (St.Left arriba → St.Right abajo), columnas = profundidad (Fondo→Frente)
const STAGE_GRID: { pos: StagePosition; label: string }[][] = [
  [
    { pos: 'back-left',    label: 'Fdo.Izq' },
    { pos: 'mid-left',     label: 'Med.Izq' },
    { pos: 'front-left',   label: 'Fte.Izq' },
  ],
  [
    { pos: 'back-center',  label: 'Fdo.Ctr' },
    { pos: 'mid-center',   label: 'Med.Ctr' },
    { pos: 'front-center', label: 'Fte.Ctr' },
  ],
  [
    { pos: 'back-right',   label: 'Fdo.Der' },
    { pos: 'mid-right',    label: 'Med.Der' },
    { pos: 'front-right',  label: 'Fte.Der' },
  ],
];

@Component({
  selector: 'app-amplifier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-4xl">
      <h3 class="font-bold text-lg mb-4">
        {{ data.amplifier ? 'Editar amplificador' : 'Nuevo amplificador' }}
      </h3>
      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Row 1: Nombre + Tipo -->
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control col-span-2">
            <label class="label"><span class="label-text">Nombre *</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="name"
                   placeholder="Ej: Marshall JCM800" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
            }
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              @for (entry of ampTypeEntries; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1] }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Row 2: Marca + Modelo + Potencia -->
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Marca</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="brand" placeholder="Marshall" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model" placeholder="JCM800" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Potencia (W)</span></label>
            <input type="number" class="input input-bordered input-sm" formControlName="wattage"
                   min="0" placeholder="100" />
          </div>
        </div>

        <!-- Row 3: Integrante + Instrumento enchufado -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Integrante</span></label>
            <select class="select select-bordered select-sm" formControlName="memberId">
              <option value="">Sin asignar</option>
              @for (m of data.members; track m.id) {
                <option [value]="m.id">{{ m.name }} ({{ getMemberRoles(m) }})</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Instrumento enchufado</span></label>
            <select class="select select-bordered select-sm" formControlName="instrumentId">
              <option value="">Sin instrumento</option>
              @for (i of data.instruments; track i.id) {
                <option [value]="i.id">{{ i.name }}{{ i.memberId ? ' (' + getMemberName(i.memberId) + ')' : '' }}</option>
              }
            </select>
            <label class="label">
              <span class="label-text-alt opacity-60">Al guardar, el instrumento quedará marcado como "Via Amplificador"</span>
            </label>
          </div>
        </div>

        <!-- Row 4: Salida + Canal -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Salida del amplificador</span></label>
            <select class="select select-bordered select-sm" formControlName="routing">
              <option value="mic">Micrófono</option>
              <option value="di">DI box (Direct Injection)</option>
              <option value="mesa">Directo a Mesa</option>
            </select>
          </div>
          @if (form.get('routing')?.value !== 'mic') {
            <div class="form-control">
              <label class="label"><span class="label-text">Canal</span></label>
              <div class="flex gap-4 mt-2">
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
        </div>

        <!-- Micrófonos checklist -->
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

        <!-- Pantalla / Altavoces (collapsible) -->
        <div class="collapse collapse-arrow bg-base-200 rounded-lg mb-3">
          <input type="checkbox" [checked]="cabinetExpanded" (change)="cabinetExpanded = !cabinetExpanded" />
          <div class="collapse-title text-sm font-semibold py-2 min-h-0">
            Pantalla / Altavoces
          </div>
          <div class="collapse-content">
            <div class="grid grid-cols-4 gap-3 mt-1">
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Marca pantalla</span></label>
                <input type="text" class="input input-bordered input-sm" formControlName="cabinetBrand"
                       placeholder="Marshall, Orange…" />
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Configuración</span></label>
                <select class="select select-bordered select-sm" formControlName="speakerConfig">
                  <option value="">— Sin especificar —</option>
                  @for (entry of speakerConfigEntries; track entry[0]) {
                    <option [value]="entry[0]">{{ entry[1] }}</option>
                  }
                </select>
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Marca altavoces</span></label>
                <input type="text" class="input input-bordered input-sm" formControlName="speakerBrand"
                       placeholder="Celestion, Eminence…" />
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Modelo altavoces</span></label>
                <input type="text" class="input input-bordered input-sm" formControlName="speakerModel"
                       placeholder="Vintage 30, G12M…" />
              </div>
            </div>
          </div>
        </div>

        <!-- Row 6: Stage position + Notes side by side -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Posición en escenario</span></label>
            <div class="border border-base-300 rounded-lg overflow-hidden">
              <div class="grid grid-cols-3 bg-base-200 text-xs opacity-60 text-center">
                <div class="py-1">← Fondo</div>
                <div class="py-1">Medio</div>
                <div class="py-1">Frente →</div>
              </div>
              @for (row of stageGrid; track $index) {
                <div class="grid grid-cols-3">
                  @for (cell of row; track cell.pos) {
                    <button type="button"
                            class="btn btn-xs rounded-none border-0 border-r border-b border-base-300"
                            [class.btn-primary]="form.get('stagePosition')?.value === cell.pos"
                            [class.btn-ghost]="form.get('stagePosition')?.value !== cell.pos"
                            (click)="togglePosition(cell.pos)">
                      {{ cell.label }}
                    </button>
                  }
                </div>
              }
              <div class="flex justify-between bg-base-200 text-xs opacity-50 px-2 py-1">
                <span>↑ Stage Left</span>
                <span>Stage Right ↓</span>
              </div>
            </div>
            @if (form.get('stagePosition')?.value) {
              <span class="text-xs mt-1 opacity-60">
                {{ positionLabel }} · click de nuevo para deseleccionar
              </span>
            }
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Notas</span></label>
            <textarea class="textarea textarea-bordered textarea-sm h-36" formControlName="notes"
                      placeholder="Notas opcionales"></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `,
})
export class AmplifierFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<AmplifierFormResult>);
  readonly data = inject<AmplifierFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  cabinetExpanded = false;
  selectedMicIds = new Set<string>();
  private memberMap = new Map<string, string>();

  form = this.fb.group({
    name:          ['', Validators.required],
    type:          ['guitar' as AmpType],
    memberId:      [''],
    brand:         [''],
    model:         [''],
    wattage:       [null as number | null],
    instrumentId:  [''],
    routing:       ['di' as AmpRouting],
    monoStereo:    ['mono' as MonoStereo],
    stagePosition: ['' as StagePosition | ''],
    notes:         [''],
    cabinetBrand:  [''],
    speakerBrand:  [''],
    speakerModel:  [''],
    speakerConfig: ['' as SpeakerConfig | ''],
  });

  ampTypeEntries = Object.entries(AMP_TYPE_LABELS) as [AmpType, string][];
  roleLabels = ROLE_LABELS;
  stageGrid = STAGE_GRID;
  speakerConfigEntries = Object.entries(SPEAKER_CONFIG_LABELS) as [SpeakerConfig, string][];

  get positionLabel(): string {
    const pos = this.form.get('stagePosition')?.value as StagePosition | '';
    return pos ? (STAGE_POSITION_LABELS[pos] ?? pos) : '';
  }

  getMemberName(memberId: string): string { return this.memberMap.get(memberId) ?? memberId; }
  getMemberRoles(m: BandMember): string { return m.roles.map(r => this.roleLabels[r] ?? r).join(', ') || '—'; }

  isMicSelected(id: string): boolean { return this.selectedMicIds.has(id); }
  toggleMic(id: string): void {
    if (this.selectedMicIds.has(id)) this.selectedMicIds.delete(id);
    else this.selectedMicIds.add(id);
  }
  micUsageLabel(usage: string): string {
    return (MIC_USAGE_LABELS as Record<string, string>)[usage] ?? usage;
  }

  ngOnInit(): void {
    this.data.members.forEach(m => this.memberMap.set(m.id, m.name));

    // Pre-check mics already assigned to this amplifier
    const ampId = this.data.amplifier?.id;
    if (ampId) {
      this.data.microphones
        .filter(m => m.assignedToType === 'amplifier' && m.assignedToId === ampId)
        .forEach(m => this.selectedMicIds.add(m.id));
    }

    if (this.data.amplifier) {
      const a = this.data.amplifier;
      const linkedInst = this.data.instruments.find(i => i.ampId === a.id);
      this.form.patchValue({
        name:          a.name,
        type:          a.type,
        memberId:      a.memberId ?? '',
        brand:         a.brand ?? '',
        model:         a.model ?? '',
        wattage:       a.wattage ?? null,
        instrumentId:  linkedInst?.id ?? '',
        routing:       a.routing ?? 'di',
        monoStereo:    a.monoStereo ?? 'mono',
        stagePosition: a.stagePosition ?? '',
        notes:         a.notes ?? '',
        cabinetBrand:  a.cabinetBrand ?? '',
        speakerBrand:  a.speakerBrand ?? '',
        speakerModel:  a.speakerModel ?? '',
        speakerConfig: a.speakerConfig ?? '',
      });
      this.cabinetExpanded = !!(a.cabinetBrand || a.speakerBrand || a.speakerModel || a.speakerConfig);
    }
  }

  togglePosition(pos: StagePosition): void {
    const current = this.form.get('stagePosition')?.value;
    this.form.get('stagePosition')?.setValue(current === pos ? '' : pos);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      memberId:      v.memberId || undefined,
      name:          v.name!,
      type:          v.type as AmpType,
      brand:         v.brand || undefined,
      model:         v.model || undefined,
      wattage:       v.wattage ?? undefined,
      routing:       (v.routing as AmpRouting) ?? 'di',
      monoStereo:    (v.monoStereo as MonoStereo) ?? 'mono',
      stagePosition: (v.stagePosition || undefined) as StagePosition | undefined,
      notes:         v.notes || undefined,
      cabinetBrand:  v.cabinetBrand || undefined,
      speakerBrand:  v.speakerBrand || undefined,
      speakerModel:  v.speakerModel || undefined,
      speakerConfig: (v.speakerConfig || undefined) as SpeakerConfig | undefined,
      instrumentId:  v.instrumentId || undefined,
      micIds:        [...this.selectedMicIds],
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
