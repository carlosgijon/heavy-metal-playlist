import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Gig, Venue } from '../../core/models/gig.model';
import { PlaylistWithStats } from '../../core/models/song.model';
import { GigsComponent } from './gigs/gigs.component';
import { VenuesComponent } from './venues/venues.component';

type ConciertosTab = 'gigs' | 'venues';

@Component({
  selector: 'app-conciertos',
  standalone: true,
  imports: [CommonModule, GigsComponent, VenuesComponent],
  template: `
    <div class="p-4 h-full flex flex-col">
      <!-- Page title -->
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold">Conciertos</h1>
        @if (loading) {
          <span class="loading loading-spinner loading-sm"></span>
        }
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-bordered mb-4">
        <button role="tab" class="tab" [class.tab-active]="tab === 'gigs'" (click)="tab = 'gigs'">
          Conciertos
          @if (confirmedCount > 0) {
            <span class="badge badge-success badge-xs ml-1">{{ confirmedCount }}</span>
          }
        </button>
        <button role="tab" class="tab" [class.tab-active]="tab === 'venues'" (click)="tab = 'venues'">
          Salas / Contactos
        </button>
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-auto">
        @switch (tab) {
          @case ('gigs') {
            <app-gigs
              [gigs]="gigs"
              [venues]="venues"
              [playlists]="playlists"
              (changed)="reload()" />
          }
          @case ('venues') {
            <app-venues
              [venues]="venues"
              (changed)="reload()" />
          }
        }
      </div>
    </div>
  `,
})
export class ConciertosComponent implements OnInit {
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  tab: ConciertosTab = 'gigs';
  loading = false;

  gigs: Gig[] = [];
  venues: Venue[] = [];
  playlists: PlaylistWithStats[] = [];

  get confirmedCount(): number {
    return this.gigs.filter(g => g.status === 'confirmed').length;
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    try {
      [this.gigs, this.venues, this.playlists] =
        await Promise.all([
          this.db.getGigs(),
          this.db.getVenues(),
          this.db.getPlaylists(),
        ]);
    } catch {
      this.toast.danger('Error al cargar los datos');
    } finally {
      this.loading = false;
    }
  }
}
