import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { User } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { UserFormComponent, UserFormResult } from './user-form/user-form.component';

// Dialog for changing a user's password
import { Component as Comp, inject as inj } from '@angular/core';
import { FormsModule as FM } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent as NI } from '@ng-icons/core';

@Comp({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [FM, NI],
  template: `
    <div class="modal-box w-80 max-w-[95vw]">
      <h3 class="font-bold text-lg mb-4">Cambiar contraseña</h3>
      <p class="text-sm opacity-60 mb-3">Usuario: <strong>{{ data.username }}</strong></p>
      <div class="flex flex-col gap-3">
        <label class="input input-bordered input-sm flex items-center gap-2">
          <input [type]="show ? 'text' : 'password'" class="grow" [(ngModel)]="pw1" placeholder="Nueva contraseña" />
          <button type="button" class="opacity-50" (click)="show = !show">
            <ng-icon [name]="show ? 'heroEyeSlash' : 'heroEye'" class="w-4 h-4"></ng-icon>
          </button>
        </label>
        <input type="password" class="input input-bordered input-sm w-full" [(ngModel)]="pw2" placeholder="Confirmar contraseña" />
        @if (error) { <div class="alert alert-error py-2 text-sm">{{ error }}</div> }
      </div>
      <div class="modal-action mt-4">
        <button class="btn btn-sm btn-ghost" (click)="ref.close(undefined)">Cancelar</button>
        <button class="btn btn-sm btn-primary" (click)="save()" [disabled]="!pw1 || !pw2">Guardar</button>
      </div>
    </div>
  `,
})
export class ChangePasswordDialogComponent {
  readonly ref = inj(DialogRef<string>);
  readonly data = inj<{ username: string }>(DIALOG_DATA);
  pw1 = ''; pw2 = ''; show = false; error = '';
  save(): void {
    if (this.pw1 !== this.pw2) { this.error = 'Las contraseñas no coinciden'; return; }
    if (this.pw1.length < 4) { this.error = 'Mínimo 4 caracteres'; return; }
    this.ref.close(this.pw1);
  }
}

// ── Main Users Component ──────────────────────────────────────────────────────

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  template: `
    <div class="p-4 md:p-6 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold">Gestión de usuarios</h2>
          <p class="text-sm opacity-50">Solo el administrador puede crear y gestionar usuarios.</p>
        </div>
        <button class="btn btn-primary btn-sm gap-1" (click)="openCreate()">
          <ng-icon name="heroPlus" class="w-4 h-4"></ng-icon>
          Añadir
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table table-sm w-full">
            <thead>
              <tr>
                <th></th>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr class="hover">
                  <!-- Avatar -->
                  <td>
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-8 h-8 text-xs font-bold">
                        {{ user.username.charAt(0).toUpperCase() }}
                      </div>
                    </div>
                  </td>
                  <td class="font-mono text-sm">{{ user.username }}</td>
                  <td class="text-sm opacity-70">{{ user.displayName || '—' }}</td>
                  <td>
                    <span class="badge badge-sm" [class]="user.role === 'admin' ? 'badge-primary' : 'badge-ghost'">
                      {{ user.role === 'admin' ? 'Admin' : 'Miembro' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-sm" [class]="user.isActive ? 'badge-success' : 'badge-error'">
                      {{ user.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1 justify-end">
                      <button
                        class="btn btn-ghost btn-xs"
                        title="Editar"
                        (click)="openEdit(user)">
                        <ng-icon name="heroPencil" class="w-3.5 h-3.5"></ng-icon>
                      </button>
                      <button
                        class="btn btn-ghost btn-xs"
                        title="Cambiar contraseña"
                        (click)="openChangePassword(user)">
                        <ng-icon name="heroKey" class="w-3.5 h-3.5"></ng-icon>
                      </button>
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        title="Eliminar"
                        [disabled]="user.id === currentUserId"
                        (click)="deleteUser(user)">
                        <ng-icon name="heroTrash" class="w-3.5 h-3.5"></ng-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  users = signal<User[]>([]);
  loading = signal(true);

  get currentUserId(): string {
    return this.auth.currentUser()?.id ?? '';
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.db.getUsers());
    } catch (e: unknown) {
      this.toast.danger(typeof e === 'string' ? e : 'Error cargando usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    const ref = this.dialog.open<UserFormResult>(UserFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: {},
    });
    ref.closed.subscribe(async (result) => {
      const r = result as UserFormResult | undefined;
      if (!r?.payload) return;
      try {
        const user = await this.db.createUser(r.payload);
        this.users.update(u => [...u, user]);
        this.toast.success(`Usuario "${user.username}" creado`);
      } catch (e: unknown) {
        this.toast.danger(typeof e === 'string' ? e : 'Error al crear usuario');
      }
    });
  }

  openEdit(user: User): void {
    const ref = this.dialog.open<UserFormResult>(UserFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { user },
    });
    ref.closed.subscribe(async (result) => {
      const r = result as UserFormResult | undefined;
      if (!r?.update) return;
      try {
        const updated = await this.db.updateUser(r.update);
        this.users.update(u => u.map(x => x.id === updated.id ? updated : x));
        // If editing current user, refresh auth state
        if (updated.id === this.currentUserId) {
          this.auth.currentUser.set(updated);
        }
        this.toast.success(`Usuario "${updated.username}" actualizado`);
      } catch (e: unknown) {
        this.toast.danger(typeof e === 'string' ? e : 'Error al actualizar usuario');
      }
    });
  }

  openChangePassword(user: User): void {
    const ref = this.dialog.open<string>(ChangePasswordDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { username: user.username },
    });
    ref.closed.subscribe(async (result) => {
      const newPassword = result as string | undefined;
      if (!newPassword) return;
      try {
        await this.db.changePassword(user.id, newPassword);
        this.toast.success(`Contraseña de "${user.username}" actualizada`);
      } catch (e: unknown) {
        this.toast.danger(typeof e === 'string' ? e : 'Error al cambiar contraseña');
      }
    });
  }

  deleteUser(user: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      data: {
        title: 'Eliminar usuario',
        message: `¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
      },
    });
    ref.closed.subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.db.deleteUser(user.id);
        this.users.update(u => u.filter(x => x.id !== user.id));
        this.toast.success(`Usuario "${user.username}" eliminado`);
      } catch (e: unknown) {
        this.toast.danger(typeof e === 'string' ? e : 'Error al eliminar usuario');
      }
    });
  }
}
