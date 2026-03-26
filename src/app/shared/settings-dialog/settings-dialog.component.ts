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
  system:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  inter:       "'Inter', sans-serif",
  roboto:      "'Roboto', sans-serif",
  opensans:    "'Open Sans', sans-serif",
  lato:        "'Lato', sans-serif",
  nunito:      "'Nunito', sans-serif",
  poppins:     "'Poppins', sans-serif",
  montserrat:  "'Montserrat', sans-serif",
  dmsans:      "'DM Sans', sans-serif",
  plusjakarta: "'Plus Jakarta Sans', sans-serif",
  outfit:      "'Outfit', sans-serif",
  playfair:    "'Playfair Display', serif",
  merriweather:"'Merriweather', serif",
  lora:        "'Lora', serif",
  oswald:      "'Oswald', sans-serif",
  rajdhani:    "'Rajdhani', sans-serif",
  barlow:      "'Barlow Condensed', sans-serif",
  bebas:       "'Bebas Neue', sans-serif",
  jetbrains:   "'JetBrains Mono', monospace",
  sourcecodepro:"'Source Code Pro', monospace",
  firacode:    "'Fira Code', monospace",
};

const FONT_FAMILY_OPTIONS: { key: string; label: string; stack: string; category: string }[] = [
  // Sistema
  { key: 'system',       label: 'Sistema',           stack: FONT_FAMILY_MAP['system'],       category: 'sistema' },
  // Sans-serif
  { key: 'inter',        label: 'Inter',              stack: FONT_FAMILY_MAP['inter'],        category: 'sans-serif' },
  { key: 'roboto',       label: 'Roboto',             stack: FONT_FAMILY_MAP['roboto'],       category: 'sans-serif' },
  { key: 'opensans',     label: 'Open Sans',          stack: FONT_FAMILY_MAP['opensans'],     category: 'sans-serif' },
  { key: 'lato',         label: 'Lato',               stack: FONT_FAMILY_MAP['lato'],         category: 'sans-serif' },
  { key: 'nunito',       label: 'Nunito',             stack: FONT_FAMILY_MAP['nunito'],       category: 'sans-serif' },
  { key: 'poppins',      label: 'Poppins',            stack: FONT_FAMILY_MAP['poppins'],      category: 'sans-serif' },
  { key: 'montserrat',   label: 'Montserrat',         stack: FONT_FAMILY_MAP['montserrat'],   category: 'sans-serif' },
  { key: 'dmsans',       label: 'DM Sans',            stack: FONT_FAMILY_MAP['dmsans'],       category: 'sans-serif' },
  { key: 'plusjakarta',  label: 'Plus Jakarta Sans',  stack: FONT_FAMILY_MAP['plusjakarta'],  category: 'sans-serif' },
  { key: 'outfit',       label: 'Outfit',             stack: FONT_FAMILY_MAP['outfit'],       category: 'sans-serif' },
  // Serif
  { key: 'playfair',     label: 'Playfair Display',   stack: FONT_FAMILY_MAP['playfair'],     category: 'serif' },
  { key: 'merriweather', label: 'Merriweather',       stack: FONT_FAMILY_MAP['merriweather'], category: 'serif' },
  { key: 'lora',         label: 'Lora',               stack: FONT_FAMILY_MAP['lora'],         category: 'serif' },
  // Display
  { key: 'oswald',       label: 'Oswald',             stack: FONT_FAMILY_MAP['oswald'],       category: 'display' },
  { key: 'rajdhani',     label: 'Rajdhani',           stack: FONT_FAMILY_MAP['rajdhani'],     category: 'display' },
  { key: 'barlow',       label: 'Barlow Condensed',   stack: FONT_FAMILY_MAP['barlow'],       category: 'display' },
  { key: 'bebas',        label: 'Bebas Neue',         stack: FONT_FAMILY_MAP['bebas'],        category: 'display' },
  // Monospace
  { key: 'jetbrains',    label: 'JetBrains Mono',     stack: FONT_FAMILY_MAP['jetbrains'],    category: 'monospace' },
  { key: 'sourcecodepro',label: 'Source Code Pro',    stack: FONT_FAMILY_MAP['sourcecodepro'],category: 'monospace' },
  { key: 'firacode',     label: 'Fira Code',          stack: FONT_FAMILY_MAP['firacode'],     category: 'monospace' },
];

const FONT_SIZE_OPTIONS = [
  { key: 'xs', label: 'XS', px: 13 },
  { key: 'sm', label: 'S',  px: 14 },
  { key: 'md', label: 'M',  px: 15 },
  { key: 'lg', label: 'L',  px: 16 },
  { key: 'xl', label: 'XL', px: 18 },
];

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-box settings-box">
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
      <input
        class="input input-sm input-bordered w-full mb-2"
        type="text"
        placeholder="Buscar fuente..."
        [(ngModel)]="fontSearch" />

      <div class="font-list">
        @for (opt of filteredFonts; track opt.key) {
          <button
            class="font-card"
            [class.font-card-active]="currentFontFamily === opt.key"
            (click)="changeFontFamily(opt.key)">
            <div class="font-card-main">
              <span class="font-card-name" [style.font-family]="opt.stack">{{ opt.label }}</span>
              <span class="font-card-tag">{{ opt.category }}</span>
            </div>
            <span class="font-card-preview" [style.font-family]="opt.stack">
              Heavy Metal · Rock &amp; Roll
            </span>
          </button>
        }
        @if (filteredFonts.length === 0) {
          <p class="font-list-empty">Sin resultados para "{{ fontSearch }}"</p>
        }
      </div>

      <div class="modal-action mt-4">
        <button class="btn btn-sm" type="button" (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .settings-box {
      width: 420px;
      max-width: 95vw;
    }

    .section-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin: 0 0 0.5rem;
    }

    /* ── Font size buttons ── */
    .font-size-row {
      display: flex;
      gap: 0.4rem;
      align-items: flex-end;
    }

    .font-size-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.2rem;
      padding: 0.35rem 0.2rem 0.3rem;
      border-radius: 0.5rem;
      border: 2px solid oklch(var(--b3));
      background: oklch(var(--b2));
      cursor: pointer;
      font-weight: 700;
      line-height: 1;
      color: oklch(var(--bc));
      transition: border-color 0.15s, background 0.15s;
      min-height: 2.6rem;

      &:hover { border-color: oklch(var(--p) / 0.5); }
      &.font-size-btn-active {
        border-color: oklch(var(--p));
        background: oklch(var(--p) / 0.1);
        color: oklch(var(--p));
      }
    }

    .font-size-label {
      font-size: 0.52rem !important;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.55;
    }

    /* ── Font picker ── */
    .font-list {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border: 1px solid oklch(var(--b3));
      border-radius: 0.6rem;
      padding: 0.25rem;
      background: oklch(var(--b1));

      &::-webkit-scrollbar { width: 5px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb {
        background: oklch(var(--b3));
        border-radius: 99px;
      }
    }

    .font-card {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      width: 100%;
      padding: 0.5rem 0.7rem;
      border-radius: 0.4rem;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s;

      &:hover { background: oklch(var(--b2)); }

      &.font-card-active {
        background: oklch(var(--p) / 0.1);

        .font-card-name { color: oklch(var(--p)); }
        .font-card-tag  { color: oklch(var(--p) / 0.7); }
      }
    }

    .font-card-main {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .font-card-name {
      font-size: 1rem;
      font-weight: 700;
      color: oklch(var(--bc));
      line-height: 1.2;
    }

    .font-card-tag {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.45;
    }

    .font-card-preview {
      font-size: 0.8rem;
      opacity: 0.5;
      line-height: 1.3;
    }

    .font-list-empty {
      padding: 1.5rem;
      text-align: center;
      opacity: 0.45;
      font-size: 0.8rem;
      font-style: italic;
    }
  `],
})
export class SettingsDialogComponent implements OnInit {
  readonly dialogRef = inject(DialogRef);
  private readonly db = inject(DatabaseService);

  currentTheme = 'dark';
  currentFontSize = 'md';
  currentFontFamily = 'system';
  fontSearch = '';

  readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  readonly fontFamilyOptions = FONT_FAMILY_OPTIONS;

  get filteredFonts() {
    const q = this.fontSearch.trim().toLowerCase();
    if (!q) return FONT_FAMILY_OPTIONS;
    return FONT_FAMILY_OPTIONS.filter(f =>
      f.label.toLowerCase().includes(q) || f.category.includes(q)
    );
  }

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
