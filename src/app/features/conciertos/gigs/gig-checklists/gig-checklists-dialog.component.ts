import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash, heroXMark } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../../core/services/database.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/confirm-dialog/confirm-dialog.component';
import { Dialog } from '@angular/cdk/dialog';
import { Gig, GigChecklist } from '../../../../core/models/gig.model';
import { ChecklistComponent } from '../../checklist/checklist.component';

export interface GigChecklistsDialogData { gig: Gig; }

@Component({
  selector: 'app-gig-checklists-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ChecklistComponent],
  providers: [provideIcons({ heroPlus, heroTrash, heroXMark })],
  template: `
    <div class="modal-box w-11/12 max-w-2xl max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="font-bold text-lg">Checklists</h3>
          <p class="text-sm opacity-60">{{ data.gig.title }}</p>
        </div>
        <button class="btn btn-sm btn-ghost btn-circle" (click)="close()">
          <ng-icon name="heroXMark" size="16" />
        </button>
      </div>

      <!-- Checklist sections -->
      <div class="flex-1 overflow-y-auto space-y-4 pr-1">
        @if (loading) {
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>
        } @else if (checklists.length === 0) {
          <p class="text-center opacity-50 py-8 text-sm">
            Sin checklists. Crea uno con el botón de abajo.
          </p>
        } @else {
          @for (cl of checklists; track cl.id) {
            <div class="card card-bordered bg-base-200">
              <div class="card-body p-3">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-sm">{{ cl.name }}</h4>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteChecklist(cl)">
                    <ng-icon name="heroTrash" size="12" />
                  </button>
                </div>
                <app-checklist [checklistId]="cl.id" />
              </div>
            </div>
          }
        }
      </div>

      <!-- New checklist input -->
      <div class="divider my-3"></div>
      @if (addingNew) {
        <div class="flex gap-2">
          <input class="input input-sm input-bordered flex-1"
                 [(ngModel)]="newName"
                 placeholder="Nombre del checklist..."
                 (keydown.enter)="createChecklist()"
                 (keydown.escape)="cancelNew()"
                 autofocus />
          <button class="btn btn-sm btn-primary" (click)="createChecklist()">Crear</button>
          <button class="btn btn-sm btn-ghost" (click)="cancelNew()">×</button>
        </div>
      } @else {
        <button class="btn btn-sm btn-outline gap-2 w-full" (click)="startNew()">
          <ng-icon name="heroPlus" size="14" /> Nueva checklist
        </button>
      }
    </div>
  `,
})
export class GigChecklistsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<void>);
  readonly data = inject<GigChecklistsDialogData>(DIALOG_DATA);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);
  private confirmDialog = inject(Dialog);

  checklists: GigChecklist[] = [];
  loading = false;
  addingNew = false;
  newName = '';

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.checklists = await this.db.getGigChecklists(this.data.gig.id);
    } catch { this.toast.danger('Error al cargar las checklists'); }
    finally { this.loading = false; }
  }

  startNew(): void { this.addingNew = true; this.newName = ''; }
  cancelNew(): void { this.addingNew = false; this.newName = ''; }

  async createChecklist(): Promise<void> {
    const name = this.newName.trim();
    if (!name) return;
    try {
      await this.db.createGigChecklist({ gigId: this.data.gig.id, name });
      this.toast.success(`"${name}" creada`);
      this.addingNew = false;
      this.newName = '';
      await this.load();
    } catch { this.toast.danger('Error al crear la checklist'); }
  }

  deleteChecklist(cl: GigChecklist): void {
    const ref = this.confirmDialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: {
        title: 'Eliminar checklist',
        message: `¿Eliminar "${cl.name}" y todos sus ítems?`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteGigChecklist(cl.id);
        this.toast.warning(`"${cl.name}" eliminada`);
        await this.load();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  close(): void { this.dialogRef.close(); }
}
