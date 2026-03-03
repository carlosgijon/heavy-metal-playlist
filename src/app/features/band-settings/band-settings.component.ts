import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { DatabaseService } from '../../core/services/database.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-band-settings',
  standalone: true,
  imports: [FormsModule, NgIconComponent],
  template: `
    <div class="p-6 max-w-xl mx-auto">
      <h1 class="text-xl font-bold mb-6 flex items-center gap-2">
        <ng-icon name="heroBuildingOffice2" class="w-6 h-6 text-primary" />
        Configuración del grupo
      </h1>

      @if (loading()) {
        <div class="flex justify-center p-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else {
        <div class="card bg-base-200 shadow">
          <div class="card-body gap-5">

            <!-- Logo -->
            <div class="flex flex-col items-center gap-3">
              <div class="relative">
                @if (previewLogo()) {
                  <img [src]="previewLogo()!" class="w-24 h-24 rounded-full object-cover ring-2 ring-primary" alt="Logo" />
                } @else {
                  <div class="w-24 h-24 rounded-full bg-base-300 flex items-center justify-center">
                    <ng-icon name="heroMusicalNote" class="w-10 h-10 opacity-30" />
                  </div>
                }
                @if (previewLogo()) {
                  <button
                    class="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error"
                    (click)="removeLogo()"
                    title="Quitar logo">
                    <ng-icon name="heroXMark" class="w-3 h-3" />
                  </button>
                }
              </div>
              <label class="btn btn-ghost btn-sm gap-2 cursor-pointer">
                <ng-icon name="heroArrowUpTray" class="w-4 h-4" />
                {{ previewLogo() ? 'Cambiar logo' : 'Subir logo' }}
                <input type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)" />
              </label>
              <p class="text-xs opacity-40">PNG, JPG o SVG · Máx. 500 KB</p>
            </div>

            <div class="divider my-0"></div>

            <!-- Name -->
            <label class="form-control">
              <div class="label"><span class="label-text">Nombre del grupo</span></div>
              <input type="text" class="input input-bordered" [(ngModel)]="name" [disabled]="saving()" />
            </label>

            <!-- Slug (readonly) -->
            <label class="form-control">
              <div class="label">
                <span class="label-text">Slug</span>
                <span class="label-text-alt opacity-40">Solo lectura</span>
              </div>
              <input type="text" class="input input-bordered font-mono opacity-60" [value]="slug()" disabled />
            </label>

            @if (saveError()) {
              <div class="alert alert-error py-2 text-sm">{{ saveError() }}</div>
            }

            <div class="card-actions justify-end">
              <button class="btn btn-primary" (click)="save()" [disabled]="saving() || !name">
                @if (saving()) { <span class="loading loading-spinner loading-xs"></span> }
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class BandSettingsComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  saveError = signal('');
  name = '';
  slug = signal('');
  previewLogo = signal<string | null>(null);
  private _logoChanged = false;

  async ngOnInit() {
    try {
      const band = await this.db.getMyBand();
      this.name = band.name;
      this.slug.set(band.slug);
      if (band.logo) this.previewLogo.set(band.logo);
    } catch {
      this.toast.danger('Error al cargar el grupo');
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      this.toast.warning('El archivo es demasiado grande (máx. 500 KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.#resizeImage(reader.result as string, 256).then(resized => {
        this.previewLogo.set(resized);
        this._logoChanged = true;
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeLogo(): void {
    this.previewLogo.set(null);
    this._logoChanged = true;
  }

  async save(): Promise<void> {
    this.saveError.set('');
    this.saving.set(true);
    try {
      const dto: { name?: string; logo?: string | null } = { name: this.name };
      if (this._logoChanged) dto.logo = this.previewLogo();
      const updated = await this.db.updateMyBand(dto);
      // Update the currentBand signal so navbar reflects changes immediately
      const current = this.auth.currentBand();
      if (current) {
        this.auth.currentBand.set({ ...current, name: updated.name, logo: updated.logo });
      }
      this._logoChanged = false;
      this.toast.success('Cambios guardados');
    } catch (err: any) {
      this.saveError.set(String(err));
    } finally {
      this.saving.set(false);
    }
  }

  /** Resize an image to maxSize×maxSize and return base64 data URL. */
  async #resizeImage(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  }
}
