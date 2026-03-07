import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MerchItem, MERCH_TYPES, MERCH_SIZES, SIZED_MERCH_TYPES } from '../../../core/models/merch.model';

export interface MerchItemFormData {
  item: Partial<MerchItem> | null;
}

@Component({
  selector: 'app-merch-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-box w-full max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Editar producto' : 'Nuevo producto de merch' }}
      </h3>

      <div class="space-y-4">
        <!-- Nombre -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Nombre *</span></label>
          <input class="input input-bordered w-full" type="text" [(ngModel)]="form.name"
            placeholder="ej. Camiseta Negra Logo..." />
        </div>

        <!-- Tipo -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Tipo</span></label>
          <select class="select select-bordered w-full" [(ngModel)]="form.type" (ngModelChange)="onTypeChange($event)">
            @for (t of types; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>

        <!-- Coste y PVP en fila -->
        <div class="grid grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Coste prod./ud (€) *</span></label>
            <input class="input input-bordered w-full" type="number" min="0" step="0.01"
              [(ngModel)]="form.productionCost" placeholder="8.00" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">PVP (€) *</span></label>
            <input class="input input-bordered w-full" type="number" min="0" step="0.01"
              [(ngModel)]="form.sellingPrice" placeholder="25.00" />
          </div>
        </div>

        <!-- Tirada y costes fijos -->
        <div class="grid grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Tirada (uds) *</span></label>
            <input class="input input-bordered w-full" type="number" min="1" step="1"
              [(ngModel)]="form.batchSize" placeholder="50" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Costes fijos (€)</span></label>
            <input class="input input-bordered w-full" type="number" min="0" step="0.01"
              [(ngModel)]="form.fixedCosts" placeholder="0.00" />
            <label class="label"><span class="label-text-alt opacity-60">Diseño, envío...</span></label>
          </div>
        </div>

        <!-- Toggle tallas (solo si el tipo las soporta) -->
        @if (isSizeable) {
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" class="toggle toggle-primary toggle-sm"
                [(ngModel)]="form.hasSizes" (ngModelChange)="onHasSizesChange($event)" />
              <span class="label-text font-semibold">Gestionar stock por tallas (S, M, L...)</span>
            </label>
          </div>
        }

        <!-- Stock por tallas -->
        @if (form.hasSizes) {
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Stock por talla</span></label>
            <div class="grid grid-cols-3 gap-2">
              @for (size of sizes; track size) {
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-center opacity-60">{{ size }}</span>
                  <input class="input input-bordered input-sm w-full text-center" type="number" min="0" step="1"
                    [ngModel]="getSize(size)"
                    (ngModelChange)="setSize(size, $event)"
                    placeholder="0" />
                </div>
              }
            </div>
            <label class="label"><span class="label-text-alt opacity-50">Total: {{ totalSizeStock }} uds</span></label>
          </div>
        } @else {
          <!-- Stock simple -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Stock (uds)</span></label>
            <input class="input input-bordered w-full" type="number" min="0" step="1"
              [(ngModel)]="form.stock" placeholder="0" />
            <label class="label"><span class="label-text-alt opacity-60">Unidades disponibles</span></label>
          </div>
        }

        <!-- Notas -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Notas</span></label>
          <textarea class="textarea textarea-bordered w-full" rows="2"
            [(ngModel)]="form.notes" placeholder="Proveedor, colores, tallas..."></textarea>
        </div>
      </div>

      <div class="modal-action mt-6">
        <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        <button class="btn btn-primary" type="button" [disabled]="!isValid()" (click)="submit()">
          {{ isEdit ? 'Guardar' : 'Crear' }}
        </button>
      </div>
    </div>
  `,
})
export class MerchItemFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Partial<MerchItem>>);
  readonly data = inject<MerchItemFormData>(DIALOG_DATA);

  readonly types = MERCH_TYPES;
  readonly sizes = MERCH_SIZES;

  form: Partial<MerchItem> = {
    name: '',
    type: 't-shirt',
    productionCost: undefined,
    sellingPrice: undefined,
    batchSize: 50,
    fixedCosts: 0,
    stock: 0,
    hasSizes: false,
    stockSizes: {},
    notes: '',
  };

  get isEdit(): boolean { return !!this.data.item?.id; }

  get isSizeable(): boolean {
    return SIZED_MERCH_TYPES.includes(this.form.type ?? '');
  }

  get totalSizeStock(): number {
    if (!this.form.stockSizes) return 0;
    return Object.values(this.form.stockSizes).reduce((a, b) => a + (b || 0), 0);
  }

  ngOnInit(): void {
    if (this.data.item) {
      this.form = { ...this.data.item, stockSizes: { ...(this.data.item.stockSizes ?? {}) } };
    }
    // Init stockSizes object for all sizes if empty
    if (!this.form.stockSizes) {
      this.form.stockSizes = {};
    }
  }

  onTypeChange(type: string): void {
    // If new type doesn't support sizes, disable hasSizes
    if (!SIZED_MERCH_TYPES.includes(type)) {
      this.form.hasSizes = false;
    }
  }

  onHasSizesChange(enabled: boolean): void {
    if (enabled && (!this.form.stockSizes || Object.keys(this.form.stockSizes).length === 0)) {
      this.form.stockSizes = {};
      for (const s of MERCH_SIZES) {
        this.form.stockSizes[s] = 0;
      }
    }
  }

  getSize(size: string): number {
    return this.form.stockSizes?.[size] ?? 0;
  }

  setSize(size: string, value: number): void {
    if (!this.form.stockSizes) this.form.stockSizes = {};
    this.form.stockSizes[size] = Number(value) || 0;
  }

  isValid(): boolean {
    return !!this.form.name?.trim()
      && !!this.form.productionCost && this.form.productionCost >= 0
      && !!this.form.sellingPrice && this.form.sellingPrice > 0
      && !!this.form.batchSize && this.form.batchSize > 0;
  }

  submit(): void {
    if (!this.isValid()) return;
    const result = { ...this.form };
    // Compute total stock from sizes
    if (result.hasSizes && result.stockSizes) {
      result.stock = Object.values(result.stockSizes).reduce((a, b) => a + (b || 0), 0);
    }
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
