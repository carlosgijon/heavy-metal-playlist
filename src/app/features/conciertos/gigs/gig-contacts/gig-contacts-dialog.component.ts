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
import {
  Gig, GigContact, GigContactType,
  GIG_CONTACT_TYPE_LABELS, GIG_CONTACT_TYPES,
} from '../../../../core/models/gig.model';

export interface GigContactsDialogData { gig: Gig; }

@Component({
  selector: 'app-gig-contacts-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPlus, heroTrash, heroXMark })],
  template: `
    <div class="modal-box w-11/12 max-w-2xl max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="font-bold text-lg">Seguimiento</h3>
          <p class="text-sm opacity-60">{{ data.gig.title }}</p>
        </div>
        <button class="btn btn-sm btn-ghost btn-circle" (click)="close()">
          <ng-icon name="heroXMark" size="16" />
        </button>
      </div>

      <!-- Follow-up reminder -->
      <div class="card card-bordered bg-base-200 mb-4">
        <div class="card-body p-3">
          <h4 class="font-semibold text-sm mb-2">Próximo recordatorio</h4>
          <div class="flex gap-2 flex-wrap items-end">
            <div class="form-control min-w-36">
              <label class="label py-0"><span class="label-text text-xs">Fecha</span></label>
              <input type="date" class="input input-sm input-bordered" [(ngModel)]="followUpDate" />
            </div>
            <div class="form-control flex-1 min-w-48">
              <label class="label py-0"><span class="label-text text-xs">Nota</span></label>
              <input type="text" class="input input-sm input-bordered"
                     [(ngModel)]="followUpNote"
                     placeholder="ej. Llamar para confirmar caché" />
            </div>
            <button class="btn btn-sm btn-primary" (click)="saveFollowUp()">Guardar</button>
            @if (followUpDate) {
              <button class="btn btn-sm btn-ghost text-error" (click)="clearFollowUp()">Borrar</button>
            }
          </div>
          @if (currentFollowUpDate) {
            <p class="text-xs opacity-60 mt-2">
              Recordatorio activo: <strong>{{ formatDate(currentFollowUpDate) }}</strong>
              @if (currentFollowUpNote) { · {{ currentFollowUpNote }} }
            </p>
          }
        </div>
      </div>

      <!-- Contact log -->
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-semibold text-sm">Historial de contactos</h4>
        <button class="btn btn-xs btn-primary gap-1" (click)="startNew()">
          <ng-icon name="heroPlus" size="12" /> Añadir
        </button>
      </div>

      @if (addingNew) {
        <div class="card card-bordered bg-base-200 p-3 mb-3">
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div class="form-control">
              <label class="label py-0"><span class="label-text text-xs">Fecha</span></label>
              <input type="date" class="input input-sm input-bordered" [(ngModel)]="newDate" />
            </div>
            <div class="form-control">
              <label class="label py-0"><span class="label-text text-xs">Tipo</span></label>
              <select class="select select-sm select-bordered" [(ngModel)]="newType">
                @for (t of contactTypes; track t) {
                  <option [value]="t">{{ typeLabel(t) }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-control mb-2">
            <label class="label py-0"><span class="label-text text-xs">Notas</span></label>
            <textarea class="textarea textarea-sm textarea-bordered"
                      [(ngModel)]="newNotes"
                      placeholder="Resultado, próximos pasos..."
                      rows="2"></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="btn btn-sm btn-ghost" (click)="cancelNew()">Cancelar</button>
            <button class="btn btn-sm btn-primary" (click)="saveNew()" [disabled]="!newDate">Guardar</button>
          </div>
        </div>
      }

      <!-- Contact list -->
      <div class="flex-1 overflow-y-auto">
        @if (loading) {
          <div class="flex justify-center py-6">
            <span class="loading loading-spinner loading-sm"></span>
          </div>
        } @else if (contacts.length === 0 && !addingNew) {
          <p class="text-center opacity-50 py-6 text-sm">Sin contactos registrados.</p>
        } @else {
          @for (c of contacts; track c.id) {
            <div class="flex gap-3 py-2 border-b border-base-300 items-start">
              <span class="text-base mt-0.5">{{ typeEmoji(c.contactType) }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="badge badge-xs badge-outline">{{ typeLabel(c.contactType) }}</span>
                  <span class="text-xs opacity-60">{{ formatDate(c.date) }}</span>
                </div>
                @if (c.notes) {
                  <p class="text-sm opacity-80 mt-0.5 break-words">{{ c.notes }}</p>
                }
              </div>
              <button class="btn btn-ghost btn-xs text-error flex-shrink-0" (click)="deleteContact(c)">
                <ng-icon name="heroTrash" size="12" />
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class GigContactsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<GigContactsDialogData>(DIALOG_DATA);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);
  private confirmDialog = inject(Dialog);

  contacts: GigContact[] = [];
  loading = false;
  dirty = false;

  // Follow-up form
  currentFollowUpDate = this.data.gig.followUpDate ?? '';
  currentFollowUpNote = this.data.gig.followUpNote ?? '';
  followUpDate = this.data.gig.followUpDate ?? '';
  followUpNote = this.data.gig.followUpNote ?? '';

  // New contact form
  addingNew = false;
  newDate = new Date().toISOString().slice(0, 10);
  newType: GigContactType = 'call';
  newNotes = '';

  readonly contactTypes = GIG_CONTACT_TYPES;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.contacts = await this.db.getGigContacts(this.data.gig.id);
    } catch { this.toast.danger('Error al cargar el historial'); }
    finally { this.loading = false; }
  }

  typeLabel(t: GigContactType | string): string {
    return GIG_CONTACT_TYPE_LABELS[t as GigContactType] ?? t;
  }

  typeEmoji(t: GigContactType | string): string {
    const map: Record<string, string> = {
      call: '📞', email: '✉️', meeting: '🤝', message: '💬', other: '📝',
    };
    return map[t] ?? '📝';
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  async saveFollowUp(): Promise<void> {
    try {
      await this.db.updateGigFollowUp(
        this.data.gig.id,
        this.followUpDate || undefined,
        this.followUpNote || undefined,
      );
      this.currentFollowUpDate = this.followUpDate;
      this.currentFollowUpNote = this.followUpNote;
      this.dirty = true;
      this.toast.success('Recordatorio guardado');
    } catch { this.toast.danger('Error al guardar el recordatorio'); }
  }

  async clearFollowUp(): Promise<void> {
    try {
      await this.db.updateGigFollowUp(this.data.gig.id, undefined, undefined);
      this.followUpDate = '';
      this.followUpNote = '';
      this.currentFollowUpDate = '';
      this.currentFollowUpNote = '';
      this.dirty = true;
      this.toast.warning('Recordatorio eliminado');
    } catch { this.toast.danger('Error al eliminar el recordatorio'); }
  }

  startNew(): void { this.addingNew = true; }
  cancelNew(): void { this.addingNew = false; this.newNotes = ''; }

  async saveNew(): Promise<void> {
    if (!this.newDate) return;
    try {
      await this.db.createGigContact({
        gigId: this.data.gig.id,
        date: this.newDate,
        contactType: this.newType,
        notes: this.newNotes || undefined,
      });
      this.toast.success('Contacto registrado');
      this.addingNew = false;
      this.newNotes = '';
      await this.load();
    } catch { this.toast.danger('Error al guardar'); }
  }

  deleteContact(c: GigContact): void {
    const ref = this.confirmDialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: {
        title: 'Eliminar contacto',
        message: `¿Eliminar este registro de ${this.typeLabel(c.contactType)}?`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteGigContact(c.id);
        this.toast.warning('Contacto eliminado');
        await this.load();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  close(): void { this.dialogRef.close(this.dirty); }
}
