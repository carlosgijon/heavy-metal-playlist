import { Component, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { PlaylistWithStats, Playlist } from '../../core/models/song.model';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { PlaylistFormComponent } from './playlist-form/playlist-form.component';

@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './playlists.component.html',
  styleUrls: ['./playlists.component.scss'],
})
export class PlaylistsComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toastr = inject(ToastService);
  private readonly dialog = inject(Dialog);

  readonly playlistSelected = output<PlaylistWithStats>();

  playlists: PlaylistWithStats[] = [];
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.loadPlaylists();
  }

  async loadPlaylists(): Promise<void> {
    try {
      this.loading = true;
      this.playlists = await this.db.getPlaylists();
    } catch {
      this.toastr.danger('No se pudieron cargar las playlists', 'Error');
    } finally {
      this.loading = false;
    }
  }

  selectPlaylist(playlist: PlaylistWithStats): void {
    this.playlistSelected.emit(playlist);
  }

  openCreateForm(): void {
    const ref = this.dialog.open<Pick<Playlist, 'name' | 'description'>>(PlaylistFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { playlist: null },
    });
    ref.closed.subscribe(async (result) => {
      if (!result) return;
      try {
        const created = await this.db.createPlaylist(result);
        this.playlists = [...this.playlists, { ...created, songCount: 0, totalDuration: 0 }];
        this.toastr.success(`"${created.name}" creada`, 'Playlist creada');
      } catch {
        this.toastr.danger('No se pudo crear la playlist', 'Error');
      }
    });
  }

  openEditForm(playlist: PlaylistWithStats, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open<Playlist>(PlaylistFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { playlist: { ...playlist } },
    });
    ref.closed.subscribe(async (result) => {
      if (!result) return;
      try {
        const updated = await this.db.updatePlaylist(result);
        this.playlists = this.playlists.map((p) =>
          p.id === updated.id ? { ...p, ...updated } : p
        );
        this.toastr.success(`"${updated.name}" actualizada`, 'Playlist editada');
      } catch {
        this.toastr.danger('No se pudo actualizar la playlist', 'Error');
      }
    });
  }

  async deletePlaylist(playlist: PlaylistWithStats, event: Event): Promise<void> {
    event.stopPropagation();
    const msg =
      playlist.songCount > 0
        ? `¿Eliminar "${playlist.name}" y sus ${playlist.songCount} canciones?`
        : `¿Eliminar "${playlist.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await this.db.deletePlaylist(playlist.id);
      this.playlists = this.playlists.filter((p) => p.id !== playlist.id);
      this.toastr.warning(`"${playlist.name}" eliminada`, 'Playlist eliminada');
    } catch {
      this.toastr.danger('No se pudo eliminar la playlist', 'Error');
    }
  }

  async exportPlaylistToPdf(playlist: PlaylistWithStats, event: Event): Promise<void> {
    event.stopPropagation();
    if (playlist.songCount === 0) {
      this.toastr.warning('Esta playlist no tiene canciones', 'PDF vacío');
      return;
    }
    try {
      const songs = await this.db.getSongsByPlaylist(playlist.id);
      const count = songs.length;
      const fontSize = Math.max(8, Math.min(56, Math.floor(740 / Math.max(1, count * 1.4 + 1))));

      let songCounter = 0;
      const rows = songs
        .map((s, i) => {
          const isEvent = s.type === 'event';
          const isJoined =
            !isEvent &&
            (!!s.joinWithNext ||
              (i > 0 && !!songs[i - 1]?.joinWithNext && songs[i - 1].type !== 'event'));
          if (isEvent) {
            return `<tr><td class="n"></td><td class="name event-name">---- ${this.escapeHtml(s.title)}</td></tr>`;
          }
          songCounter++;
          const cls = isJoined ? ' class="joined"' : '';
          const displayName = this.escapeHtml((s.setlistName?.trim() || s.title).toUpperCase());
          return `<tr${cls}><td class="n">${songCounter}.-</td><td class="name">${displayName}</td></tr>`;
        })
        .join('');

      const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${this.escapeHtml(playlist.name)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: ${fontSize}pt; color: #000; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #ccc; }
  tr:last-child { border-bottom: none; }
  tr.joined { background: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tr.joined td { color: #fff; }
  td { padding: 0.15em 0.3em; vertical-align: middle; color: #000; }
  td.n { width: 2.8em; text-align: right; padding-right: 0.6em; }
  td.name { font-weight: bold; }
  td.event-name { font-weight: normal; }
</style></head>
<body><table>${rows}</table></body></html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => { win.print(); URL.revokeObjectURL(url); });
      }
    } catch {
      this.toastr.danger('No se pudo generar el PDF', 'Error');
    }
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }

  formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
