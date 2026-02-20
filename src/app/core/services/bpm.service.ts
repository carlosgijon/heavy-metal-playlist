import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class BpmService {
  /**
   * Looks up BPM via Deezer's public API, routed through the Tauri Rust backend
   * (reqwest — no CORS restrictions).
   * Returns null if the song is not found or BPM is unavailable.
   */
  getBpm(title: string, artist: string): Observable<number | null> {
    if (!title?.trim()) return of(null);
    return from(
      invoke<number | null>('bpm_lookup', {
        title: title.trim(),
        artist: artist.trim(),
      }),
    );
  }
}
