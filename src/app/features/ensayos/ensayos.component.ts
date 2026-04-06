import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { Dialog } from '@angular/cdk/dialog';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Rehearsal, RehearsalSongEntry } from '../../core/models/rehearsal.model';
import { LibrarySong, PlaylistWithStats } from '../../core/models/song.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-ensayos',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './ensayos.component.html',
  styleUrls: ['./ensayos.component.scss'],
})
export class EnsayosComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  rehearsals: Rehearsal[] = [];
  librarySongs: LibrarySong[] = [];
  playlists: PlaylistWithStats[] = [];
  loading = true;

  // New rehearsal form
  showNewForm = false;
  newDate = new Date().toISOString().slice(0, 10);
  newNotes = '';
  newStatus: 'PLANNED' | 'COMPLETED' = 'PLANNED';
  creating = false;

  // Expanded rehearsal
  expandedId: string | null = null;

  // Add song to rehearsal
  pendingRehearsalId: string | null = null;
  selectedSongId = '';
  songNotes = '';
  songRating: number | null = null;
  addingSong = false;

  // Import playlist
  importingPlaylistForRehearsal: string | null = null;
  selectedPlaylistToImport = '';
  isImporting = false;

  // Inline edit notes for song
  editingSongEntryId: string | null = null;
  editSongNotes = '';
  editSongRating: number | null = null;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadRehearsals(), this.loadLibrary(), this.loadPlaylists()]);
  }

  private async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await this.db.getPlaylists();
    } catch { /* ignore */ }
  }

  private async loadRehearsals(): Promise<void> {
    try {
      this.rehearsals = await this.db.getRehearsals();
    } catch {
      this.toast.danger('Error al cargar los ensayos');
    } finally {
      this.loading = false;
    }
  }

  private async loadLibrary(): Promise<void> {
    try {
      this.librarySongs = await this.db.getLibrarySongs();
    } catch { /* non-critical */ }
  }

  async createRehearsal(): Promise<void> {
    if (!this.newDate) return;
    this.creating = true;
    try {
      const r = await this.db.createRehearsal({ date: this.newDate, notes: this.newNotes || undefined, status: this.newStatus });
      
      try {
        await this.db.createCalendarEvent({
          title: 'Ensayo' + (this.newStatus === 'PLANNED' ? ' (Planificado)' : ''),
          date: this.newDate,
          type: 'rehearsal',
          allDay: true
        });
      } catch (calErr) {
        console.warn('Could not sync w/ calendar', calErr);
      }

      this.rehearsals = [r, ...this.rehearsals];
      this.showNewForm = false;
      this.newDate = new Date().toISOString().slice(0, 10);
      this.newNotes = '';
      this.newStatus = 'PLANNED';
      this.expandedId = r.id;
      this.toast.success('Ensayo creado');
    } catch {
      this.toast.danger('Error al crear el ensayo');
    } finally {
      this.creating = false;
    }
  }

  async completeRehearsal(r: Rehearsal): Promise<void> {
    try {
      const updated = await this.db.updateRehearsal({ id: r.id, status: 'COMPLETED' });
      this.rehearsals = this.rehearsals.map(x => x.id === r.id ? { ...x, status: 'COMPLETED' } : x);
      this.toast.success('Ensayo completado');
    } catch {
      this.toast.danger('Error al actualizar el estado');
    }
  }

  deleteRehearsal(r: Rehearsal): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar ensayo', message: `¿Eliminar el ensayo del ${this.formatDate(r.date)}?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteRehearsal(r.id);
        this.rehearsals = this.rehearsals.filter(x => x.id !== r.id);
        this.toast.warning('Ensayo eliminado');
      } catch { this.toast.danger('Error al eliminar'); }
    });
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    this.pendingRehearsalId = null;
    this.importingPlaylistForRehearsal = null;
  }

  openAddSong(rehearsalId: string): void {
    this.pendingRehearsalId = rehearsalId;
    this.selectedSongId = this.librarySongs[0]?.id ?? '';
    this.songNotes = '';
    this.songRating = null;
  }

  async confirmAddSong(): Promise<void> {
    if (!this.pendingRehearsalId || !this.selectedSongId) return;
    this.addingSong = true;
    try {
      const entry = await this.db.addRehearsalSong(this.pendingRehearsalId, {
        songId: this.selectedSongId,
        notes: this.songNotes || undefined,
        rating: this.songRating ?? undefined,
      });
      this.rehearsals = this.rehearsals.map(r =>
        r.id === this.pendingRehearsalId ? { ...r, songs: [...r.songs, entry] } : r
      );
      this.pendingRehearsalId = null;
    } catch {
      this.toast.danger('Error al añadir la canción');
    } finally {
      this.addingSong = false;
    }
  }

  startEditSong(entry: RehearsalSongEntry): void {
    this.editingSongEntryId = entry.id;
    this.editSongNotes = entry.notes ?? '';
    this.editSongRating = entry.rating ?? null;
  }

  async saveEditSong(rehearsalId: string, entry: RehearsalSongEntry): Promise<void> {
    try {
      const updated = await this.db.updateRehearsalSong(rehearsalId, entry.id, {
        notes: this.editSongNotes || undefined,
        rating: this.editSongRating ?? undefined,
      });
      this.rehearsals = this.rehearsals.map(r =>
        r.id === rehearsalId
          ? { ...r, songs: r.songs.map(s => s.id === entry.id ? updated : s) }
          : r
      );
      this.editingSongEntryId = null;
    } catch { this.toast.danger('Error al guardar'); }
  }

  async removeSong(rehearsalId: string, entry: RehearsalSongEntry): Promise<void> {
    try {
      await this.db.deleteRehearsalSong(rehearsalId, entry.id);
      this.rehearsals = this.rehearsals.map(r =>
        r.id === rehearsalId ? { ...r, songs: r.songs.filter(s => s.id !== entry.id) } : r
      );
    } catch { this.toast.danger('Error al eliminar'); }
  }

  formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  ratingStars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  availableSongs(r: Rehearsal): LibrarySong[] {
    const usedIds = new Set(r.songs.map(s => s.songId));
    return this.librarySongs.filter(s => !usedIds.has(s.id));
  }

  getLibrarySongStatus(songId: string): string {
    return this.librarySongs.find(s => s.id === songId)?.status ?? 'READY';
  }

  async updateSongStatus(songId: string, newStatus: 'NEW' | 'LEARNING' | 'READY'): Promise<void> {
    const libSong = this.librarySongs.find(s => s.id === songId);
    if (!libSong) return;
    try {
      const updated = await this.db.updateLibrarySong({ ...libSong, status: newStatus });
      this.librarySongs = this.librarySongs.map(s => s.id === songId ? updated : s);
      this.toast.success('Estado de canción actualizado');
    } catch {
      this.toast.danger('Error al actualizar el estado global');
    }
  }

  openImportPlaylist(rehearsalId: string): void {
    this.importingPlaylistForRehearsal = rehearsalId;
    this.selectedPlaylistToImport = this.playlists[0]?.id ?? '';
    this.pendingRehearsalId = null;
  }

  async confirmImportPlaylist(): Promise<void> {
    if (!this.importingPlaylistForRehearsal || !this.selectedPlaylistToImport) return;
    this.isImporting = true;
    try {
      const songs = await this.db.getSongsByPlaylist(this.selectedPlaylistToImport);
      const toAdd = songs.filter(s => s.type !== 'event' && s.songId);
      
      const rehearsal = this.rehearsals.find(r => r.id === this.importingPlaylistForRehearsal);
      if (!rehearsal) throw new Error();

      for (const song of toAdd) {
        if (rehearsal.songs.some(s => s.songId === song.songId)) continue;
        const entry = await this.db.addRehearsalSong(this.importingPlaylistForRehearsal, {
          songId: song.songId!,
        });
        rehearsal.songs = [...rehearsal.songs, entry];
      }
      this.toast.success('Playlist importada al ensayo');
      this.importingPlaylistForRehearsal = null;
    } catch {
      this.toast.danger('Error al importar la playlist');
    } finally {
      this.isImporting = false;
    }
  }
}
