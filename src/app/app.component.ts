import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { PlaylistComponent } from './features/playlist/playlist.component';
import { SongsComponent } from './features/songs/songs.component';
import { EquipoComponent } from './features/equipo/equipo.component';
import { ThemeSwitcherComponent } from './shared/theme-switcher/theme-switcher.component';
import { SettingsDialogComponent } from './shared/settings-dialog/settings-dialog.component';
import { PlaylistWithStats } from './core/models/song.model';

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
    ThemeSwitcherComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private readonly dialog = inject(Dialog);

  view = signal<'songs' | 'playlists' | 'detail' | 'equipo'>('playlists');
  selectedPlaylist = signal<PlaylistWithStats | null>(null);
  sidebarExpanded = false;

  setView(v: 'songs' | 'playlists' | 'equipo'): void {
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

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
    });
  }
}
