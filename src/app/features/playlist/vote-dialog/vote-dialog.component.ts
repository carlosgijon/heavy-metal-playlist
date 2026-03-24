import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Song, VoteSession, VoteResult } from '../../../core/models/song.model';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';

export interface VoteDialogData {
  playlistId: string;
  playlistName: string;
  songs: Song[];
}

@Component({
  selector: 'app-vote-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="vote-dialog">
      <!-- Header -->
      <div class="vd-header">
        <div>
          <h2 class="vd-title">Votación de Setlist</h2>
          <p class="vd-sub">{{ data.playlistName }}</p>
        </div>
        <button class="btn btn-sm btn-ghost btn-circle" (click)="close()">✕</button>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div class="flex justify-center items-center py-12">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      }

      <!-- No session -->
      @if (!loading && !session) {
        <div class="vd-empty">
          <p class="text-base-content/60 mb-4">No hay ninguna sesión de votación activa para este setlist.</p>
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Nombre de la sesión</span></label>
            <input
              type="text"
              class="input input-bordered input-sm"
              placeholder="Ej: Votación Madrid 2026"
              [(ngModel)]="newTitle"
            />
          </div>
          <button class="btn btn-primary btn-sm" [disabled]="!newTitle.trim() || creating" (click)="createSession()">
            @if (creating) { <span class="loading loading-spinner loading-xs"></span> }
            Iniciar votación
          </button>
        </div>
      }

      <!-- Active session -->
      @if (!loading && session) {
        <!-- Status badge + session actions -->
        <div class="vd-session-header">
          <div class="flex items-center gap-2">
            <span class="vd-title-sm">{{ session.title }}</span>
            <span class="badge badge-sm" [class]="session.status === 'open' ? 'badge-success' : 'badge-neutral'">
              {{ session.status === 'open' ? 'Abierta' : 'Cerrada' }}
            </span>
            <span class="text-xs text-base-content/50">{{ session.votes.length }} voto(s)</span>
          </div>
          <div class="flex gap-1">
            @if (session.status === 'open') {
              <button class="btn btn-xs btn-warning" [disabled]="acting" (click)="closeSession()">Cerrar</button>
            } @else {
              <button class="btn btn-xs btn-info" [disabled]="acting" (click)="reopenSession()">Reabrir</button>
            }
            <button class="btn btn-xs btn-error" [disabled]="acting" (click)="deleteSession()">Eliminar</button>
          </div>
        </div>

        <!-- Tabs: Votar / Resultados -->
        <div class="tabs tabs-bordered mb-4">
          <button class="tab" [class.tab-active]="activeTab() === 'vote'" (click)="activeTab.set('vote')">
            Votar
          </button>
          <button class="tab" [class.tab-active]="activeTab() === 'results'" (click)="switchToResults()">
            Resultados
          </button>
        </div>

        <!-- Tab: VOTAR -->
        @if (activeTab() === 'vote') {
          @if (session.status === 'closed') {
            <p class="text-base-content/50 text-sm py-4">La sesión está cerrada. No se pueden añadir votos.</p>
          } @else {
            <div class="vd-vote-form">
              <div class="form-control mb-3">
                <label class="label py-1"><span class="label-text text-xs">Tu nombre</span></label>
                <input
                  type="text"
                  class="input input-bordered input-sm"
                  placeholder="Nombre del integrante"
                  [(ngModel)]="voterName"
                />
              </div>
              <p class="text-xs text-base-content/50 mb-2">Arrastra las canciones en el orden que prefieras (de favorita a última):</p>
              <div class="vd-song-list" cdkDropList (cdkDropListDropped)="onDrop($event)">
                @for (song of voteSongs; track song.id; let i = $index) {
                  <div class="vd-song-item" cdkDrag>
                    <span class="vd-drag-handle">⠿</span>
                    <span class="vd-rank">{{ i + 1 }}</span>
                    <div class="vd-song-info">
                      <span class="vd-song-title">{{ song.setlistName || song.title }}</span>
                      <span class="vd-song-artist">{{ song.artist }}</span>
                    </div>
                    @if (song.tempo) {
                      <span class="badge badge-xs badge-ghost">{{ song.tempo }} BPM</span>
                    }
                  </div>
                }
              </div>
              <button
                class="btn btn-primary btn-sm mt-3 w-full"
                [disabled]="!voterName.trim() || submitting"
                (click)="submitVote()"
              >
                @if (submitting) { <span class="loading loading-spinner loading-xs"></span> }
                Enviar voto
              </button>

              <!-- Existing votes list -->
              @if (session.votes.length > 0) {
                <div class="vd-voters">
                  <p class="text-xs text-base-content/50 mb-1">Votos recibidos:</p>
                  @for (v of session.votes; track v.id) {
                    <span class="badge badge-sm badge-outline mr-1">{{ v.voterName }}</span>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- Tab: RESULTADOS -->
        @if (activeTab() === 'results') {
          @if (resultsLoading) {
            <div class="flex justify-center py-8"><span class="loading loading-spinner loading-md"></span></div>
          } @else if (!results.length) {
            <p class="text-base-content/50 text-sm py-4">Aún no hay votos suficientes para mostrar resultados.</p>
          } @else {
            <div class="vd-results">
              <p class="text-xs text-base-content/50 mb-3">
                Ranking por posición media (menor = más votada al principio)
              </p>
              @for (r of results; track r.songId; let i = $index) {
                @let song = songById(r.songId);
                <div class="vd-result-row">
                  <span class="vd-result-rank" [class]="rankClass(i)">{{ i + 1 }}</span>
                  <div class="vd-result-info">
                    <span class="vd-result-title">{{ song?.setlistName || song?.title || r.songId }}</span>
                    <span class="vd-result-artist">{{ song?.artist }}</span>
                  </div>
                  <div class="vd-result-bar-wrap">
                    <div class="vd-result-bar" [style.width]="barWidth(r, results)"></div>
                  </div>
                  <span class="vd-result-avg">Ø {{ r.avgRank.toFixed(1) }}</span>
                </div>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .vote-dialog {
      background: oklch(var(--b1));
      color: oklch(var(--bc));
      border-radius: 12px;
      width: 520px;
      max-width: 95vw;
      max-height: 85vh;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .vd-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .vd-title { font-size: 1.1rem; font-weight: 700; }
    .vd-title-sm { font-size: .95rem; font-weight: 600; }
    .vd-sub { font-size: .8rem; opacity: .6; }
    .vd-empty { display: flex; flex-direction: column; align-items: flex-start; padding: 8px 0; }
    .vd-session-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      background: oklch(var(--b2));
      border-radius: 8px;
      flex-wrap: wrap;
      gap: 6px;
    }
    .vd-vote-form { display: flex; flex-direction: column; }
    .vd-song-list {
      border: 1px solid oklch(var(--b3));
      border-radius: 8px;
      overflow: hidden;
    }
    .vd-song-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: oklch(var(--b1));
      border-bottom: 1px solid oklch(var(--b3));
      cursor: grab;
      transition: background .15s;
    }
    .vd-song-item:last-child { border-bottom: none; }
    .vd-song-item:hover { background: oklch(var(--b2)); }
    .vd-song-item.cdk-drag-preview {
      background: oklch(var(--b2));
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      border-radius: 6px;
    }
    .vd-song-item.cdk-drag-placeholder { opacity: .4; }
    .vd-drag-handle { cursor: grab; opacity: .4; font-size: 1rem; flex-shrink: 0; }
    .vd-rank {
      width: 20px; text-align: center;
      font-size: .75rem; font-weight: 700;
      opacity: .5; flex-shrink: 0;
    }
    .vd-song-info { flex: 1; min-width: 0; }
    .vd-song-title { display: block; font-size: .85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vd-song-artist { display: block; font-size: .75rem; opacity: .55; }
    .vd-voters { margin-top: 10px; padding-top: 10px; border-top: 1px solid oklch(var(--b3)); }

    /* Results */
    .vd-results { display: flex; flex-direction: column; gap: 6px; }
    .vd-result-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px;
      background: oklch(var(--b2));
      border-radius: 6px;
    }
    .vd-result-rank {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700; flex-shrink: 0;
    }
    .rank-gold   { background: #f59e0b; color: #000; }
    .rank-silver { background: #9ca3af; color: #000; }
    .rank-bronze { background: #b45309; color: #fff; }
    .rank-other  { background: oklch(var(--b3)); }
    .vd-result-info { flex: 1; min-width: 0; }
    .vd-result-title { display: block; font-size: .85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vd-result-artist { display: block; font-size: .73rem; opacity: .55; }
    .vd-result-bar-wrap { width: 90px; height: 6px; background: oklch(var(--b3)); border-radius: 3px; flex-shrink: 0; }
    .vd-result-bar { height: 100%; background: oklch(var(--p)); border-radius: 3px; transition: width .3s; }
    .vd-result-avg { font-size: .72rem; opacity: .6; width: 42px; text-align: right; flex-shrink: 0; }
  `],
})
export class VoteDialogComponent implements OnInit {
  private db = inject(DatabaseService);
  private toast = inject(ToastService);
  private dialogRef = inject(DialogRef);
  readonly data: VoteDialogData = inject(DIALOG_DATA);

  loading = true;
  creating = false;
  acting = false;
  submitting = false;
  resultsLoading = false;

  session: VoteSession | null = null;
  results: VoteResult[] = [];

  newTitle = '';
  voterName = '';
  voteSongs: Song[] = [];

  activeTab = signal<'vote' | 'results'>('vote');

  async ngOnInit(): Promise<void> {
    this.voteSongs = this.data.songs.filter(s => s.type !== 'event');
    try {
      this.session = await this.db.getVoteSession(this.data.playlistId);
    } catch {
      this.toast.danger('Error al cargar la sesión de votación');
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  async createSession(): Promise<void> {
    if (!this.newTitle.trim()) return;
    this.creating = true;
    try {
      this.session = await this.db.createVoteSession(this.data.playlistId, this.newTitle.trim());
      this.toast.success('Sesión de votación iniciada');
    } catch {
      this.toast.danger('Error al crear la sesión');
    } finally {
      this.creating = false;
    }
  }

  async closeSession(): Promise<void> {
    if (!this.session) return;
    this.acting = true;
    try {
      this.session = await this.db.closeVoteSession(this.session.id);
      this.toast.info('Sesión cerrada');
    } catch {
      this.toast.danger('Error al cerrar la sesión');
    } finally {
      this.acting = false;
    }
  }

  async reopenSession(): Promise<void> {
    if (!this.session) return;
    this.acting = true;
    try {
      this.session = await this.db.reopenVoteSession(this.session.id);
      this.toast.info('Sesión reabierta');
    } catch {
      this.toast.danger('Error al reabrir la sesión');
    } finally {
      this.acting = false;
    }
  }

  async deleteSession(): Promise<void> {
    if (!this.session) return;
    this.acting = true;
    try {
      await this.db.deleteVoteSession(this.session.id);
      this.session = null;
      this.results = [];
      this.activeTab.set('vote');
      this.toast.warning('Sesión eliminada');
    } catch {
      this.toast.danger('Error al eliminar la sesión');
    } finally {
      this.acting = false;
    }
  }

  onDrop(event: CdkDragDrop<Song[]>): void {
    moveItemInArray(this.voteSongs, event.previousIndex, event.currentIndex);
  }

  async submitVote(): Promise<void> {
    if (!this.voterName.trim() || !this.session) return;
    this.submitting = true;
    try {
      const orderedIds = this.voteSongs.map(s => s.id);
      await this.db.castVote(this.session.id, this.voterName.trim(), orderedIds);
      // Refresh session to update vote count
      this.session = await this.db.getVoteSession(this.data.playlistId);
      this.toast.success(`Voto de ${this.voterName.trim()} registrado`);
      this.voterName = '';
    } catch {
      this.toast.danger('Error al enviar el voto');
    } finally {
      this.submitting = false;
    }
  }

  async switchToResults(): Promise<void> {
    this.activeTab.set('results');
    if (!this.session || this.results.length) return;
    this.resultsLoading = true;
    try {
      this.results = await this.db.getVoteResults(this.session.id);
    } catch {
      this.toast.danger('Error al cargar resultados');
    } finally {
      this.resultsLoading = false;
    }
  }

  songById(id: string): Song | undefined {
    return this.data.songs.find(s => s.id === id);
  }

  rankClass(i: number): string {
    if (i === 0) return 'rank-gold';
    if (i === 1) return 'rank-silver';
    if (i === 2) return 'rank-bronze';
    return 'rank-other';
  }

  barWidth(r: VoteResult, all: VoteResult[]): string {
    const best = all[0]?.avgRank ?? 1;
    const worst = all[all.length - 1]?.avgRank ?? best + 1;
    const range = worst - best || 1;
    const pct = Math.round((1 - (r.avgRank - best) / range) * 100);
    return `${Math.max(pct, 8)}%`;
  }
}
