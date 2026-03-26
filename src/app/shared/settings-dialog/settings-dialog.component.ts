import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { DatabaseService } from '../../core/services/database.service';

export const FONT_SIZE_MAP: Record<string, string> = {
  xs: '13px',
  sm: '14px',
  md: '15px',
  lg: '16px',
  xl: '18px',
};

export const FONT_FAMILY_MAP: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  inter: "'Inter', sans-serif",
  nunito: "'Nunito', sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
};

const FONT_SIZE_OPTIONS = [
  { key: 'xs', label: 'XS', px: 13 },
  { key: 'sm', label: 'S',  px: 14 },
  { key: 'md', label: 'M',  px: 15 },
  { key: 'lg', label: 'L',  px: 16 },
  { key: 'xl', label: 'XL', px: 18 },
];

const FONT_FAMILY_OPTIONS = [
  { key: 'system',    label: 'Sistema',         stack: FONT_FAMILY_MAP['system'] },
  { key: 'inter',     label: 'Inter',            stack: FONT_FAMILY_MAP['inter'] },
  { key: 'nunito',    label: 'Nunito',           stack: FONT_FAMILY_MAP['nunito'] },
  { key: 'jetbrains', label: 'JetBrains Mono',  stack: FONT_FAMILY_MAP['jetbrains'] },
];

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-box w-96 max-w-[95vw]">
      <h3 class="font-bold text-lg mb-5">Configuración</h3>

      <!-- ── Tema ─────────────────────────────────────── -->
      <p class="section-label">Tema</p>
      <select
        class="select select-bordered select-sm w-full mb-5"
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

      <!-- ── Tamaño de letra ──────────────────────────── -->
      <p class="section-label">Tamaño de letra</p>
      <div class="font-size-row mb-5">
        @for (opt of fontSizeOptions; track opt.key) {
          <button
            class="font-size-btn"
            [class.font-size-btn-active]="currentFontSize === opt.key"
            [style.font-size.px]="opt.px"
            (click)="changeFontSize(opt.key)">
            A
            <span class="font-size-label">{{ opt.label }}</span>
          </button>
        }
      </div>

      <!-- ── Tipografía ───────────────────────────────── -->
      <p class="section-label">Tipografía</p>
      <div class="font-family-grid mb-5">
        @for (opt of fontFamilyOptions; track opt.key) {
          <button
            class="font-family-btn"
            [class.font-family-btn-active]="currentFontFamily === opt.key"
            [style.font-family]="opt.stack"
            (click)="changeFontFamily(opt.key)">
            {{ opt.label }}
          </button>
        }
      </div>

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

    /* Font size */
    .font-size-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .font-size-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.2rem;
      flex: 1;
      padding: 0.4rem 0.25rem 0.35rem;
      border-radius: 0.5rem;
      border: 2px solid oklch(var(--b3));
      background: oklch(var(--b2));
      cursor: pointer;
      font-weight: 700;
      line-height: 1;
      color: oklch(var(--bc));
      transition: border-color 0.15s, background 0.15s;
      min-height: 2.75rem;

      &:hover { border-color: oklch(var(--p) / 0.5); }

      &.font-size-btn-active {
        border-color: oklch(var(--p));
        background: oklch(var(--p) / 0.1);
        color: oklch(var(--p));
      }
    }

    .font-size-label {
      font-size: 0.55rem !important;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.6;
    }

    /* Font family */
    .font-family-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .font-family-btn {
      padding: 0.55rem 0.75rem;
      border-radius: 0.5rem;
      border: 2px solid oklch(var(--b3));
      background: oklch(var(--b2));
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      text-align: left;
      color: oklch(var(--bc));
      transition: border-color 0.15s, background 0.15s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &:hover { border-color: oklch(var(--p) / 0.5); }

      &.font-family-btn-active {
        border-color: oklch(var(--p));
        background: oklch(var(--p) / 0.1);
        color: oklch(var(--p));
      }
    }
  `],
})
export class SettingsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef);
  private readonly db = inject(DatabaseService);

  currentTheme = 'dark';
  currentFontSize = 'md';
  currentFontFamily = 'system';

  readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  readonly fontFamilyOptions = FONT_FAMILY_OPTIONS;

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      this.currentTheme = settings.theme ?? 'dark';
      this.currentFontSize = settings.fontSize
        ? (Object.entries(FONT_SIZE_MAP).find(([, v]) => v === settings.fontSize)?.[0] ?? 'md')
        : 'md';
      this.currentFontFamily = settings.fontFamily
        ? (Object.entries(FONT_FAMILY_MAP).find(([, v]) => v === settings.fontFamily)?.[0] ?? 'system')
        : 'system';
    } catch { /* non-critical */ }
  }

  async changeTheme(theme: string): Promise<void> {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    await this.db.setSettings({ theme });
  }

  async changeFontSize(key: string): Promise<void> {
    this.currentFontSize = key;
    const px = FONT_SIZE_MAP[key];
    document.documentElement.style.fontSize = px;
    localStorage.setItem('fontSize', px);
    await this.db.setSettings({ fontSize: px });
  }

  async changeFontFamily(key: string): Promise<void> {
    this.currentFontFamily = key;
    const stack = FONT_FAMILY_MAP[key];
    document.documentElement.style.fontFamily = stack;
    localStorage.setItem('fontFamily', stack);
    await this.db.setSettings({ fontFamily: stack });
  }

  close(): void {
    this.dialogRef.close();
  }
}
