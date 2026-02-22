import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  PaEquipment, PaCategory, MonitorType,
  PA_CATEGORY_LABELS, MONITOR_TYPE_LABELS,
} from '../../../../core/models/equipment.model';

export interface PaFormData { item: PaEquipment | null; }

@Component({
  selector: 'app-pa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-4">
        {{ data.item ? 'Editar equipo PA' : 'Nuevo equipo PA' }}
      </h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control col-span-2">
            <label class="label"><span class="label-text">Categoría *</span></label>
            <select class="select select-bordered select-sm" formControlName="category">
              @for (entry of categoryEntries; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1] }}</option>
              }
            </select>
          </div>
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nombre *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="name"
                 placeholder="Ej: Yamaha CL5" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
          }
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Marca</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="brand" placeholder="Yamaha" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Modelo</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="model" placeholder="CL5" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Cantidad</span></label>
            <input type="number" class="input input-bordered input-sm" formControlName="quantity" min="1" />
          </div>
          @if (isConsole) {
            <div class="form-control">
              <label class="label"><span class="label-text">Canales</span></label>
              <input type="number" class="input input-bordered input-sm" formControlName="channels" min="0" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Aux sends</span></label>
              <input type="number" class="input input-bordered input-sm" formControlName="auxSends" min="0" />
            </div>
          }
          @if (hasPower) {
            <div class="form-control col-span-2">
              <label class="label"><span class="label-text">Potencia (W)</span></label>
              <input type="number" class="input input-bordered input-sm" formControlName="wattage" min="0" />
            </div>
          }
        </div>

        <!-- Monitor type fields (only when category = monitor) -->
        @if (isMonitor) {
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="form-control">
              <label class="label"><span class="label-text">Tipo de monitor</span></label>
              <select class="select select-bordered select-sm" formControlName="monitorType">
                <option value="">— Sin especificar —</option>
                @for (entry of monitorTypeEntries; track entry[0]) {
                  <option [value]="entry[0]">{{ entry[1] }}</option>
                }
              </select>
            </div>
            @if (isIem) {
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3 h-full pt-8">
                  <input type="checkbox" class="checkbox checkbox-sm" formControlName="iemWireless" />
                  <span class="label-text">Inalámbrico</span>
                </label>
              </div>
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
export class PaFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Omit<PaEquipment, 'id'>>);
  readonly data = inject<PaFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    category: ['console' as PaCategory],
    name: ['', Validators.required],
    brand: [''],
    model: [''],
    quantity: [1],
    channels: [null as number | null],
    auxSends: [null as number | null],
    wattage: [null as number | null],
    notes: [''],
    monitorType: ['' as MonitorType | ''],
    iemWireless: [false],
  });

  categoryEntries = Object.entries(PA_CATEGORY_LABELS) as [PaCategory, string][];
  monitorTypeEntries = Object.entries(MONITOR_TYPE_LABELS) as [MonitorType, string][];

  get isConsole(): boolean { return this.form.get('category')?.value === 'console'; }
  get isMonitor(): boolean { return this.form.get('category')?.value === 'monitor'; }
  get isIem(): boolean { return this.form.get('monitorType')?.value === 'iem'; }
  get hasPower(): boolean {
    const c = this.form.get('category')?.value;
    return ['main-speaker', 'subwoofer', 'monitor', 'power-amp'].includes(c ?? '');
  }

  ngOnInit(): void {
    if (this.data.item) {
      const i = this.data.item;
      this.form.patchValue({
        category: i.category, name: i.name, brand: i.brand ?? '',
        model: i.model ?? '', quantity: i.quantity,
        channels: i.channels ?? null, auxSends: i.auxSends ?? null,
        wattage: i.wattage ?? null, notes: i.notes ?? '',
        monitorType: i.monitorType ?? '',
        iemWireless: i.iemWireless ?? false,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      category: v.category as PaCategory, name: v.name!,
      brand: v.brand || undefined, model: v.model || undefined,
      quantity: v.quantity ?? 1,
      channels: v.channels ?? undefined, auxSends: v.auxSends ?? undefined,
      wattage: v.wattage ?? undefined, notes: v.notes || undefined,
      monitorType: (v.monitorType || undefined) as MonitorType | undefined,
      iemWireless: v.iemWireless ?? false,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
