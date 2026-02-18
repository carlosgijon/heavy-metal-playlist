import { Component, inject } from '@angular/core';
import { NbSelectModule, NbThemeService } from '@nebular/theme';

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
export class ThemeSwitcherComponent {
  private readonly themeService = inject(NbThemeService);
  currentTheme = 'dark';

  changeTheme(theme: string): void {
    this.currentTheme = theme;
    this.themeService.changeTheme(theme);
  }
}
