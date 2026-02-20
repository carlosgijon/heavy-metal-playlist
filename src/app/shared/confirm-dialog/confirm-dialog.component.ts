import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-box max-w-sm">
      <h3 class="font-bold text-lg">{{ data.title }}</h3>
      <p class="py-4 text-sm opacity-80">{{ data.message }}</p>
      <div class="modal-action">
        <button class="btn btn-sm btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        <button class="btn btn-sm btn-error" type="button" (click)="confirm()">
          {{ data.confirmLabel || 'Eliminar' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
