import { Component, signal } from '@angular/core';
import {
  NbLayoutModule,
  NbSidebarModule,
  NbButtonModule,
  NbIconModule,
  NbMenuModule,
  NbCardModule,
} from '@nebular/theme';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { PlaylistComponent } from './features/playlist/playlist.component';
import { ThemeSwitcherComponent } from './shared/theme-switcher/theme-switcher.component';
import { PlaylistWithStats } from './core/models/song.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NbLayoutModule,
    NbSidebarModule,
    NbButtonModule,
    NbIconModule,
    NbMenuModule,
    NbCardModule,
    PlaylistsComponent,
    PlaylistComponent,
    ThemeSwitcherComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  view = signal<'playlists' | 'detail'>('playlists');
  selectedPlaylist = signal<PlaylistWithStats | null>(null);

  onPlaylistSelected(playlist: PlaylistWithStats): void {
    this.selectedPlaylist.set(playlist);
    this.view.set('detail');
  }

  onBack(): void {
    this.view.set('playlists');
    this.selectedPlaylist.set(null);
  }
}
