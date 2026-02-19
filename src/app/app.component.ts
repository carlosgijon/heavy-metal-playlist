import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { filter, Subject, takeUntil } from 'rxjs';
import {
  NbLayoutModule,
  NbSidebarModule,
  NbSidebarService,
  NbButtonModule,
  NbIconModule,
  NbMenuModule,
  NbMenuService,
  NbCardModule,
  NbMenuItem,
  NbDialogService,
  NbTooltipModule,
} from '@nebular/theme';
import { PlaylistsComponent } from './features/playlists/playlists.component';
import { PlaylistComponent } from './features/playlist/playlist.component';
import { SongsComponent } from './features/songs/songs.component';
import { ThemeSwitcherComponent } from './shared/theme-switcher/theme-switcher.component';
import { SettingsDialogComponent } from './shared/settings-dialog/settings-dialog.component';
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
    NbTooltipModule,
    PlaylistsComponent,
    PlaylistComponent,
    SongsComponent,
    ThemeSwitcherComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly menuService = inject(NbMenuService);
  private readonly sidebarService = inject(NbSidebarService);
  private readonly dialog = inject(NbDialogService);
  private readonly destroy$ = new Subject<void>();

  view = signal<'songs' | 'playlists' | 'detail'>('playlists');
  selectedPlaylist = signal<PlaylistWithStats | null>(null);
  private sidebarExpanded = false;

  readonly menuItems: NbMenuItem[] = [
    {
      title: 'Canciones',
      icon: 'music-outline',
      data: { view: 'songs' },
    },
    {
      title: 'Playlists',
      icon: 'list-outline',
      data: { view: 'playlists' },
      selected: true,
    },
  ];

  ngOnInit(): void {
    this.menuService
      .onItemClick()
      .pipe(
        filter(({ tag }) => tag === 'main-menu'),
        takeUntil(this.destroy$),
      )
      .subscribe(({ item }) => {
        if (item.data?.view) {
          this.view.set(item.data.view);
          this.selectedPlaylist.set(null);
          this.menuItems.forEach((m) => (m.selected = m.data?.view === item.data.view));
          if (this.sidebarExpanded) {
            this.sidebarExpanded = false;
            this.sidebarService.toggle(true, 'left'); // back to compacted
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.sidebarService.toggle(true, 'left');
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, { closeOnBackdropClick: true });
  }
}
