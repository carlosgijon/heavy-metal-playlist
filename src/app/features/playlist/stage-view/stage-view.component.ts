import { Component, inject, OnInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { Song } from '../../../core/models/song.model';

export interface StageViewData {
  songs: Song[];
  playlistName: string;
}

@Component({
  selector: 'app-stage-view',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="stage-overlay" (click)="onOverlayClick($event)">
      <div class="stage-box" (click)="$event.stopPropagation()">

        <!-- Top bar -->
        <div class="stage-topbar">
          <span class="stage-playlist-name">{{ data.playlistName }}</span>
          <div class="stage-topbar-right">
            <span class="stage-counter">{{ currentIndex + 1 }} / {{ songList.length }}</span>
            <button class="btn btn-ghost btn-sm" (click)="close()">
              <ng-icon name="heroXMark" class="w-5 h-5"></ng-icon>
            </button>
          </div>
        </div>

        <!-- Main content -->
        <div class="stage-main">

          <!-- ── CURRENT SONG ── -->
          <div class="stage-current">
            <div class="stage-song-number">{{ currentSongNumber }}</div>
            <div class="stage-song-title">{{ currentSong?.setlistName || currentSong?.title }}</div>
            <div class="stage-song-artist">{{ currentSong?.artist }}</div>

            <!-- BPM + Metronome -->
            <div class="stage-bpm-row" *ngIf="currentSong?.tempo">
              <div class="stage-bpm-display" [class.beat-flash]="beatPulse">
                <span class="stage-bpm-number">{{ currentSong?.tempo }}</span>
                <span class="stage-bpm-unit">BPM</span>
              </div>
              <button
                class="stage-metro-btn"
                [class.stage-metro-btn--active]="metronomeActive"
                (click)="toggleMetronome()"
                [title]="metronomeActive ? 'Detener metrónomo (M)' : 'Activar metrónomo (M)'"
              >
                <span class="stage-metro-dot" [class.stage-metro-dot--pulse]="beatPulse"></span>
                {{ metronomeActive ? 'Parar' : 'Metro' }}
              </button>
            </div>

            <div class="stage-song-meta">
              <span *ngIf="currentSong?.duration" class="stage-duration">{{ formatDuration(currentSong?.duration) }}</span>
              <span *ngIf="currentSong?.style" class="stage-style">{{ currentSong?.style }}</span>
            </div>
            <div *ngIf="currentSong?.notes" class="stage-notes">{{ currentSong?.notes }}</div>

            <!-- Join indicator -->
            <div *ngIf="currentSong?.joinWithNext" class="stage-join-indicator">
              <ng-icon name="heroArrowTurnDownRight" class="w-5 h-5"></ng-icon>
              Encadenado con la siguiente
            </div>
          </div>

          <!-- ── NEXT SONG ── -->
          <div class="stage-next-wrapper" *ngIf="nextSong">
            <div class="stage-next-label">
              <ng-icon name="heroArrowRight" class="w-4 h-4"></ng-icon>
              Siguiente
            </div>
            <div class="stage-next-title">{{ nextSong?.setlistName || nextSong?.title }}</div>
            <div class="stage-next-artist">{{ nextSong?.artist }}</div>
            <div class="stage-next-meta" *ngIf="nextSong?.tempo || nextSong?.duration">
              <span *ngIf="nextSong?.tempo">{{ nextSong?.tempo }} BPM</span>
              <span *ngIf="nextSong?.duration"> · {{ formatDuration(nextSong?.duration) }}</span>
            </div>
          </div>
          <div class="stage-next-wrapper stage-end" *ngIf="!nextSong">
            <div class="stage-next-label">Fin del setlist</div>
          </div>

        </div>

        <!-- Progress bar -->
        <div class="stage-progress">
          <div class="stage-progress-fill" [style.width.%]="progressPct"></div>
        </div>

        <!-- Controls -->
        <div class="stage-controls">
          <button class="stage-btn stage-btn-prev" (click)="prev()" [disabled]="currentIndex === 0">
            <ng-icon name="heroChevronLeft" class="w-8 h-8"></ng-icon>
          </button>

          <div class="stage-time-remaining" *ngIf="remainingTime">
            <span class="stage-time-label">Tiempo restante</span>
            <span class="stage-time-value">{{ remainingTime }}</span>
          </div>
          <div class="stage-time-remaining" *ngIf="!remainingTime"></div>

          <button class="stage-btn stage-btn-next" (click)="next()" [disabled]="currentIndex === songList.length - 1">
            <ng-icon name="heroChevronRight" class="w-8 h-8"></ng-icon>
          </button>
        </div>

        <!-- Keyboard hint -->
        <div class="stage-hint">
          <span>← → Navegar</span>
          <span>M Metrónomo</span>
          <span>Esc Salir</span>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./stage-view.component.scss'],
})
export class StageViewComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(DialogRef<void>);
  private readonly zone = inject(NgZone);
  readonly data = inject<StageViewData>(DIALOG_DATA);

  songList: Song[] = [];
  currentIndex = 0;

  // Metronome
  metronomeActive = false;
  beatPulse = false;
  private audioCtx: AudioContext | null = null;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.songList = this.data.songs;
  }

  ngOnDestroy(): void {
    this.stopMetronome();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); this.toggleMetronome(); }
    if (e.key === 'Escape') this.close();
  }

  get currentSong(): Song | undefined { return this.songList[this.currentIndex]; }

  get nextSong(): Song | undefined {
    for (let i = this.currentIndex + 1; i < this.songList.length; i++) {
      if (this.songList[i].type !== 'event') return this.songList[i];
    }
    return undefined;
  }

  get currentSongNumber(): string {
    const s = this.currentSong;
    if (!s || s.type === 'event') return '—';
    const num = this.songList.slice(0, this.currentIndex + 1).filter(x => x.type !== 'event').length;
    return `${num}`;
  }

  get progressPct(): number {
    if (this.songList.length <= 1) return 100;
    return Math.round((this.currentIndex / (this.songList.length - 1)) * 100);
  }

  get remainingTime(): string {
    const remaining = this.songList
      .slice(this.currentIndex)
      .filter(s => s.type !== 'event')
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);
    if (!remaining) return '';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  next(): void {
    if (this.currentIndex < this.songList.length - 1) {
      this.currentIndex++;
      if (this.metronomeActive) this.restartMetronome();
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      if (this.metronomeActive) this.restartMetronome();
    }
  }

  close(): void { this.dialogRef.close(); }

  onOverlayClick(e: MouseEvent): void { this.close(); }

  formatDuration(seconds?: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Metronome ────────────────────────────────────────────────────────

  toggleMetronome(): void {
    if (this.metronomeActive) {
      this.stopMetronome();
    } else {
      this.startMetronome();
    }
  }

  private startMetronome(): void {
    const bpm = this.currentSong?.tempo;
    if (!bpm) return;
    this.audioCtx = new AudioContext();
    this.metronomeActive = true;
    const intervalMs = Math.round(60000 / bpm);
    this.doTick();
    this.metronomeTimer = setInterval(() => {
      this.zone.run(() => this.doTick());
    }, intervalMs);
  }

  private stopMetronome(): void {
    if (this.metronomeTimer !== null) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    this.audioCtx?.close();
    this.audioCtx = null;
    this.metronomeActive = false;
    this.beatPulse = false;
  }

  private restartMetronome(): void {
    this.stopMetronome();
    setTimeout(() => this.startMetronome(), 0);
  }

  private doTick(): void {
    this.playClick();
    this.beatPulse = true;
    setTimeout(() => { this.beatPulse = false; }, 120);
  }

  private playClick(): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.04);
  }
}
