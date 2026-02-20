import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { Song, ItunesTrack, LibrarySong } from '../../../core/models/song.model';
import { MusicApiService } from '../../../core/services/music-api.service';
import { BpmService } from '../../../core/services/bpm.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { DatabaseService } from '../../../core/services/database.service';

@Component({
  selector: 'app-song-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconComponent,
  ],
  templateUrl: './song-form.component.html',
  styleUrls: ['./song-form.component.scss'],
})
export class SongFormComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(DialogRef<Partial<Song>>);
  readonly data = inject<{ song: Partial<Song> | null }>(DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly musicApi = inject(MusicApiService);
  private readonly bpmService = inject(BpmService);
  private readonly db = inject(DatabaseService);
  readonly connectivity = inject(ConnectivityService);

  form!: FormGroup;
  song: Partial<Song> | null = null; // initialized from data in ngOnInit

  searchControl = new FormControl('');
  suggestions: ItunesTrack[] = [];
  isSearching = false;
  isFetchingBpm = false;

  librarySearchControl = new FormControl('');
  librarySongs: LibrarySong[] = [];
  filteredLibrarySongs: LibrarySong[] = [];
  selectedLibrarySong: LibrarySong | null = null;

  formMode: 'library' | 'search' | 'manual' = 'library';

  private readonly destroy$ = new Subject<void>();
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
  get isEvent(): boolean { return this.song?.type === 'event'; }
  get hasTaps(): boolean { return this.tapCount > 1; }
  get isFromLibrary(): boolean { return !!this.selectedLibrarySong; }

  async ngOnInit(): Promise<void> {
    this.song = this.data.song;

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
        takeUntil(this.destroy$),
      ).subscribe((results) => {
        this.suggestions = results;
        this.isSearching = false;
      });

      this.loadLibrarySongs();

      this.librarySearchControl.valueChanges.pipe(
        takeUntil(this.destroy$),
      ).subscribe((q) => this.filterLibrary(q ?? ''));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadLibrarySongs(): Promise<void> {
    try {
      this.librarySongs = await this.db.getLibrarySongs();
      this.filteredLibrarySongs = [...this.librarySongs];
    } catch {
      // Non-critical
    }
  }

  private filterLibrary(q: string): void {
    if (!q.trim()) {
      this.filteredLibrarySongs = [...this.librarySongs];
      return;
    }
    const lower = q.toLowerCase();
    this.filteredLibrarySongs = this.librarySongs.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower),
    );
  }

  selectFromLibrary(libSong: LibrarySong): void {
    this.selectedLibrarySong = libSong;
    this.form.patchValue({
      title:       libSong.title,
      artist:      libSong.artist,
      album:       libSong.album ?? '',
      duration:    libSong.duration ?? null,
      tempo:       libSong.tempo ?? null,
      style:       libSong.style ?? '',
      notes:       libSong.notes ?? '',
      setlistName: '',
      joinWithNext: false,
    });
    this.formMode = 'manual';
  }

  switchToSearch(): void {
    this.selectedLibrarySong = null;
    this.suggestions = [];
    this.formMode = 'search';
  }

  switchToManual(): void {
    this.suggestions = [];
    this.formMode = 'manual';
  }

  switchToLibrary(): void {
    this.selectedLibrarySong = null;
    this.formMode = 'library';
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

    this.isFetchingBpm = true;
    this.bpmService
      .getBpm(track.trackName, track.artistName)
      .subscribe((bpm) => {
        this.isFetchingBpm = false;
        if (bpm !== null) this.form.patchValue({ tempo: bpm });
      });
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
    const result: Partial<Song> = {
      ...value,
      duration: value.duration ? Number(value.duration) : undefined,
      tempo:    value.tempo    ? Number(value.tempo)    : undefined,
    };

    if (this.song?.id)                     result['id']         = this.song.id;
    if (this.song?.position !== undefined)  result['position']   = this.song.position;
    if (this.song?.playlistId)              result['playlistId'] = this.song.playlistId;
    if (this.song?.songId)                  result['songId']     = this.song.songId;

    if (this.selectedLibrarySong) {
      result['songId'] = this.selectedLibrarySong.id;
    }

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
