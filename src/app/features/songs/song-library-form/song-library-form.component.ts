import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import {
  NbDialogRef,
  NbInputModule,
  NbButtonModule,
  NbCardModule,
  NbSpinnerModule,
  NbFormFieldModule,
  NbIconModule,
} from '@nebular/theme';
import { CommonModule } from '@angular/common';
import { LibrarySong, ItunesTrack } from '../../../core/models/song.model';
import { MusicApiService } from '../../../core/services/music-api.service';
import { BpmService } from '../../../core/services/bpm.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';

@Component({
  selector: 'app-song-library-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NbCardModule,
    NbInputModule,
    NbButtonModule,
    NbSpinnerModule,
    NbFormFieldModule,
    NbIconModule,
  ],
  templateUrl: './song-library-form.component.html',
  styleUrls: ['./song-library-form.component.scss'],
})
export class SongLibraryFormComponent implements OnInit, OnDestroy {
  dialogRef = inject<NbDialogRef<SongLibraryFormComponent>>(NbDialogRef);
  private readonly fb = inject(FormBuilder);
  private readonly musicApi = inject(MusicApiService);
  private readonly bpmService = inject(BpmService);
  readonly connectivity = inject(ConnectivityService);

  form!: FormGroup;
  song: LibrarySong | null = null; // set from outside before open

  searchControl = new FormControl('');
  suggestions: ItunesTrack[] = [];
  isSearching = false;
  isFetchingBpm = false;

  formMode: 'search' | 'manual' = 'search';
  private readonly destroy$ = new Subject<void>();

  // ── Tap BPM ───────────────────────────────────────────────────────────────
  private tapTimestamps: number[] = [];
  tapCount = 0;

  tapBpm(): void {
    const now = Date.now();
    if (this.tapTimestamps.length > 0 && now - this.tapTimestamps[this.tapTimestamps.length - 1] > 3000) {
      this.tapTimestamps = [];
    }
    this.tapTimestamps.push(now);
    this.tapCount = this.tapTimestamps.length;
    if (this.tapTimestamps.length >= 2) {
      const intervals = this.tapTimestamps.slice(1).map((t, i) => t - this.tapTimestamps[i]);
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      this.form.patchValue({ tempo: Math.round(60000 / avg) });
    }
  }

  get isEdit(): boolean { return !!this.song?.id; }
  get hasTaps(): boolean { return this.tapCount > 1; }

  async ngOnInit(): Promise<void> {
    if (this.isEdit) {
      this.formMode = 'manual';
    }

    this.form = this.fb.group({
      title:    [this.song?.title    ?? '', Validators.required],
      artist:   [this.song?.artist   ?? '', Validators.required],
      album:    [this.song?.album    ?? ''],
      duration: [this.song?.duration ?? null, Validators.required],
      tempo:    [this.song?.tempo    ?? null],
      style:    [this.song?.style    ?? ''],
      notes:    [this.song?.notes    ?? ''],
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!this.connectivity.isOnline() || !term?.trim()) {
          this.suggestions = [];
          this.isSearching = false;
          return [];
        }
        this.isSearching = true;
        return this.musicApi.search(term);
      }),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.suggestions = results;
      this.isSearching = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectSuggestion(track: ItunesTrack): void {
    this.form.patchValue({
      title:    track.trackName,
      artist:   track.artistName,
      album:    track.collectionName,
      duration: this.musicApi.formatDuration(track.trackTimeMillis),
      style:    track.primaryGenreName,
    });
    this.suggestions = [];
    this.formMode = 'manual';

    // Auto-fetch BPM via Deezer (no API key required)
    this.isFetchingBpm = true;
    this.bpmService
      .getBpm(track.trackName, track.artistName)
      .subscribe((bpm) => {
        this.isFetchingBpm = false;
        if (bpm !== null) this.form.patchValue({ tempo: bpm });
      });
  }

  switchToManual(): void {
    this.suggestions = [];
    this.formMode = 'manual';
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  submit(): void {
    if (this.formMode === 'search') {
      this.switchToManual();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result: Omit<LibrarySong, 'id'> = {
      ...value,
      duration: value.duration ? Number(value.duration) : undefined,
      tempo:    value.tempo    ? Number(value.tempo)    : undefined,
    };

    if (this.isEdit && this.song) {
      this.dialogRef.close({ ...result, id: this.song.id } as LibrarySong);
    } else {
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
