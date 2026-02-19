import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NbDialogRef,
  NbCardModule,
  NbButtonModule,
  NbIconModule,
  NbInputModule,
  NbFormFieldModule,
  NbToastrService,
} from '@nebular/theme';
import { DatabaseService } from '../../core/services/database.service';

declare const window: Window & {
  electronAPI: { invoke: (channel: string, payload?: unknown) => Promise<unknown> };
};

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    NbInputModule,
    NbFormFieldModule,
  ],
  template: `
    <nb-card class="settings-card">
      <nb-card-header>Configuración</nb-card-header>
      <nb-card-body>

        <!-- BPM API Key -->
        <p class="section-label">BPM — AudD</p>
        <nb-form-field>
          <input
            nbInput fullWidth
            [(ngModel)]="bpmApiKey"
            placeholder="Token de audd.io"
            [type]="showKey ? 'text' : 'password'" />
          <button nbSuffix nbButton ghost size="small" type="button" (click)="showKey = !showKey">
            <nb-icon [icon]="showKey ? 'eye-off-outline' : 'eye-outline'"></nb-icon>
          </button>
        </nb-form-field>
        <p class="hint">
          Obtén un token gratuito en <strong>audd.io</strong> → "Get API token".
          Solo necesitas tu email, sin URLs ni datos adicionales.
        </p>

        <button nbButton status="primary" fullWidth type="button"
          style="margin-top: 0.75rem" (click)="saveBpmKey()">
          <nb-icon icon="save-outline"></nb-icon>
          Guardar token
        </button>

        <hr class="divider" />

        <!-- Spotify -->
        <p class="section-label">Spotify</p>
        <div class="spotify-status" [class.connected]="isConnected()">
          <nb-icon [icon]="isConnected() ? 'checkmark-circle-2-outline' : 'close-circle-outline'"></nb-icon>
          <span>{{ isConnected() ? 'Conectado' : 'No conectado' }}</span>
        </div>
        <button
          nbButton status="success" fullWidth type="button"
          [disabled]="isConnecting() || isConnected()"
          (click)="connectSpotify()">
          <nb-icon *ngIf="!isConnecting()" icon="music-outline"></nb-icon>
          <nb-icon *ngIf="isConnecting()" icon="loader-outline"></nb-icon>
          {{ isConnecting() ? 'Conectando...' : 'Conectar con Spotify' }}
        </button>
        <button
          *ngIf="isConnected()"
          nbButton status="danger" ghost fullWidth type="button"
          style="margin-top: 0.5rem"
          (click)="disconnectSpotify()">
          <nb-icon icon="close-outline"></nb-icon>
          Desconectar de Spotify
        </button>

      </nb-card-body>
      <nb-card-footer>
        <div class="actions">
          <button nbButton status="basic" type="button" (click)="close()">Cerrar</button>
        </div>
      </nb-card-footer>
    </nb-card>
  `,
  styles: [`
    .settings-card { width: 380px; max-width: 95vw; }
    .section-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-hint-color);
      margin: 0 0 0.6rem;
    }
    .hint {
      font-size: 0.75rem;
      color: var(--text-hint-color);
      margin: 0.4rem 0 0;
      line-height: 1.4;
    }
    code {
      font-family: monospace;
      font-size: 0.8rem;
      padding: 0.1rem 0.25rem;
      background: var(--background-basic-color-3);
      border-radius: 3px;
    }
    .divider {
      border: none;
      border-top: 1px solid var(--border-basic-color-3);
      margin: 1.25rem 0;
    }
    .spotify-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-hint-color);
      margin-bottom: 0.6rem;
    }
    .spotify-status.connected { color: var(--color-success-default); }
    .actions { display: flex; justify-content: flex-end; }
  `],
})
export class SettingsDialogComponent implements OnInit {
  dialogRef = inject<NbDialogRef<SettingsDialogComponent>>(NbDialogRef);
  private readonly db = inject(DatabaseService);
  private readonly toastr = inject(NbToastrService);

  bpmApiKey = '';
  showKey = false;
  isConnected = signal(false);
  isConnecting = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      this.bpmApiKey = settings.bpmApiKey ?? '';
      this.isConnected.set(!!settings.spotifyAccessToken);
    } catch { /* non-critical */ }
  }

  async saveBpmKey(): Promise<void> {
    try {
      await this.db.setSettings({ bpmApiKey: this.bpmApiKey.trim() });
      this.toastr.success('API Key guardada', 'GetSongBPM');
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
