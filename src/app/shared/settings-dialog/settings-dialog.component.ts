import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-box w-80 max-w-[95vw]">
      <h3 class="font-bold text-lg mb-4">Configuración</h3>

      <!-- Theme -->
      <p class="section-label">Tema</p>
      <select
        class="select select-bordered select-sm w-full mb-4"
        [(ngModel)]="currentTheme"
        (ngModelChange)="changeTheme($event)">
        <optgroup label="── Slack ──────────">
          <option value="slack-aubergine">Slack Aubergine</option>
          <option value="slack-light">Slack Light</option>
          <option value="slack-dark">Slack Dark</option>
          <option value="slack-ocean">Slack Ocean</option>
          <option value="slack-tomato">Slack Tomato</option>
          <option value="slack-evergreen">Slack Evergreen</option>
          <option value="slack-warm">Slack Warm</option>
        </optgroup>
        <optgroup label="── Apps ────────────">
          <option value="github-dark">GitHub Dark</option>
          <option value="discord">Discord</option>
          <option value="spotify">Spotify</option>
          <option value="netflix">Netflix</option>
          <option value="vscode">VS Code</option>
          <option value="notion-dark">Notion Dark</option>
          <option value="twitter-x">X (Twitter)</option>
          <option value="supabase">Supabase</option>
          <option value="linear">Linear</option>
          <option value="figma-dark">Figma Dark</option>
        </optgroup>
        <optgroup label="── Retro ────────────">
          <option value="win95">Windows 95</option>
          <option value="winxp">Windows XP Luna</option>
        </optgroup>
        <optgroup label="── DaisyUI ─────────">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="cupcake">Cupcake</option>
          <option value="bumblebee">Bumblebee</option>
          <option value="emerald">Emerald</option>
          <option value="corporate">Corporate</option>
          <option value="synthwave">Synthwave</option>
          <option value="retro">Retro</option>
          <option value="cyberpunk">Cyberpunk</option>
          <option value="valentine">Valentine</option>
          <option value="halloween">Halloween</option>
          <option value="garden">Garden</option>
          <option value="forest">Forest</option>
          <option value="aqua">Aqua</option>
          <option value="lofi">Lofi</option>
          <option value="pastel">Pastel</option>
          <option value="fantasy">Fantasy</option>
          <option value="wireframe">Wireframe</option>
          <option value="black">Black</option>
          <option value="luxury">Luxury</option>
          <option value="dracula">Dracula</option>
          <option value="cmyk">CMYK</option>
          <option value="autumn">Autumn</option>
          <option value="business">Business</option>
          <option value="acid">Acid</option>
          <option value="lemonade">Lemonade</option>
          <option value="night">Night</option>
          <option value="coffee">Coffee</option>
          <option value="winter">Winter</option>
          <option value="dim">Dim</option>
          <option value="nord">Nord</option>
          <option value="sunset">Sunset</option>
          <option value="caramellatte">Caramellatte</option>
          <option value="abyss">Abyss</option>
          <option value="silk">Silk</option>
        </optgroup>
      </select>

      <div class="modal-action mt-2">
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
  `],
})
export class SettingsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef);
  private readonly db = inject(DatabaseService);

  currentTheme = 'dark';

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      this.currentTheme = settings.theme ?? 'dark';
    } catch { /* non-critical */ }
  }

  async changeTheme(theme: string): Promise<void> {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    await this.db.setSettings({ theme });
  }

  close(): void {
    this.dialogRef.close();
  }
}
