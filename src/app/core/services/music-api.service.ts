import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ItunesResponse, ItunesTrack } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class MusicApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://itunes.apple.com/search';

  search(term: string): Observable<ItunesTrack[]> {
    if (!term?.trim()) return of([]);

    const url = `${this.baseUrl}?term=${encodeURIComponent(term)}&media=music&limit=8&entity=song`;
    return this.http.get<ItunesResponse>(url).pipe(
      map((res) => res.results ?? []),
      catchError(() => of([]))
    );
  }

  formatDuration(milliseconds: number): number {
    return Math.round(milliseconds / 1000);
  }
}
