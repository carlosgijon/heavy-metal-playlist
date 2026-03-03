import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BpmService {
  private readonly http = inject(HttpClient);

  getBpm(title: string, artist: string): Observable<number | null> {
    if (!title?.trim()) return of(null);
    return this.http
      .get<{ bpm: number | null }>(`${environment.apiUrl}/bpm-lookup`, {
        params: { title: title.trim(), artist: artist.trim() },
      })
      .pipe(map((r) => r.bpm));
  }
}
