import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { User, UserPayload, UserRole, UserUpdate } from '../../../../core/models/auth.model';

export interface UserFormData {
  user?: User; // if present → edit mode
}

export interface UserFormResult {
  mode: 'create' | 'edit';
  payload?: UserPayload;
  update?: UserUpdate;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormsModule, NgIconComponent],
  template: `
    <div class="modal-box w-96 max-w-[95vw]">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Editar usuario' : 'Nuevo usuario' }}
      </h3>

      <div class="flex flex-col gap-3">
        <!-- Username -->
        <label class="form-control w-full">
          <div class="label pb-1"><span class="label-text text-xs font-semibold uppercase opacity-60">Usuario</span></div>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            [(ngModel)]="username"
            placeholder="nombre_usuario"
            [disabled]="isEdit && data.user?.username === 'admin'" />
        </label>

        <!-- Display name -->
        <label class="form-control w-full">
          <div class="label pb-1"><span class="label-text text-xs font-semibold uppercase opacity-60">Nombre visible</span></div>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            [(ngModel)]="displayName"
            placeholder="Nombre completo (opcional)" />
        </label>

        <!-- Role -->
        <label class="form-control w-full">
          <div class="label pb-1"><span class="label-text text-xs font-semibold uppercase opacity-60">Rol</span></div>
          <select class="select select-bordered select-sm w-full" [(ngModel)]="role">
            <option value="member">Miembro</option>
            <option value="admin">Administrador</option>
          </select>
        </label>

        <!-- Active (edit only) -->
        @if (isEdit) {
          <div class="flex items-center gap-3 py-1">
            <input type="checkbox" class="toggle toggle-sm toggle-primary" [(ngModel)]="isActive" />
            <span class="text-sm">Usuario activo</span>
          </div>
        }

        <!-- Password (create only) -->
        @if (!isEdit) {
          <label class="form-control w-full">
            <div class="label pb-1"><span class="label-text text-xs font-semibold uppercase opacity-60">Contraseña</span></div>
            <label class="input input-bordered input-sm flex items-center gap-2">
              <input
                [type]="showPassword ? 'text' : 'password'"
                class="grow"
                [(ngModel)]="password"
                placeholder="Contraseña inicial" />
              <button type="button" class="opacity-50 hover:opacity-100" (click)="showPassword = !showPassword">
                <ng-icon [name]="showPassword ? 'heroEyeSlash' : 'heroEye'" class="w-4 h-4"></ng-icon>
              </button>
            </label>
          </label>
        }

        <!-- Error -->
        @if (error) {
          <div class="alert alert-error py-2 text-sm">{{ error }}</div>
        }
      </div>

      <div class="modal-action mt-4">
        <button class="btn btn-sm btn-ghost" type="button" (click)="cancel()">Cancelar</button>
        <button
          class="btn btn-sm btn-primary"
          type="button"
          (click)="save()"
          [disabled]="!username || (!isEdit && !password)">
          {{ isEdit ? 'Guardar' : 'Crear' }}
        </button>
      </div>
    </div>
  `,
})
export class UserFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<UserFormResult>);
  readonly data = inject<UserFormData>(DIALOG_DATA);

  isEdit = false;
  username = '';
  displayName = '';
  role: UserRole = 'member';
  isActive = true;
  password = '';
  showPassword = false;
  error = '';

  ngOnInit(): void {
    if (this.data.user) {
      this.isEdit = true;
      this.username = this.data.user.username;
      this.displayName = this.data.user.displayName ?? '';
      this.role = this.data.user.role;
      this.isActive = this.data.user.isActive;
    }
  }

  save(): void {
    this.error = '';
    if (!this.username.trim()) {
      this.error = 'El nombre de usuario es obligatorio';
      return;
    }
    if (!this.isEdit && !this.password.trim()) {
      this.error = 'La contraseña es obligatoria';
      return;
    }

    if (this.isEdit) {
      this.dialogRef.close({
        mode: 'edit',
        update: {
          id: this.data.user!.id,
          username: this.username.trim(),
          displayName: this.displayName.trim() || undefined,
          role: this.role,
          isActive: this.isActive,
        },
      });
    } else {
      this.dialogRef.close({
        mode: 'create',
        payload: {
          username: this.username.trim(),
          displayName: this.displayName.trim() || undefined,
          password: this.password,
          role: this.role,
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
