import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { MerchItem, MERCH_SIZES } from '../../../core/models/merch.model';

export interface WaitingListFormData {
  item: MerchItem;
  size?: string;
}

export interface WaitingListFormResult {
  name: string;
  quantity: number;
  size?: string;
  contact?: string;
  notes?: string;
}

@Component({
  selector: 'app-waiting-list-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wlf-dialog">
      <div class="wlf-header">
        <div>
          <h2 class="wlf-title">Lista de espera</h2>
          <p class="wlf-sub">{{ data.item.name }}</p>
        </div>
        <button class="btn btn-ghost btn-sm btn-circle" (click)="cancel()">✕</button>
      </div>

      <div class="wlf-body">
        <!-- Name -->
        <div class="form-control mb-3">
          <label class="label py-1"><span class="label-text">Nombre <span class="text-error">*</span></span></label>
          <input type="text" class="input input-bordered input-sm" placeholder="Nombre del cliente"
            [(ngModel)]="name" />
        </div>

        <!-- Size (if item has sizes) -->
        @if (data.item.hasSizes) {
          <div class="form-control mb-3">
            <label class="label py-1"><span class="label-text">Talla</span></label>
            <div class="flex flex-wrap gap-2">
              @for (s of sizes; track s) {
                <button class="btn btn-sm"
                  [class.btn-primary]="size === s"
                  [class.btn-outline]="size !== s"
                  (click)="size = s">{{ s }}</button>
              }
            </div>
          </div>
        }

        <!-- Quantity -->
        <div class="form-control mb-3">
          <label class="label py-1"><span class="label-text">Unidades</span></label>
          <div class="flex items-center gap-2">
            <button class="btn btn-square btn-sm btn-ghost" [disabled]="quantity <= 1" (click)="quantity = quantity - 1">−</button>
            <input type="number" class="input input-bordered input-sm w-20 text-center font-bold"
              min="1" [(ngModel)]="quantity" />
            <button class="btn btn-square btn-sm btn-ghost" (click)="quantity = quantity + 1">+</button>
          </div>
        </div>

        <!-- Contact -->
        <div class="form-control mb-3">
          <label class="label py-1"><span class="label-text">Contacto <span class="opacity-50">(opcional)</span></span></label>
          <input type="text" class="input input-bordered input-sm" placeholder="Teléfono, email, Instagram..."
            [(ngModel)]="contact" />
        </div>

        <!-- Notes -->
        <div class="form-control mb-4">
          <label class="label py-1"><span class="label-text">Notas <span class="opacity-50">(opcional)</span></span></label>
          <input type="text" class="input input-bordered input-sm" placeholder="Cualquier anotación"
            [(ngModel)]="notes" />
        </div>

        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost btn-sm" (click)="cancel()">Cancelar</button>
          <button class="btn btn-primary btn-sm" [disabled]="!name.trim()" (click)="confirm()">
            Añadir a la lista
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wlf-dialog {
      background: oklch(var(--b1));
      color: oklch(var(--bc));
      border-radius: 12px;
      width: 400px;
      max-width: 95vw;
      padding: 20px;
    }
    .wlf-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .wlf-title { font-size: 1rem; font-weight: 700; }
    .wlf-sub { font-size: 0.8rem; opacity: 0.55; margin-top: 2px; }
  `],
})
export class WaitingListFormComponent {
  private readonly dialogRef = inject(DialogRef<WaitingListFormResult>);
  readonly data = inject<WaitingListFormData>(DIALOG_DATA);

  readonly sizes = MERCH_SIZES;

  name = '';
  quantity = 1;
  size: string | undefined = this.data.size;
  contact = '';
  notes = '';

  confirm(): void {
    if (!this.name.trim()) return;
    this.dialogRef.close({
      name: this.name.trim(),
      quantity: this.quantity,
      size: this.size,
      contact: this.contact.trim() || undefined,
      notes: this.notes.trim() || undefined,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
