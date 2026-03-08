import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Gig, Venue } from '../../core/models/gig.model';
import { PlaylistWithStats } from '../../core/models/song.model';
import { GigsComponent } from './gigs/gigs.component';
import { VenuesComponent } from './venues/venues.component';
import { GigDetailComponent } from './gigs/gig-detail/gig-detail.component';

type ConciertosTab = 'gigs' | 'venues';

@Component({
  selector: 'app-conciertos',
  standalone: true,
  imports: [CommonModule, GigsComponent, VenuesComponent, GigDetailComponent],
  template: `
    <!-- Gig detail view -->
    @if (selectedGig) {
      <app-gig-detail
        [gig]="selectedGig"
        [venues]="venues"
        [playlists]="playlists"
        (back)="selectedGig = null"
        (changed)="onGigDetailChanged()" />
    } @else {
      <div class="page-container h-full flex flex-col">
        <!-- Page title -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Conciertos</h1>
            <p class="page-subtitle">Gestión de bolos, salas y contactos</p>
          </div>
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
                (changed)="reload()"
                (selectGig)="openDetail($event)" />
            }
            @case ('venues') {
              <app-venues
                [venues]="venues"
                (changed)="reload()" />
            }
          }
        </div>
      </div>
    }
  `,
})
export class ConciertosComponent implements OnInit {
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  tab: ConciertosTab = 'gigs';
  loading = false;
  selectedGig: Gig | null = null;

  gigs: Gig[] = [];
  venues: Venue[] = [];
  playlists: PlaylistWithStats[] = [];

  get confirmedCount(): number {
    return this.gigs.filter(g => g.status === 'confirmed').length;
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  openDetail(gig: Gig): void {
    this.selectedGig = gig;
  }

  async onGigDetailChanged(): Promise<void> {
    await this.reload();
    // Refresh selectedGig with updated data
    if (this.selectedGig) {
      this.selectedGig = this.gigs.find(g => g.id === this.selectedGig!.id) ?? null;
    }
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
