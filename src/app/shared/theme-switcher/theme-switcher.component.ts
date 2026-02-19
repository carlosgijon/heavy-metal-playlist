import { Component, inject, OnInit } from '@angular/core';
import { NbSelectModule, NbThemeService } from '@nebular/theme';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [NbSelectModule],
  template: `
    <nb-select
      [selected]="currentTheme"
      (selectedChange)="changeTheme($event)"
      placeholder="Tema"
      size="small">
      <nb-option value="dark">Dark</nb-option>
      <nb-option value="default">Default</nb-option>
      <nb-option value="cosmic">Cosmic</nb-option>
      <nb-option value="corporate">Corporate</nb-option>
    </nb-select>
  `,
  styles: [`:host { display: flex; align-items: center; }`]
})
export class ThemeSwitcherComponent implements OnInit {
  private readonly themeService = inject(NbThemeService);
  private readonly db = inject(DatabaseService);
  currentTheme = 'dark';

  async ngOnInit(): Promise<void> {
    const settings = await this.db.getSettings();
    this.currentTheme = settings.theme;
    this.themeService.changeTheme(settings.theme);
  }

  async changeTheme(theme: string): Promise<void> {
    this.currentTheme = theme;
    this.themeService.changeTheme(theme);
    await this.db.setSettings({ theme });
  }
}
