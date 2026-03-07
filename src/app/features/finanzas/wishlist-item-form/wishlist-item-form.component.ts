import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { WishListItem, WISHLIST_CATEGORIES } from '../../../core/models/finance.model';

export interface WishListFormData {
  item: Partial<WishListItem> | null;
}

export interface WishListFormResult extends Partial<WishListItem> {
  finalPrice?: number;
}

@Component({
  selector: 'app-wishlist-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-box w-full max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Editar elemento' : 'Añadir a la lista de deseos' }}
      </h3>

      <div class="space-y-4">
        <!-- Nombre -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Nombre *</span></label>
          <input class="input input-bordered w-full" type="text" [(ngModel)]="form.name"
            placeholder="ej. Gibson Les Paul Standard..." />
        </div>

        <!-- Categoría -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Categoría</span></label>
          <select class="select select-bordered w-full" [(ngModel)]="form.category">
            @for (cat of categories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
        </div>

        <!-- Precio estimado -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Precio estimado (€)</span></label>
          <input class="input input-bordered w-full" type="number" min="0" step="0.01"
            [(ngModel)]="form.estimatedPrice" placeholder="Opcional..." />
        </div>

        <!-- Prioridad -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Prioridad</span></label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-error" name="priority" value="high"
                [(ngModel)]="form.priority" />
              <span class="font-semibold text-error">Alta</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-warning" name="priority" value="medium"
                [(ngModel)]="form.priority" />
              <span class="font-semibold text-warning">Media</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio" name="priority" value="low"
                [(ngModel)]="form.priority" />
              <span class="font-semibold opacity-60">Baja</span>
            </label>
          </div>
        </div>

        <!-- Marcar como adquirido -->
        @if (isEdit && !wasAlreadyPurchased) {
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" class="checkbox checkbox-success"
                [(ngModel)]="form.purchased" (ngModelChange)="onPurchasedChange($event)" />
              <span class="label-text font-semibold">Marcar como adquirido</span>
            </label>
          </div>

          @if (form.purchased) {
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Precio final pagado (€)</span>
                <span class="label-text-alt opacity-50">Se añadirá como gasto en Finanzas</span>
              </label>
              <input class="input input-bordered w-full input-success" type="number" min="0" step="0.01"
                [(ngModel)]="finalPrice"
                [placeholder]="form.estimatedPrice ? form.estimatedPrice.toString() : '0.00'" />
            </div>
          }
        }

        <!-- Notas -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Notas</span></label>
          <textarea class="textarea textarea-bordered w-full" rows="2"
            [(ngModel)]="form.notes" placeholder="Notas opcionales..."></textarea>
        </div>
      </div>

      <div class="modal-action mt-6">
        <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        <button class="btn btn-primary" type="button" [disabled]="!isValid()" (click)="submit()">
          {{ isEdit ? 'Guardar' : 'Añadir' }}
        </button>
      </div>
    </div>
  `,
})
export class WishListItemFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<WishListFormResult>);
  readonly data = inject<WishListFormData>(DIALOG_DATA);

  readonly categories = WISHLIST_CATEGORIES;

  form: Partial<WishListItem> = {
    name: '',
    category: 'instrument',
    priority: 'medium',
    estimatedPrice: undefined,
    notes: '',
    purchased: false,
  };

  finalPrice?: number;
  wasAlreadyPurchased = false;

  get isEdit(): boolean {
    return !!this.data.item?.id;
  }

  ngOnInit(): void {
    if (this.data.item) {
      this.form = { ...this.data.item };
      this.wasAlreadyPurchased = !!this.data.item.purchased;
    }
  }

  onPurchasedChange(value: boolean): void {
    if (!value) this.finalPrice = undefined;
  }

  isValid(): boolean {
    return !!this.form.name?.trim();
  }

  submit(): void {
    if (!this.isValid()) return;
    const result: WishListFormResult = { ...this.form };
    if (this.form.purchased && !this.wasAlreadyPurchased && this.finalPrice != null) {
      result.finalPrice = this.finalPrice;
    }
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
