import { computed, inject, Injectable, signal } from '@angular/core';
import { BandInfo, User } from '../models/auth.model';
import { DatabaseService } from './database.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(DatabaseService);

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly currentBand = signal<BandInfo | null>(null);
  /** Non-empty while band selector is shown (user logged in but no band chosen yet). */
  readonly pendingBands = signal<BandInfo[]>([]);

  readonly isAuthenticated = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'superadmin' || this.currentBand() !== null;
  });

  readonly isAdmin = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'superadmin';
  });

  readonly isSuperAdmin = computed(() => this.currentUser()?.role === 'superadmin');

  async init(): Promise<void> {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) return;
    try {
      const { user, band } = await this.db.validateToken(storedToken);
      this.currentUser.set(user);
      this.token.set(storedToken);
      if (band) this.currentBand.set(band);
    } catch {
      localStorage.removeItem('auth_token');
    }
  }

  /** Returns pending bands list if user belongs to multiple bands, else []. */
  async login(username: string, password: string): Promise<BandInfo[]> {
    const response = await this.db.login(username, password);

    this.token.set(response.token);
    localStorage.setItem('auth_token', response.token);
    this.currentUser.set(response.user);

    if (response.bands.length === 0) {
      return []; // superadmin
    }
    if (response.bands.length === 1) {
      this.currentBand.set(response.bands[0]);
      return [];
    }
    this.pendingBands.set(response.bands);
    return response.bands;
  }

  async selectBand(bandId: string): Promise<void> {
    const response = await this.db.selectBand(bandId);
    this.token.set(response.token);
    localStorage.setItem('auth_token', response.token);
    this.currentUser.set(response.user);
    this.currentBand.set(response.band);
    this.pendingBands.set([]);
  }

  async logout(): Promise<void> {
    this.currentUser.set(null);
    this.token.set(null);
    this.currentBand.set(null);
    this.pendingBands.set([]);
    localStorage.removeItem('auth_token');
  }
}
