import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencil, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PaEquipment, PaCategory, PA_CATEGORY_LABELS } from '../../../core/models/equipment.model';
import { PaFormComponent, PaFormData } from './pa-form/pa-form.component';

@Component({
  selector: 'app-pa',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroPencil, heroTrash, heroPlus })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <input class="input input-sm input-bordered w-64" [(ngModel)]="search"
             placeholder="Buscar equipo PA..." />
      <button class="btn btn-sm btn-primary gap-1" (click)="openForm(null)">
        <ng-icon name="heroPlus" size="14" /> Añadir equipo
      </button>
    </div>

    <!-- Category filter tabs -->
    <div class="tabs tabs-boxed mb-3 flex-wrap gap-1">
      <button class="tab tab-sm" [class.tab-active]="activeCategory === ''" (click)="activeCategory = ''">Todos</button>
      @for (entry of categoryEntries; track entry[0]) {
        <button class="tab tab-sm" [class.tab-active]="activeCategory === entry[0]"
                (click)="activeCategory = entry[0]">{{ entry[1] }}</button>
      }
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra table-sm w-full">
        <thead>
          <tr><th>Nombre</th><th>Categoría</th><th>Marca / Modelo</th><th>Cantidad</th><th>Detalles</th><th>Notas</th><th></th></tr>
        </thead>
        <tbody>
          @for (item of filtered; track item.id) {
            <tr>
              <td class="font-medium">{{ item.name }}</td>
              <td><span class="badge badge-sm badge-outline">{{ categoryLabels[item.category] }}</span></td>
              <td>{{ brandModel(item.brand, item.model) }}</td>
              <td>{{ item.quantity }}</td>
              <td class="text-sm">
                @if (item.channels) { <span>{{ item.channels }} ch</span> }
                @if (item.auxSends) { <span class="ml-1">{{ item.auxSends }} aux</span> }
                @if (item.wattage) { <span>{{ item.wattage }} W</span> }
                @if (!item.channels && !item.auxSends && !item.wattage) { <span class="opacity-40">—</span> }
              </td>
              <td class="text-sm opacity-60">{{ item.notes }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-ghost btn-xs" (click)="openForm(item)"><ng-icon name="heroPencil" size="14" /></button>
                  <button class="btn btn-ghost btn-xs text-error" (click)="deleteItem(item)"><ng-icon name="heroTrash" size="14" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-center opacity-50 py-6">
              {{ search ? 'Sin resultados' : 'No hay equipos PA. Añade el primero.' }}
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PaComponent {
  @Input() paEquipment: PaEquipment[] = [];
  @Output() changed = new EventEmitter<void>();

  private dialog = inject(Dialog);
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  search = '';
  activeCategory: PaCategory | '' = '';
  categoryLabels = PA_CATEGORY_LABELS;
  categoryEntries = Object.entries(PA_CATEGORY_LABELS) as [PaCategory, string][];

  brandModel(brand?: string, model?: string): string { return [brand, model].filter(s => !!s).join(' ') || '—'; }

  get filtered(): PaEquipment[] {
    let items = this.paEquipment;
    if (this.activeCategory) items = items.filter(i => i.category === this.activeCategory);
    const q = this.search.trim().toLowerCase();
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    return items;
  }

  openForm(item: PaEquipment | null): void {
    const ref = this.dialog.open<Omit<PaEquipment, 'id'>>(PaFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { item } satisfies PaFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (item) { await this.db.updatePaItem({ ...result, id: item.id }); this.toast.success(`"${result.name}" actualizado`); }
        else { await this.db.createPaItem(result); this.toast.success(`"${result.name}" añadido`); }
        this.changed.emit();
      } catch { this.toast.danger('Error al guardar'); }
    });
  }

  deleteItem(item: PaEquipment): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar equipo', message: `¿Eliminar "${item.name}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deletePaItem(item.id);
        this.toast.warning(`"${item.name}" eliminado`);
        this.changed.emit();
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }
}
