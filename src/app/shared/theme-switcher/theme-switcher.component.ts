import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [FormsModule],
  template: `
    <select
      class="select select-sm select-bordered"
      [(ngModel)]="currentTheme"
      (ngModelChange)="changeTheme($event)">
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
    </select>
  `,
  styles: [`:host { display: flex; align-items: center; }`],
})
export class ThemeSwitcherComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  currentTheme = 'dark';

  async ngOnInit(): Promise<void> {
    const settings = await this.db.getSettings();
    // Map old Nebular theme names to DaisyUI theme names
    const map: Record<string, string> = {
      default: 'light',
      cosmic: 'dracula',
      dark: 'dark',
      corporate: 'corporate',
    };
    this.currentTheme = map[settings.theme] ?? settings.theme;
    this.applyTheme(this.currentTheme);
  }

  async changeTheme(theme: string): Promise<void> {
    this.currentTheme = theme;
    this.applyTheme(theme);
    await this.db.setSettings({ theme });
  }

  private applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
