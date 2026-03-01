import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash, heroArrowPath } from '@ng-icons/heroicons/outline';
import { Dialog } from '@angular/cdk/dialog';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  ChecklistItem, ChecklistCategory, CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS,
} from '../../../core/models/gig.model';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NgIconComponent],
  providers: [provideIcons({ heroPlus, heroTrash, heroArrowPath })],
  template: `
    <div class="flex items-center justify-between mb-3">
      <div>
        <div class="flex justify-between text-xs opacity-60 mb-1">
          <span>{{ doneCount }} / {{ sorted.length }} completados</span>
          <span>{{ progressPct }}%</span>
        </div>
        <progress class="progress progress-success w-48" [value]="doneCount" [max]="sorted.length || 1"></progress>
      </div>
      <button class="btn btn-xs btn-ghost gap-1" (click)="confirmReset()"
              [disabled]="sorted.length === 0">
        <ng-icon name="heroArrowPath" size="14" /> Reset
      </button>
    </div>

    <!-- Items by category -->
    @for (cat of categories; track cat) {
      @if (byCategory(cat).length > 0 || newItemCategory === cat) {
        <div class="mb-3">
          <h4 class="text-xs font-semibold opacity-50 uppercase tracking-wider mb-1">{{ categoryLabels[cat] }}</h4>
          <div cdkDropList [cdkDropListData]="cat"
               (cdkDropListDropped)="drop($event)"
               class="flex flex-col gap-1">
            @for (item of byCategory(cat); track item.id) {
              <div cdkDrag class="flex items-center gap-2 group py-1 px-2 rounded hover:bg-base-200">
                <span cdkDragHandle class="cursor-grab opacity-30 group-hover:opacity-60 text-sm select-none">⠿</span>
                <input type="checkbox" class="checkbox checkbox-sm"
                       [checked]="item.done"
                       (change)="toggleDone(item)" />
                @if (editingId === item.id) {
                  <input class="input input-xs input-bordered flex-1"
                         [value]="item.text"
                         (blur)="saveEdit(item, $event)"
                         (keydown.enter)="saveEdit(item, $event)"
                         (keydown.escape)="editingId = null"
                         #editInput />
                } @else {
                  <span class="flex-1 text-sm cursor-pointer select-none"
                        [class.line-through]="item.done"
                        [class.opacity-50]="item.done"
                        (dblclick)="startEdit(item)">
                    {{ item.text }}
                  </span>
                }
                <button class="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100"
                        (click)="deleteItem(item)">
                  <ng-icon name="heroTrash" size="12" />
                </button>
              </div>
            }
          </div>

          @if (newItemCategory === cat) {
            <div class="flex gap-2 mt-1 px-2">
              <input class="input input-xs input-bordered flex-1" [(ngModel)]="newItemText"
                     placeholder="Nuevo ítem..." (keydown.enter)="saveNewItem()"
                     (keydown.escape)="cancelNew()" autofocus />
              <button class="btn btn-xs btn-primary" (click)="saveNewItem()">Añadir</button>
              <button class="btn btn-xs btn-ghost" (click)="cancelNew()">×</button>
            </div>
          }
        </div>
      }
    }

    @if (newItemCategory === null) {
      <div class="flex flex-wrap gap-2 mt-2">
        @for (cat of categories; track cat) {
          <button class="btn btn-xs btn-outline gap-1" (click)="startNew(cat)">
            <ng-icon name="heroPlus" size="12" /> {{ categoryLabels[cat] }}
          </button>
        }
      </div>
    }

    @if (sorted.length === 0 && newItemCategory === null) {
      <p class="text-center opacity-50 py-4 text-sm">Sin ítems. Añade lo que necesitas llevar.</p>
    }
  `,
})
export class ChecklistComponent implements OnInit {
  @Input() checklistId!: string;

  private db = inject(DatabaseService);
  private toast = inject(ToastService);
  private dialog = inject(Dialog);

  readonly categories = CHECKLIST_CATEGORIES;
  readonly categoryLabels = CHECKLIST_CATEGORY_LABELS;

  editingId: string | null = null;
  newItemCategory: ChecklistCategory | null = null;
  newItemText = '';
  sorted: ChecklistItem[] = [];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const items = await this.db.getChecklistByList(this.checklistId);
      this.sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    } catch { this.toast.danger('Error al cargar el checklist'); }
  }

  get doneCount(): number { return this.sorted.filter(i => i.done).length; }
  get progressPct(): number { return this.sorted.length ? Math.round(this.doneCount / this.sorted.length * 100) : 0; }

  byCategory(cat: ChecklistCategory): ChecklistItem[] {
    return this.sorted.filter(i => i.category === cat);
  }

  async toggleDone(item: ChecklistItem): Promise<void> {
    try {
      await this.db.updateChecklistItem({ ...item, done: !item.done });
      await this.load();
    } catch { this.toast.danger('Error al actualizar'); }
  }

  startEdit(item: ChecklistItem): void { this.editingId = item.id; }

  async saveEdit(item: ChecklistItem, event: Event): Promise<void> {
    const text = (event.target as HTMLInputElement).value.trim();
    this.editingId = null;
    if (!text || text === item.text) return;
    try {
      await this.db.updateChecklistItem({ ...item, text });
      await this.load();
    } catch { this.toast.danger('Error al guardar'); }
  }

  startNew(cat: ChecklistCategory): void { this.newItemCategory = cat; this.newItemText = ''; }
  cancelNew(): void { this.newItemCategory = null; this.newItemText = ''; }

  async saveNewItem(): Promise<void> {
    const text = this.newItemText.trim();
    if (!text || !this.newItemCategory) return;
    const cat = this.newItemCategory;
    const maxOrder = Math.max(0, ...this.byCategory(cat).map(i => i.sortOrder));
    try {
      await this.db.createChecklistItem({ checklistId: this.checklistId, category: cat, text, sortOrder: maxOrder + 1 });
      this.newItemText = '';
      this.newItemCategory = null;
      await this.load();
    } catch { this.toast.danger('Error al añadir'); }
  }

  async deleteItem(item: ChecklistItem): Promise<void> {
    try {
      await this.db.deleteChecklistItem(item.id);
      await this.load();
    } catch { this.toast.danger('Error al eliminar'); }
  }

  async drop(event: CdkDragDrop<ChecklistCategory>): Promise<void> {
    const cat = event.container.data;
    const catItems = [...this.byCategory(cat)];
    moveItemInArray(catItems, event.previousIndex, event.currentIndex);
    try {
      await Promise.all(catItems.map((item, idx) => this.db.updateChecklistItem({ ...item, sortOrder: idx })));
      await this.load();
    } catch { this.toast.danger('Error al reordenar'); }
  }

  confirmReset(): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: {
        title: 'Reset del checklist',
        message: '¿Desmarcar todos los ítems?',
        confirmLabel: 'Reset',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.resetChecklistByList(this.checklistId);
        this.toast.info('Checklist reseteado');
        await this.load();
      } catch { this.toast.danger('Error al resetear'); }
    });
  }
}
