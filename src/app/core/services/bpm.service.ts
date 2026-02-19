import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BpmService {
  /**
   * Looks up BPM via Deezer's public API, routed through the Electron main
   * process (Node.js https — no CORS restrictions).
   * Returns null if the song is not found or BPM is unavailable.
   */
  getBpm(title: string, artist: string): Observable<number | null> {
    if (!title?.trim()) return of(null);
    return from(
      (window as any).electronAPI.invoke('bpm:lookup', {
        title: title.trim(),
        artist: artist.trim(),
      }) as Promise<number | null>,
    );
  }
}
