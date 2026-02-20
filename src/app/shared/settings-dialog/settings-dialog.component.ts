import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';

declare const window: Window & {
  electronAPI: { invoke: (channel: string, payload?: unknown) => Promise<unknown> };
};

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  template: `
    <div class="modal-box w-96 max-w-[95vw]">
      <h3 class="font-bold text-lg mb-4">Configuración</h3>

      <!-- BPM API Key -->
      <p class="section-label">BPM — AudD</p>
      <label class="input input-bordered flex items-center gap-2 mb-1">
        <input
          [(ngModel)]="bpmApiKey"
          [type]="showKey ? 'text' : 'password'"
          placeholder="Token de audd.io"
          class="grow" />
        <button type="button" (click)="showKey = !showKey" class="opacity-60 hover:opacity-100">
          <ng-icon [name]="showKey ? 'heroEyeSlash' : 'heroEye'" class="w-4 h-4"></ng-icon>
        </button>
      </label>
      <p class="hint mb-3">
        Obtén un token gratuito en <strong>audd.io</strong> → "Get API token".
        Solo necesitas tu email, sin URLs ni datos adicionales.
      </p>
      <button class="btn btn-primary btn-sm w-full mb-4" type="button" (click)="saveBpmKey()">
        <ng-icon name="heroArrowDownTray" class="w-4 h-4"></ng-icon>
        Guardar token
      </button>

      <div class="divider my-2"></div>

      <!-- Spotify -->
      <p class="section-label">Spotify</p>
      <div class="spotify-status mb-2" [class.connected]="isConnected()">
        <ng-icon [name]="isConnected() ? 'heroCheckCircle' : 'heroXCircle'" class="w-4 h-4"></ng-icon>
        <span>{{ isConnected() ? 'Conectado' : 'No conectado' }}</span>
      </div>
      <button
        class="btn btn-success btn-sm w-full"
        type="button"
        [disabled]="isConnecting() || isConnected()"
        (click)="connectSpotify()">
        <span *ngIf="isConnecting()" class="loading loading-spinner loading-xs"></span>
        <ng-icon *ngIf="!isConnecting()" name="heroMusicalNote" class="w-4 h-4"></ng-icon>
        {{ isConnecting() ? 'Conectando...' : 'Conectar con Spotify' }}
      </button>
      <button
        *ngIf="isConnected()"
        class="btn btn-error btn-outline btn-sm w-full mt-2"
        type="button"
        (click)="disconnectSpotify()">
        <ng-icon name="heroXMark" class="w-4 h-4"></ng-icon>
        Desconectar de Spotify
      </button>

      <div class="modal-action mt-4">
        <button class="btn btn-sm" type="button" (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .section-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin: 0 0 0.5rem;
      display: block;
    }
    .hint {
      font-size: 0.75rem;
      opacity: 0.6;
      line-height: 1.4;
    }
    .spotify-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.6;
    }
    .spotify-status.connected { opacity: 1; color: oklch(var(--su)); }
  `],
})
export class SettingsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef);
  private readonly db = inject(DatabaseService);
  private readonly toastr = inject(ToastService);

  bpmApiKey = '';
  showKey = false;
  isConnected = signal(false);
  isConnecting = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      this.bpmApiKey = settings.bpmApiKey ?? '';
      this.isConnected.set(!!(settings as any).spotifyAccessToken);
    } catch { /* non-critical */ }
  }

  async saveBpmKey(): Promise<void> {
    try {
      await this.db.setSettings({ bpmApiKey: this.bpmApiKey.trim() });
      this.toastr.success('API Key guardada', 'AudD');
    } catch {
      this.toastr.danger('No se pudo guardar', 'Error');
    }
  }

  async connectSpotify(): Promise<void> {
    this.isConnecting.set(true);
    try {
      await window.electronAPI.invoke('spotify:auth');
      this.isConnected.set(true);
      this.toastr.success('Conectado a Spotify', 'Spotify');
    } catch (err) {
      this.toastr.danger(
        err instanceof Error ? err.message : 'Error de conexión',
        'Spotify',
      );
    } finally {
      this.isConnecting.set(false);
    }
  }

  async disconnectSpotify(): Promise<void> {
    try {
      await window.electronAPI.invoke('spotify:disconnect');
      this.isConnected.set(false);
      this.toastr.info('Desconectado de Spotify', 'Spotify');
    } catch {
      this.toastr.danger('No se pudo desconectar', 'Error');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
