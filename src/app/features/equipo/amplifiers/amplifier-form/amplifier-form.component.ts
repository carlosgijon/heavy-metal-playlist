import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Amplifier, AmpType, BandMember, Microphone, SpeakerConfig,
  StagePosition, ROLE_LABELS, STAGE_POSITION_LABELS, SPEAKER_CONFIG_LABELS,
} from '../../../../core/models/equipment.model';

export interface AmplifierFormData {
  amplifier: Amplifier | null;
  members: BandMember[];
  microphones: Microphone[];
}

const AMP_TYPE_LABELS: Record<AmpType, string> = {
  guitar: 'Guitarra', bass: 'Bajo', keyboard: 'Teclado',
};

const STAGE_GRID: { pos: StagePosition; label: string }[][] = [
  [
    { pos: 'back-left',   label: 'F. Izq' },
    { pos: 'back-center', label: 'F. Centro' },
    { pos: 'back-right',  label: 'F. Der' },
  ],
  [
    { pos: 'front-left',   label: 'D. Izq' },
    { pos: 'front-center', label: 'D. Centro' },
    { pos: 'front-right',  label: 'D. Der' },
  ],
];

@Component({
  selector: 'app-amplifier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        {{ data.amplifier ? 'Editar amplificador' : 'Nuevo amplificador' }}
      </h3>
      <form [formGroup]="form" (ngSubmit)="submit()">

        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nombre *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="name"
                 placeholder="Ej: Marshall JCM800" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
          }
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              @for (entry of ampTypeEntries; track entry[0]) {
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
            <input type="text" class="input input-bordered input-sm" formControlName="brand" placeholder="Marshall" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model" placeholder="JCM800" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Potencia (W)</span></label>
            <input type="number" class="input input-bordered input-sm" formControlName="wattage"
                   min="0" placeholder="100" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Micrófono asignado</span></label>
            <select class="select select-bordered select-sm" formControlName="micId">
              <option value="">Sin micrófono</option>
              @for (m of data.microphones; track m.id) {
                <option [value]="m.id">{{ m.name }}{{ m.model ? ' · ' + m.model : '' }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Pantalla / Altavoces (collapsible) -->
        <div class="collapse collapse-arrow bg-base-200 rounded-lg mb-3">
          <input type="checkbox" [checked]="cabinetExpanded" (change)="cabinetExpanded = !cabinetExpanded" />
          <div class="collapse-title text-sm font-semibold py-2 min-h-0">
            Pantalla / Altavoces
          </div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 gap-3 mt-1">
              <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs">Marca de la pantalla</span></label>
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

        <!-- Stage position grid (2 rows × 3 cols: back / front) -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Posición en escenario</span></label>
          <div class="border border-base-300 rounded-lg overflow-hidden">
            <div class="bg-base-300 text-center text-xs py-1 font-bold tracking-widest opacity-60">
              FONDO
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
            <div class="bg-error/20 text-center text-xs py-1 font-bold tracking-widest opacity-60">
              PÚBLICO
            </div>
          </div>
          @if (form.get('stagePosition')?.value) {
            <span class="text-xs mt-1 opacity-60">
              {{ positionLabel }} · click de nuevo para deseleccionar
            </span>
          }
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
export class AmplifierFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Omit<Amplifier, 'id'>>);
  readonly data = inject<AmplifierFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  cabinetExpanded = false;

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['guitar' as AmpType],
    memberId: [''],
    brand: [''],
    model: [''],
    wattage: [null as number | null],
    micId: [''],
    stagePosition: ['' as StagePosition | ''],
    notes: [''],
    cabinetBrand: [''],
    speakerBrand: [''],
    speakerModel: [''],
    speakerConfig: ['' as SpeakerConfig | ''],
  });

  ampTypeEntries = Object.entries(AMP_TYPE_LABELS) as [AmpType, string][];
  roleLabels = ROLE_LABELS;
  positionLabels = STAGE_POSITION_LABELS;
  stageGrid = STAGE_GRID;
  speakerConfigEntries = Object.entries(SPEAKER_CONFIG_LABELS) as [SpeakerConfig, string][];

  get positionLabel(): string {
    const pos = this.form.get('stagePosition')?.value as StagePosition | '';
    return pos ? (STAGE_POSITION_LABELS[pos] ?? pos) : '';
  }

  ngOnInit(): void {
    if (this.data.amplifier) {
      const a = this.data.amplifier;
      this.form.patchValue({
        name: a.name, type: a.type, memberId: a.memberId ?? '',
        brand: a.brand ?? '', model: a.model ?? '',
        wattage: a.wattage ?? null,
        micId: a.micId ?? '',
        stagePosition: a.stagePosition ?? '',
        notes: a.notes ?? '',
        cabinetBrand: a.cabinetBrand ?? '',
        speakerBrand: a.speakerBrand ?? '',
        speakerModel: a.speakerModel ?? '',
        speakerConfig: a.speakerConfig ?? '',
      });
      // Auto-expand if any cabinet field has value
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
      memberId: v.memberId || undefined,
      name: v.name!,
      type: v.type as AmpType,
      brand: v.brand || undefined,
      model: v.model || undefined,
      wattage: v.wattage ?? undefined,
      micId: v.micId || undefined,
      stagePosition: (v.stagePosition || undefined) as StagePosition | undefined,
      notes: v.notes || undefined,
      cabinetBrand: v.cabinetBrand || undefined,
      speakerBrand: v.speakerBrand || undefined,
      speakerModel: v.speakerModel || undefined,
      speakerConfig: (v.speakerConfig || undefined) as SpeakerConfig | undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
