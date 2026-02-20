import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { LibrarySong, PlaylistWithStats } from '../../core/models/song.model';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { SongLibraryFormComponent } from './song-library-form/song-library-form.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-songs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
  ],
  templateUrl: './songs.component.html',
  styleUrls: ['./songs.component.scss'],
})
export class SongsComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  songs: LibrarySong[] = [];
  playlists: PlaylistWithStats[] = [];
  loading = true;
  searchQuery = '';

  // Add-to-playlist modal state
  addingToPlaylist: LibrarySong | null = null;
  selectedPlaylistId = '';
  addSetlistName = '';
  addJoinWithNext = false;
  addingInProgress = false;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSongs(), this.loadPlaylists()]);
  }

  async loadSongs(): Promise<void> {
    try {
      this.loading = true;
      this.songs = await this.db.getLibrarySongs();
    } catch {
      this.toast.danger('No se pudieron cargar las canciones', 'Error');
    } finally {
      this.loading = false;
    }
  }

  async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await this.db.getPlaylists();
    } catch {
      // Non-critical
    }
  }

  get filteredSongs(): LibrarySong[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.songs;
    return this.songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.style?.toLowerCase().includes(q) ?? false),
    );
  }

  openCreateForm(): void {
    const ref = this.dialog.open(SongLibraryFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { song: null },
    });
    ref.closed.subscribe(async (result) => {
      if (!result) return;
      try {
        const created = await this.db.createLibrarySong(result as Omit<LibrarySong, 'id'>);
        this.songs = [...this.songs, created];
        this.toast.success(`"${created.title}" añadida a la librería`, 'Canción creada');
      } catch {
        this.toast.danger('No se pudo crear la canción', 'Error');
      }
    });
  }

  openEditForm(song: LibrarySong): void {
    const ref = this.dialog.open(SongLibraryFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { song: { ...song } },
    });
    ref.closed.subscribe(async (result) => {
      if (!result) return;
      try {
        const updated = await this.db.updateLibrarySong(result as LibrarySong);
        this.songs = this.songs.map((s) => (s.id === updated.id ? updated : s));
        this.toast.success(`"${updated.title}" actualizada`, 'Canción actualizada');
      } catch {
        this.toast.danger('No se pudo actualizar la canción', 'Error');
      }
    });
  }

  async deleteSong(song: LibrarySong): Promise<void> {
    let usage: string[] = [];
    try {
      usage = await this.db.getLibrarySongUsage(song.id);
    } catch {
      // ignore
    }

    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: {
        title: 'Eliminar canción',
        message: usage.length > 0
          ? `¿Eliminar "${song.title}" de la librería? También se eliminará de ${usage.length} playlist(s).`
          : `¿Eliminar "${song.title}" de la librería?`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });

    ref.closed.subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.db.deleteLibrarySong(song.id);
        this.songs = this.songs.filter((s) => s.id !== song.id);
        this.toast.warning(`"${song.title}" eliminada`, 'Canción eliminada');
      } catch {
        this.toast.danger('No se pudo eliminar la canción', 'Error');
      }
    });
  }

  openAddToPlaylist(song: LibrarySong): void {
    this.addingToPlaylist = song;
    this.selectedPlaylistId = this.playlists[0]?.id ?? '';
    this.addSetlistName = '';
    this.addJoinWithNext = false;
  }

  cancelAddToPlaylist(): void {
    this.addingToPlaylist = null;
  }

  async confirmAddToPlaylist(): Promise<void> {
    if (!this.addingToPlaylist || !this.selectedPlaylistId) return;
    this.addingInProgress = true;
    try {
      await this.db.addSongToPlaylist(this.selectedPlaylistId, this.addingToPlaylist.id, {
        setlistName: this.addSetlistName || undefined,
        joinWithNext: this.addJoinWithNext,
      });
      const playlist = this.playlists.find((p) => p.id === this.selectedPlaylistId);
      this.toast.success(
        `"${this.addingToPlaylist.title}" añadida a "${playlist?.name}"`,
        'Añadida a playlist',
      );
      this.addingToPlaylist = null;
    } catch {
      this.toast.danger('No se pudo añadir a la playlist', 'Error');
    } finally {
      this.addingInProgress = false;
    }
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getGenreStyle(genre: string): Record<string, string> {
    const map: Record<string, { bg: string; text: string }> = {
      'death metal':         { bg: '#c0392b', text: '#fff' },
      'black metal':         { bg: '#2c3e50', text: '#ecf0f1' },
      'thrash metal':        { bg: '#e67e22', text: '#fff' },
      'power metal':         { bg: '#f39c12', text: '#fff' },
      'doom metal':          { bg: '#7f8c8d', text: '#fff' },
      'progressive metal':   { bg: '#2980b9', text: '#fff' },
      'prog metal':          { bg: '#2980b9', text: '#fff' },
      'symphonic metal':     { bg: '#8e44ad', text: '#fff' },
      'heavy metal':         { bg: '#e74c3c', text: '#fff' },
      'speed metal':         { bg: '#d81b60', text: '#fff' },
      'folk metal':          { bg: '#27ae60', text: '#fff' },
      'groove metal':        { bg: '#16a085', text: '#fff' },
      'nu metal':            { bg: '#d35400', text: '#fff' },
      'nu-metal':            { bg: '#d35400', text: '#fff' },
      'gothic metal':        { bg: '#6c3483', text: '#fff' },
      'metalcore':           { bg: '#1abc9c', text: '#fff' },
      'deathcore':           { bg: '#922b21', text: '#fff' },
      'melodic death metal': { bg: '#cb4335', text: '#fff' },
      'melodic black metal': { bg: '#4a235a', text: '#fff' },
      'stoner metal':        { bg: '#a93226', text: '#fff' },
      'industrial metal':    { bg: '#1c2833', text: '#ecf0f1' },
      'alternative metal':   { bg: '#2e86c1', text: '#fff' },
      'hard rock':           { bg: '#e74c3c', text: '#fff' },
      'rock':                { bg: '#884ea0', text: '#fff' },
    };
    const colors = map[genre.toLowerCase().trim()] ?? { bg: '#546e7a', text: '#fff' };
    return { background: colors.bg, color: colors.text };
  }
}
