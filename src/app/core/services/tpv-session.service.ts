import { Injectable, signal } from '@angular/core';
import { Gig } from '../models/gig.model';

const SESSION_KEY = 'tpv_gig';

@Injectable({ providedIn: 'root' })
export class TpvSessionService {
  private _gig = signal<Gig | null>(
    (() => {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Gig | null; }
      catch { return null; }
    })()
  );

  readonly gig = this._gig.asReadonly();

  setGig(gig: Gig | null): void {
    this._gig.set(gig);
    if (gig) sessionStorage.setItem(SESSION_KEY, JSON.stringify(gig));
    else sessionStorage.removeItem(SESSION_KEY);
  }
}
