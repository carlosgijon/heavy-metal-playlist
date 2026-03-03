import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../../core/services/auth.service';
import { BandInfo } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIconComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl mx-4">
        <div class="card-body gap-4">

          @if (step() === 'login') {
            <!-- Brand -->
            <div class="text-center mb-2">
              <ng-icon name="heroMusicalNote" class="w-10 h-10 text-primary mx-auto mb-2"></ng-icon>
              <h1 class="text-2xl font-bold tracking-widest uppercase">Blackout ORM</h1>
              <p class="text-sm opacity-50 mt-1">Accede con tu cuenta</p>
            </div>

            @if (error()) {
              <div class="alert alert-error py-2 text-sm">
                <ng-icon name="heroExclamationCircle" class="w-4 h-4 flex-shrink-0"></ng-icon>
                {{ error() }}
              </div>
            }

            <form (ngSubmit)="submit()" class="flex flex-col gap-3">
              <label class="input input-bordered flex items-center gap-2">
                <ng-icon name="heroUser" class="w-4 h-4 opacity-50"></ng-icon>
                <input type="text" class="grow" placeholder="Usuario"
                  [(ngModel)]="username" name="username" autocomplete="username" required />
              </label>

              <label class="input input-bordered flex items-center gap-2">
                <ng-icon name="heroLockClosed" class="w-4 h-4 opacity-50"></ng-icon>
                <input [type]="showPassword ? 'text' : 'password'" class="grow" placeholder="Contraseña"
                  [(ngModel)]="password" name="password" autocomplete="current-password" required />
                <button type="button" class="opacity-50 hover:opacity-100" (click)="showPassword = !showPassword">
                  <ng-icon [name]="showPassword ? 'heroEyeSlash' : 'heroEye'" class="w-4 h-4"></ng-icon>
                </button>
              </label>

              <button type="submit" class="btn btn-primary w-full mt-2"
                [disabled]="loading() || !username || !password">
                @if (loading()) {
                  <span class="loading loading-spinner loading-sm"></span> Entrando...
                } @else { Entrar }
              </button>
            </form>
          }

          @if (step() === 'selectBand') {
            <!-- Band selector -->
            <div class="text-center mb-2">
              <ng-icon name="heroBuildingOffice2" class="w-10 h-10 text-primary mx-auto mb-2"></ng-icon>
              <h2 class="text-xl font-bold">Selecciona tu grupo</h2>
              <p class="text-sm opacity-50 mt-1">Perteneces a varios grupos</p>
            </div>

            @if (error()) {
              <div class="alert alert-error py-2 text-sm">{{ error() }}</div>
            }

            <div class="flex flex-col gap-2">
              @for (band of bands(); track band.id) {
                <button
                  class="btn btn-outline btn-lg justify-start gap-3 h-auto py-3"
                  [disabled]="loading()"
                  (click)="chooseBand(band.id)">
                  @if (band.logo) {
                    <img [src]="band.logo" class="w-8 h-8 rounded-full object-cover" alt="" />
                  } @else {
                    <span class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {{ band.name[0].toUpperCase() }}
                    </span>
                  }
                  <div class="text-left">
                    <div class="font-semibold">{{ band.name }}</div>
                    <div class="text-xs opacity-50">{{ band.role }}</div>
                  </div>
                  @if (loading()) {
                    <span class="loading loading-spinner loading-sm ml-auto"></span>
                  }
                </button>
              }
            </div>

            <button class="btn btn-ghost btn-sm mt-1" (click)="backToLogin()">
              ← Volver
            </button>
          }

        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  username = '';
  password = '';
  showPassword = false;
  loading = signal(false);
  error = signal('');
  step = signal<'login' | 'selectBand'>('login');
  bands = signal<BandInfo[]>([]);

  async submit(): Promise<void> {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const pendingBands = await this.auth.login(this.username, this.password);
      if (pendingBands.length > 0) {
        this.bands.set(pendingBands);
        this.step.set('selectBand');
      }
      // else: login complete, isAuthenticated will flip
    } catch (e: unknown) {
      this.error.set(typeof e === 'string' ? e : 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

  async chooseBand(bandId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.selectBand(bandId);
    } catch (e: unknown) {
      this.error.set(typeof e === 'string' ? e : 'Error al seleccionar grupo');
    } finally {
      this.loading.set(false);
    }
  }

  backToLogin(): void {
    this.step.set('login');
    this.error.set('');
    this.auth.logout();
  }
}
