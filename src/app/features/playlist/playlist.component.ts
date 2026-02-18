import { Component, inject, Input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  NbCardModule,
  NbButtonModule,
  NbIconModule,
  NbToastrService,
  NbDialogService,
  NbBadgeModule,
  NbSpinnerModule,
  NbTooltipModule,
  NbAlertModule,
} from '@nebular/theme';
import { Song, PlaylistWithStats } from '../../core/models/song.model';
import { DatabaseService } from '../../core/services/database.service';
import { SongFormComponent } from './song-form/song-form.component';

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    NbBadgeModule,
    NbSpinnerModule,
    NbTooltipModule,
    NbAlertModule,
  ],
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
})
export class PlaylistComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toastr = inject(NbToastrService);
  private readonly dialog = inject(NbDialogService);

  @Input() playlist!: PlaylistWithStats;
  readonly back = output<void>();

  songs: Song[] = [];
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.loadSongs();
  }

  async loadSongs(): Promise<void> {
    try {
      this.loading = true;
      this.songs = await this.db.getSongsByPlaylist(this.playlist.id);
    } catch {
      this.toastr.danger('No se pudieron cargar las canciones', 'Error');
    } finally {
      this.loading = false;
    }
  }

  openAddForm(): void {
    const ref = this.dialog.open(SongFormComponent, {
      closeOnBackdropClick: false,
    });
    (ref.componentRef.instance as SongFormComponent).song = null;

    ref.onClose.subscribe(async (result?: Partial<Song>) => {
      if (!result) return;
      try {
        const created = await this.db.create({
          ...(result as Omit<Song, 'id' | 'position'>),
          playlistId: this.playlist.id,
        });
        this.songs = [...this.songs, created];
        this.toastr.success(`"${created.title}" añadida`, 'Canción añadida');
      } catch {
        this.toastr.danger('No se pudo añadir la canción', 'Error');
      }
    });
  }

  openAddEvent(): void {
    const ref = this.dialog.open(SongFormComponent, {
      closeOnBackdropClick: false,
    });
    (ref.componentRef.instance as SongFormComponent).song = { type: 'event' } as Partial<Song>;

    ref.onClose.subscribe(async (result?: Partial<Song>) => {
      if (!result) return;
      try {
        const created = await this.db.create({
          title: result.title || '',
          artist: '',
          type: 'event',
          playlistId: this.playlist.id,
        });
        this.songs = [...this.songs, created];
        this.toastr.success(`Evento "${created.title}" añadido`, 'Evento añadido');
      } catch {
        this.toastr.danger('No se pudo añadir el evento', 'Error');
      }
    });
  }

  openEditForm(song: Song): void {
    const ref = this.dialog.open(SongFormComponent, {
      closeOnBackdropClick: false,
    });
    (ref.componentRef.instance as SongFormComponent).song = { ...song };

    ref.onClose.subscribe(async (result?: Partial<Song>) => {
      if (!result) return;
      try {
        const updated = await this.db.update(result as Song);
        this.songs = this.songs.map((s) => (s.id === updated.id ? updated : s));
        this.toastr.success(`"${updated.title}" actualizada`, 'Actualizado');
      } catch {
        this.toastr.danger('No se pudo actualizar', 'Error');
      }
    });
  }

  async deleteSong(song: Song): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar "${song.title}"?`);
    if (!confirmed) return;
    try {
      await this.db.delete(song.id);
      this.songs = this.songs.filter((s) => s.id !== song.id);
      this.toastr.warning(`"${song.title}" eliminada`, 'Eliminado');
    } catch {
      this.toastr.danger('No se pudo eliminar', 'Error');
    }
  }

  async onDrop(event: CdkDragDrop<Song[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.songs, event.previousIndex, event.currentIndex);
    const ids = this.songs.map((s) => s.id);
    try {
      this.songs = await this.db.reorder(this.playlist.id, ids);
    } catch {
      this.toastr.danger('No se pudo guardar el nuevo orden', 'Error');
      await this.loadSongs();
    }
  }

  async toggleJoinWithNext(song: Song): Promise<void> {
    try {
      const updated = await this.db.update({ ...song, joinWithNext: !song.joinWithNext });
      this.songs = this.songs.map((s) => (s.id === updated.id ? updated : s));
    } catch {
      this.toastr.danger('No se pudo guardar el cambio', 'Error');
    }
  }

  // Returns 1-based song number (excluding events)
  songNumber(index: number): number {
    return this.songs.slice(0, index + 1).filter((s) => s.type !== 'event').length;
  }

  isJoinStart(index: number): boolean {
    const song = this.songs[index];
    return song?.type !== 'event' && !!song?.joinWithNext;
  }

  isJoinEnd(index: number): boolean {
    if (index === 0) return false;
    const prev = this.songs[index - 1];
    return prev?.type !== 'event' && !!prev?.joinWithNext;
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get totalDuration(): string {
    const total = this.songs
      .filter((s) => s.type !== 'event')
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);
    if (!total) return '';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }

  hasSongNotes(): boolean {
    return this.songs.some((s) => s.type !== 'event' && !!s.notes);
  }

  exportToPdf(): void {
    const count = this.songs.length;
    const fontSize = Math.max(8, Math.min(56, Math.floor(740 / Math.max(1, count * 1.4 + 1))));

    let songCounter = 0;
    const rows = this.songs
      .map((s, i) => {
        const isEvent = s.type === 'event';
        const isJoined =
          !isEvent &&
          (!!s.joinWithNext ||
            (i > 0 && !!this.songs[i - 1]?.joinWithNext && this.songs[i - 1].type !== 'event'));

        if (isEvent) {
          return `<tr class="event-row"><td class="n"></td><td class="name event-name">---- ${this.escapeHtml(s.title)}</td></tr>`;
        }

        songCounter++;
        const cls = isJoined ? ' class="joined"' : '';
        const displayName = this.escapeHtml((s.setlistName?.trim() || s.title).toUpperCase());
        return `<tr${cls}><td class="n">${songCounter}.-</td><td class="name">${displayName}</td></tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(this.playlist.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${fontSize}pt; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    tr { border-bottom: 1px solid #ccc; }
    tr:last-child { border-bottom: none; }
    tr.joined { background: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    tr.joined td { color: #fff; }
    td { padding: 0.15em 0.3em; vertical-align: middle; color: #000; }
    td.n { width: 2.8em; text-align: right; padding-right: 0.6em; font-variant-numeric: tabular-nums; }
    td.name { font-weight: bold; }
    td.event-name { font-weight: normal; }
  </style>
</head>
<body>
  <table>${rows}</table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.print();
        URL.revokeObjectURL(url);
      });
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  getGenreStyle(genre: string): Record<string, string> {
    const map: Record<string, { bg: string; text: string }> = {
      'death metal':           { bg: '#c0392b', text: '#fff' },
      'black metal':           { bg: '#2c3e50', text: '#ecf0f1' },
      'thrash metal':          { bg: '#e67e22', text: '#fff' },
      'power metal':           { bg: '#f39c12', text: '#fff' },
      'doom metal':            { bg: '#7f8c8d', text: '#fff' },
      'progressive metal':     { bg: '#2980b9', text: '#fff' },
      'prog metal':            { bg: '#2980b9', text: '#fff' },
      'symphonic metal':       { bg: '#8e44ad', text: '#fff' },
      'heavy metal':           { bg: '#e74c3c', text: '#fff' },
      'speed metal':           { bg: '#d81b60', text: '#fff' },
      'folk metal':            { bg: '#27ae60', text: '#fff' },
      'groove metal':          { bg: '#16a085', text: '#fff' },
      'nu metal':              { bg: '#d35400', text: '#fff' },
      'nu-metal':              { bg: '#d35400', text: '#fff' },
      'gothic metal':          { bg: '#6c3483', text: '#fff' },
      'metalcore':             { bg: '#1abc9c', text: '#fff' },
      'deathcore':             { bg: '#922b21', text: '#fff' },
      'melodic death metal':   { bg: '#cb4335', text: '#fff' },
      'melodic black metal':   { bg: '#4a235a', text: '#fff' },
      'stoner metal':          { bg: '#a93226', text: '#fff' },
      'industrial metal':      { bg: '#1c2833', text: '#ecf0f1' },
      'alternative metal':     { bg: '#2e86c1', text: '#fff' },
      'glam metal':            { bg: '#c0392b', text: '#fff' },
      'hard rock':             { bg: '#e74c3c', text: '#fff' },
      'rock':                  { bg: '#884ea0', text: '#fff' },
    };
    const colors = map[genre.toLowerCase().trim()] ?? { bg: '#546e7a', text: '#fff' };
    return { background: colors.bg, color: colors.text };
  }
}
