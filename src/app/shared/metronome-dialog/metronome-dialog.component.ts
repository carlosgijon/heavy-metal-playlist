import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface MetronomeData {
  bpm: number;
  title: string;
}

@Component({
  selector: 'app-metronome-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metro-box">
      <h3 class="metro-song" [title]="data.title">{{ data.title }}</h3>
      <p class="metro-bpm">{{ data.bpm }}<span class="metro-bpm-label"> BPM</span></p>

      <!-- Beat squares -->
      <div class="metro-beats">
        @for (beat of beats; track beat) {
          <div class="metro-beat"
               [class.metro-beat--first]="currentBeat() === beat && beat === 0"
               [class.metro-beat--rest]="currentBeat() === beat && beat > 0">
            {{ beat + 1 }}
          </div>
        }
      </div>

      <!-- Controls -->
      <div class="metro-controls">
        <button class="btn btn-primary flex-1" (click)="togglePlay()">
          @if (isPlaying()) {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 flex-shrink-0">
              <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd"/>
            </svg>
            Parar
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 flex-shrink-0">
              <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd"/>
            </svg>
            Iniciar
          }
        </button>
        <button class="btn flex-1" [class.btn-ghost]="!isMuted()" [class.btn-warning]="isMuted()" (click)="toggleMute()">
          @if (isMuted()) {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
            </svg>
            Silenciado
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
            </svg>
            Mutear
          }
        </button>
      </div>

      <div class="modal-action mt-3">
        <button class="btn btn-sm btn-ghost" type="button" (click)="close()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .metro-box {
      background-color: oklch(var(--b1));
      border-radius: 1rem;
      padding: 1.5rem;
      width: 22rem;
      max-width: 95vw;
    }

    .metro-song {
      font-weight: 700;
      font-size: 1.05rem;
      margin: 0 0 0.2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metro-bpm {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0 0 1.25rem;
      color: oklch(var(--p));
      line-height: 1;
    }

    .metro-bpm-label {
      font-size: 1rem;
      font-weight: 400;
      opacity: 0.55;
    }

    .metro-beats {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .metro-beat {
      flex: 1;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 800;
      border-radius: 0.625rem;
      background-color: oklch(var(--b3));
      color: oklch(var(--bc) / 0.25);
      transition: background-color 0.04s, color 0.04s;
      user-select: none;
    }

    .metro-beat--first {
      background-color: #dc2626;
      color: #ffffff;
    }

    .metro-beat--rest {
      background-color: #16a34a;
      color: #ffffff;
    }

    .metro-controls {
      display: flex;
      gap: 0.5rem;
    }
  `],
})
export class MetronomeDialogComponent implements OnDestroy {
  readonly dialogRef = inject(DialogRef);
  readonly data = inject<MetronomeData>(DIALOG_DATA);

  readonly beats = [0, 1, 2, 3];
  readonly currentBeat = signal(-1);
  readonly isPlaying = signal(false);
  readonly isMuted = signal(false);

  private timer: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  private get intervalMs(): number {
    return 60000 / this.data.bpm;
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.stopMetronome();
    } else {
      this.startMetronome();
    }
  }

  private startMetronome(): void {
    this.isPlaying.set(true);
    this.currentBeat.set(0);
    this.playClick(true);
    this.timer = setInterval(() => {
      const next = (this.currentBeat() + 1) % 4;
      this.currentBeat.set(next);
      this.playClick(next === 0);
    }, this.intervalMs);
  }

  private stopMetronome(): void {
    this.isPlaying.set(false);
    this.currentBeat.set(-1);
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggleMute(): void {
    this.isMuted.set(!this.isMuted());
  }

  private playClick(isFirst: boolean): void {
    if (this.isMuted()) return;
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = isFirst ? 1000 : 750;
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  close(): void {
    this.stopMetronome();
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.stopMetronome();
    if (this.audioCtx) {
      void this.audioCtx.close();
    }
  }
}
