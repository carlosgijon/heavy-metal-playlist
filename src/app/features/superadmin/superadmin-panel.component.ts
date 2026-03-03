import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';

interface Band {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { userBands: number };
}

@Component({
  selector: 'app-superadmin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  template: `
    <div class="p-6 max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
        <ng-icon name="heroBuildingOffice2" class="w-7 h-7 text-primary" />
        Gestión de Bandas
      </h1>

      <!-- Bands table -->
      <div class="card bg-base-200 shadow mb-8">
        <div class="card-body p-0">
          @if (loading()) {
            <div class="flex justify-center p-8">
              <span class="loading loading-spinner loading-md"></span>
            </div>
          } @else if (bands().length === 0) {
            <p class="text-center opacity-50 p-8">No hay bandas creadas todavía.</p>
          } @else {
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Banda</th>
                  <th>Slug</th>
                  <th class="text-center">Usuarios</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (band of bands(); track band.id) {
                  <tr>
                    <td class="font-semibold">{{ band.name }}</td>
                    <td class="font-mono text-xs opacity-60">{{ band.slug }}</td>
                    <td class="text-center">{{ band._count.userBands }}</td>
                    <td class="text-right">
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        (click)="confirmDelete(band)"
                        title="Eliminar banda">
                        <ng-icon name="heroTrash" class="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- Create band form -->
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">
            <ng-icon name="heroPlusCircle" class="w-5 h-5 text-primary" />
            Crear nueva banda
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="form-control">
              <div class="label"><span class="label-text">Nombre de la banda</span></div>
              <input
                type="text"
                class="input input-bordered"
                placeholder="Ej: Iron Maiden"
                [(ngModel)]="form.name"
                (ngModelChange)="autoSlug()"
              />
            </label>

            <label class="form-control">
              <div class="label"><span class="label-text">Slug</span></div>
              <input
                type="text"
                class="input input-bordered font-mono"
                placeholder="Ej: iron-maiden"
                [(ngModel)]="form.slug"
              />
            </label>

            <label class="form-control">
              <div class="label"><span class="label-text">Usuario admin</span></div>
              <input
                type="text"
                class="input input-bordered"
                placeholder="Ej: admin_ironmaiden"
                [(ngModel)]="form.adminUsername"
              />
            </label>

            <label class="form-control">
              <div class="label"><span class="label-text">Contraseña admin</span></div>
              <input
                type="password"
                class="input input-bordered"
                placeholder="Mínimo 4 caracteres"
                [(ngModel)]="form.adminPassword"
              />
            </label>
          </div>

          @if (createError()) {
            <div class="alert alert-error mt-3 py-2 text-sm">{{ createError() }}</div>
          }

          <div class="card-actions justify-end mt-4">
            <button
              class="btn btn-primary"
              (click)="createBand()"
              [disabled]="creating() || !form.name || !form.slug || !form.adminUsername || !form.adminPassword">
              @if (creating()) {
                <span class="loading loading-spinner loading-xs"></span>
              }
              Crear banda
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    @if (bandToDelete()) {
      <div class="modal modal-open">
        <div class="modal-box max-w-sm">
          <h3 class="font-bold text-lg">¿Eliminar banda?</h3>
          <p class="py-3 text-sm">
            Se eliminará <strong>{{ bandToDelete()!.name }}</strong> y todos sus datos permanentemente.
            Esta acción no se puede deshacer.
          </p>
          <div class="modal-action">
            <button class="btn btn-ghost btn-sm" (click)="bandToDelete.set(null)">Cancelar</button>
            <button class="btn btn-error btn-sm" (click)="deleteBand()" [disabled]="deleting()">
              @if (deleting()) { <span class="loading loading-spinner loading-xs"></span> }
              Eliminar
            </button>
          </div>
        </div>
        <div class="modal-backdrop" (click)="bandToDelete.set(null)"></div>
      </div>
    }
  `,
})
export class SuperadminPanelComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);

  bands = signal<Band[]>([]);
  loading = signal(true);
  creating = signal(false);
  deleting = signal(false);
  createError = signal('');
  bandToDelete = signal<Band | null>(null);

  form = { name: '', slug: '', adminUsername: '', adminPassword: '' };

  async ngOnInit() {
    await this.loadBands();
  }

  private async loadBands() {
    this.loading.set(true);
    try {
      this.bands.set(await this.db.getBands() as Band[]);
    } catch {
      this.toast.danger('Error al cargar las bandas');
    } finally {
      this.loading.set(false);
    }
  }

  autoSlug() {
    this.form.slug = this.form.name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createBand() {
    this.createError.set('');
    this.creating.set(true);
    try {
      await this.db.createBand(this.form);
      this.toast.success(`Banda "${this.form.name}" creada`);
      this.form = { name: '', slug: '', adminUsername: '', adminPassword: '' };
      await this.loadBands();
    } catch (err: any) {
      this.createError.set(String(err));
    } finally {
      this.creating.set(false);
    }
  }

  confirmDelete(band: Band) {
    this.bandToDelete.set(band);
  }

  async deleteBand() {
    const band = this.bandToDelete();
    if (!band) return;
    this.deleting.set(true);
    try {
      await this.db.deleteBand(band.id);
      this.toast.success(`Banda "${band.name}" eliminada`);
      this.bandToDelete.set(null);
      await this.loadBands();
    } catch (err: any) {
      this.toast.danger(String(err));
    } finally {
      this.deleting.set(false);
    }
  }
}
