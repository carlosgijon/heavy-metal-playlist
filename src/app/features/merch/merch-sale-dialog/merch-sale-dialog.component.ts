import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MerchItem, MerchSaleDto, MERCH_SIZES } from '../../../core/models/merch.model';

@Component({
  selector: 'app-merch-sale-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-box w-full max-w-md">
      <h3 class="font-bold text-lg mb-1">Vender — {{ item.name }}</h3>
      <p class="text-sm opacity-50 mb-4">{{ item.sellingPrice.toFixed(2) }} € / ud</p>

      @if (effectiveStock === 0) {
        <div class="alert alert-error mb-4">
          <span>Sin stock disponible{{ selectedSize ? ' en talla ' + selectedSize : '' }}.</span>
        </div>
      }

      <div class="space-y-4">
        <!-- Selector de talla (si el item tiene tallas) -->
        @if (item.hasSizes) {
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Talla *</span></label>
            <div class="flex flex-wrap gap-2">
              @for (size of sizes; track size) {
                @let sizeStock = getSizeStock(size);
                <button type="button"
                  class="btn btn-sm"
                  [class.btn-primary]="selectedSize === size"
                  [class.btn-ghost]="selectedSize !== size"
                  [disabled]="sizeStock === 0"
                  (click)="selectSize(size)">
                  {{ size }}
                  <span class="ml-1 text-xs opacity-60">({{ sizeStock }})</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Stock actual -->
        <div class="flex items-center justify-between p-2 rounded-lg" style="background: oklch(var(--b2))">
          <span class="text-sm opacity-60">Stock disponible{{ selectedSize ? ' [' + selectedSize + ']' : '' }}:</span>
          <span class="font-bold text-lg" [class.text-error]="effectiveStock === 0"
            [class.text-warning]="effectiveStock > 0 && effectiveStock <= 5">
            {{ effectiveStock }} uds
          </span>
        </div>

        @if (effectiveStock > 0 || !item.hasSizes || selectedSize) {
          <!-- Cantidad -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Cantidad *</span></label>
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-square btn-sm btn-ghost"
                [disabled]="(form.quantity ?? 1) <= 1" (click)="changeQty(-1)">−</button>
              <input class="input input-bordered flex-1 text-center font-bold" type="number" min="1"
                [max]="effectiveStock" [(ngModel)]="form.quantity" />
              <button type="button" class="btn btn-square btn-sm btn-ghost"
                [disabled]="(form.quantity ?? 1) >= effectiveStock" (click)="changeQty(1)">+</button>
            </div>
            <label class="label"><span class="label-text-alt opacity-50">Máx: {{ effectiveStock }}</span></label>
          </div>

          <!-- Total -->
          <div class="flex justify-between items-center p-3 rounded-lg"
               style="background: oklch(var(--su)/0.1); border: 1px solid oklch(var(--su)/0.3)">
            <span class="font-semibold">Total venta</span>
            <span class="text-xl font-bold" style="color: oklch(var(--su))">
              {{ ((form.quantity || 0) * item.sellingPrice).toFixed(2) }} €
            </span>
          </div>

          <!-- Fecha -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Fecha *</span></label>
            <input class="input input-bordered w-full" type="date" [(ngModel)]="form.date" />
          </div>

          <!-- Notas -->
          <div class="form-control">
            <label class="label"><span class="label-text font-semibold">Notas</span></label>
            <input class="input input-bordered w-full" type="text" [(ngModel)]="form.notes"
              placeholder="Concierto, evento, mercadillo..." />
          </div>
        }
      </div>

      <div class="modal-action mt-6">
        <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        <button class="btn btn-success" type="button" [disabled]="!isValid()" (click)="submit()">
          Registrar venta
        </button>
      </div>
    </div>
  `,
})
export class MerchSaleDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<MerchSaleDto>);
  readonly item = inject<MerchItem>(DIALOG_DATA);

  readonly sizes = MERCH_SIZES;
  selectedSize: string | undefined;

  form: Partial<MerchSaleDto> = {
    quantity: 1,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  };

  ngOnInit(): void {
    // Auto-select first size with stock
    if (this.item.hasSizes && this.item.stockSizes) {
      const first = MERCH_SIZES.find(s => (this.item.stockSizes?.[s] ?? 0) > 0);
      if (first) this.selectedSize = first;
    }
  }

  get effectiveStock(): number {
    if (this.item.hasSizes) {
      if (!this.selectedSize) return 0;
      return this.item.stockSizes?.[this.selectedSize] ?? 0;
    }
    return this.item.stock;
  }

  getSizeStock(size: string): number {
    return this.item.stockSizes?.[size] ?? 0;
  }

  selectSize(size: string): void {
    this.selectedSize = size;
    // Reset quantity if exceeds new size stock
    if ((this.form.quantity ?? 1) > this.effectiveStock) {
      this.form.quantity = 1;
    }
  }

  changeQty(delta: number): void {
    const q = (this.form.quantity ?? 1) + delta;
    this.form.quantity = Math.max(1, Math.min(q, this.effectiveStock));
  }

  isValid(): boolean {
    if (this.item.hasSizes && !this.selectedSize) return false;
    return !!this.form.quantity && this.form.quantity > 0
      && this.form.quantity <= this.effectiveStock
      && !!this.form.date;
  }

  submit(): void {
    if (!this.isValid()) return;
    this.dialogRef.close({
      quantity: this.form.quantity!,
      unitPrice: this.item.sellingPrice,
      date: this.form.date!,
      size: this.selectedSize,
      notes: this.form.notes,
    } as MerchSaleDto);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
