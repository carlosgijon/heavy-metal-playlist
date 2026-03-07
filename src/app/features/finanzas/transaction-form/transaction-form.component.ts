import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  Transaction,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../../../core/models/finance.model';

export interface TransactionFormData {
  transaction: Partial<Transaction> | null;
}

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-box w-full max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Editar transacción' : 'Nueva transacción' }}
      </h3>

      <div class="space-y-4">
        <!-- Tipo -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Tipo</span></label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-success" name="type" value="income"
                [(ngModel)]="form.type" (change)="onTypeChange()" />
              <span class="text-success font-semibold">Ingreso</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-error" name="type" value="expense"
                [(ngModel)]="form.type" (change)="onTypeChange()" />
              <span class="text-error font-semibold">Gasto</span>
            </label>
          </div>
        </div>

        <!-- Categoría -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Categoría</span></label>
          <select class="select select-bordered w-full" [(ngModel)]="form.category">
            @for (cat of currentCategories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
        </div>

        <!-- Importe -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Importe (€)</span></label>
          <input class="input input-bordered w-full" type="number" min="0" step="0.01"
            [(ngModel)]="form.amount" placeholder="0.00" />
        </div>

        <!-- Fecha -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Fecha</span></label>
          <input class="input input-bordered w-full" type="date" [(ngModel)]="form.date" />
        </div>

        <!-- Descripción -->
        <div class="form-control">
          <label class="label"><span class="label-text font-semibold">Descripción</span></label>
          <input class="input input-bordered w-full" type="text" [(ngModel)]="form.description"
            placeholder="Descripción opcional..." />
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
export class TransactionFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<Partial<Transaction>>);
  readonly data = inject<TransactionFormData>(DIALOG_DATA);

  readonly incomeCategories = INCOME_CATEGORIES;
  readonly expenseCategories = EXPENSE_CATEGORIES;

  form: Partial<Transaction> = {
    type: 'income',
    category: 'gig',
    amount: undefined,
    date: new Date().toISOString().slice(0, 10),
    description: '',
  };

  get isEdit(): boolean {
    return !!this.data.transaction?.id;
  }

  get currentCategories() {
    return this.form.type === 'income' ? this.incomeCategories : this.expenseCategories;
  }

  ngOnInit(): void {
    if (this.data.transaction) {
      this.form = { ...this.data.transaction };
    }
  }

  onTypeChange(): void {
    this.form.category = this.form.type === 'income' ? 'gig' : 'equipment';
  }

  isValid(): boolean {
    return !!this.form.type && !!this.form.category && !!this.form.amount && this.form.amount > 0 && !!this.form.date;
  }

  submit(): void {
    if (!this.isValid()) return;
    this.dialogRef.close(this.form);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
