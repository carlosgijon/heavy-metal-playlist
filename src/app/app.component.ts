import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { PlaylistComponent } from './features/playlist/playlist.component';
import { SongsComponent } from './features/songs/songs.component';
import { EquipoComponent } from './features/equipo/equipo.component';
import { ConciertosComponent } from './features/conciertos/conciertos.component';
import { CalendarComponent } from './features/conciertos/calendar/calendar.component';
import { LoginComponent } from './features/auth/login/login.component';
import { UsersComponent } from './features/auth/users/users.component';
import { SuperadminPanelComponent } from './features/superadmin/superadmin-panel.component';
import { BandSettingsComponent } from './features/band-settings/band-settings.component';
import { SettingsDialogComponent } from './shared/settings-dialog/settings-dialog.component';
import { FinanzasComponent } from './features/finanzas/finanzas.component';
import { MerchComponent } from './features/merch/merch.component';
import { AuthService } from './core/services/auth.service';
import { DatabaseService } from './core/services/database.service';
import { PlaylistWithStats } from './core/models/song.model';

type AppView = 'songs' | 'playlists' | 'detail' | 'equipo' | 'conciertos' | 'calendario' | 'admin' | 'band-settings' | 'finanzas' | 'merch';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    PlaylistsComponent,
    PlaylistComponent,
    SongsComponent,
    EquipoComponent,
    ConciertosComponent,
    CalendarComponent,
    LoginComponent,
    UsersComponent,
    SuperadminPanelComponent,
    BandSettingsComponent,
    FinanzasComponent,
    MerchComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  private readonly auth = inject(AuthService);
  private readonly db = inject(DatabaseService);

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isAdmin = this.auth.isAdmin;
  readonly isSuperAdmin = this.auth.isSuperAdmin;
  readonly currentUser = this.auth.currentUser;
  readonly currentBand = this.auth.currentBand;

  view = signal<AppView>('calendario');
  selectedPlaylist = signal<PlaylistWithStats | null>(null);

  async ngOnInit(): Promise<void> {
    // Apply cached theme immediately to avoid flash of default theme
    const cachedTheme = localStorage.getItem('theme');
    if (cachedTheme) {
      document.documentElement.setAttribute('data-theme', cachedTheme);
    }
    await this.auth.init();
    // Confirm theme from server (keeps localStorage cache in sync)
    try {
      const settings = await this.db.getSettings();
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        localStorage.setItem('theme', settings.theme);
      }
    } catch { /* non-critical */ }
  }

  setView(v: AppView): void {
    this.view.set(v);
    this.selectedPlaylist.set(null);
  }

  onPlaylistSelected(playlist: PlaylistWithStats): void {
    this.selectedPlaylist.set(playlist);
    this.view.set('detail');
  }

  onBack(): void {
    this.view.set('playlists');
    this.selectedPlaylist.set(null);
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
    });
  }

  logout(): void {
    this.auth.logout();
    this.view.set('calendario');
  }
}
