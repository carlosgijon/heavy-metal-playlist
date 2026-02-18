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
  NbCheckboxModule,
} from '@nebular/theme';
import { CommonModule } from '@angular/common';
import { Song, ItunesTrack } from '../../../core/models/song.model';
import { MusicApiService } from '../../../core/services/music-api.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';

@Component({
  selector: 'app-song-form',
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
    NbCheckboxModule,
  ],
  templateUrl: './song-form.component.html',
  styleUrls: ['./song-form.component.scss'],
})
export class SongFormComponent implements OnInit, OnDestroy {
  dialogRef = inject<NbDialogRef<SongFormComponent>>(NbDialogRef);
  private readonly fb = inject(FormBuilder);
  private readonly musicApi = inject(MusicApiService);
  readonly connectivity = inject(ConnectivityService);

  form!: FormGroup;
  song: Partial<Song> | null = null; // set from outside before open

  // Search state
  searchControl = new FormControl('');
  suggestions: ItunesTrack[] = [];
  isSearching = false;

  /** 'search' = show iTunes search input; 'manual' = show form fields */
  formMode: 'search' | 'manual' = 'search';

  private readonly destroy$ = new Subject<void>();

  get isEdit(): boolean { return !!this.song?.id; }
  get isEvent(): boolean { return this.song?.type === 'event'; }

  ngOnInit(): void {
    // Editing or event → go directly to field mode
    if (this.isEdit || this.isEvent) {
      this.formMode = 'manual';
    }

    this.form = this.fb.group({
      title:       [this.song?.title       ?? '', Validators.required],
      setlistName: [this.song?.setlistName ?? ''],
      artist:      [this.song?.artist      ?? '', this.isEvent ? [] : [Validators.required]],
      album:       [this.song?.album       ?? ''],
      duration:    [this.song?.duration    ?? null, this.isEvent ? [] : [Validators.required]],
      tempo:       [this.song?.tempo    ?? null],
      style:       [this.song?.style    ?? ''],
      notes:       [this.song?.notes    ?? ''],
      joinWithNext:[this.song?.joinWithNext ?? false],
    });

    // iTunes search subscription (only for songs, not events)
    if (!this.isEvent) {
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
        takeUntil(this.destroy$)
      ).subscribe((results) => {
        this.suggestions = results;
        this.isSearching = false;
      });
    }
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
    // If still in search mode, switch to manual so the user sees the required fields
    if (this.formMode === 'search') {
      this.switchToManual();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result: Partial<Song> = {
      ...value,
      duration: value.duration ? Number(value.duration) : undefined,
      tempo:    value.tempo    ? Number(value.tempo)    : undefined,
    };
    if (this.song?.id)                    result['id']       = this.song.id;
    if (this.song?.position !== undefined) result['position'] = this.song.position;
    if (this.song?.playlistId)             result['playlistId'] = this.song.playlistId;
    if (this.isEvent) {
      result['type']   = 'event';
      result['artist'] = '';
    }
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
