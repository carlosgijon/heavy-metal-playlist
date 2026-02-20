import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';

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
  `],
})
export class SettingsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef);
  private readonly db = inject(DatabaseService);
  private readonly toastr = inject(ToastService);

  bpmApiKey = '';
  showKey = false;

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      this.bpmApiKey = settings.bpmApiKey ?? '';
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

  close(): void {
    this.dialogRef.close();
  }
}
