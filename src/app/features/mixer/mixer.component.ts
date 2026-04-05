import {
  Component, OnInit, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ScnFile, SaveScnFileDto } from '../../core/models/mixer.model';
import { Gig, Venue } from '../../core/models/gig.model';
import { parseScn, ChannelData } from './scn-parser';

export interface VenueGroup {
  venueId: string | null;
  venueName: string;
  city?: string;
  files: ScnFile[];
  expanded: boolean;
}

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mixer.component.html',
  styleUrls: ['./mixer.component.scss'],
})
export class MixerComponent implements OnInit {
  private readonly db     = inject(DatabaseService);
  private readonly toast  = inject(ToastService);
  private readonly dialog = inject(Dialog);

  readonly loading      = signal(true);
  readonly scnFiles     = signal<ScnFile[]>([]);
  readonly gigs         = signal<Gig[]>([]);
  readonly venues       = signal<Venue[]>([]);

  // Detail panel
  readonly selectedFile    = signal<ScnFile | null>(null);
  readonly selectedChannels = signal<ChannelData[]>([]);
  readonly channelSearch   = signal('');

  // Upload modal
  readonly showUploadModal = signal(false);
  readonly uploadName      = signal('');
  readonly uploadNotes     = signal('');
  readonly uploadGigId     = signal('');
  readonly uploadVenueId   = signal('');
  readonly uploadContent   = signal('');
  readonly uploadFileName  = signal('');
  readonly uploadSaving    = signal(false);

  // Edit modal
  readonly showEditModal  = signal(false);
  readonly editFile       = signal<ScnFile | null>(null);
  readonly editName       = signal('');
  readonly editNotes      = signal('');
  readonly editGigId      = signal('');
  readonly editVenueId    = signal('');
  readonly editSaving     = signal(false);

  readonly venueGroups = computed<VenueGroup[]>(() => {
    const files   = this.scnFiles();
    const venues  = this.venues();
    const gigs    = this.gigs();
    const groups  = new Map<string, VenueGroup>();

    for (const file of files) {
      const key = file.venueId ?? '__none__';
      if (!groups.has(key)) {
        const venue = file.venueId ? venues.find(v => v.id === file.venueId) : null;
        const gigVenue = !file.venueId && file.gigId
          ? gigs.find(g => g.id === file.gigId)
          : null;
        groups.set(key, {
          venueId:   file.venueId ?? null,
          venueName: venue?.name ?? gigVenue?.venueName ?? 'Sin sala asignada',
          city:      venue?.city,
          files:     [],
          expanded:  true,
        });
      }
      groups.get(key)!.files.push(file);
    }

    // Sort: venues with name first, 'Sin sala' last
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.venueId && b.venueId) return 1;
      if (a.venueId && !b.venueId) return -1;
      return a.venueName.localeCompare(b.venueName);
    });
  });

  readonly filteredChannels = computed(() => {
    const q = this.channelSearch().toLowerCase().trim();
    if (!q) return this.selectedChannels();
    return this.selectedChannels().filter(ch => ch.name.toLowerCase().includes(q));
  });

  async ngOnInit(): Promise<void> {
    try {
      const [files, gigs, venues] = await Promise.allSettled([
        this.db.getScnFiles(), this.db.getGigs(), this.db.getVenues(),
      ]);
      if (files.status   === 'fulfilled') this.scnFiles.set(files.value);
      if (gigs.status    === 'fulfilled') this.gigs.set(gigs.value);
      if (venues.status  === 'fulfilled') this.venues.set(venues.value);
    } finally {
      this.loading.set(false);
    }
  }

  toggleGroup(group: VenueGroup): void {
    group.expanded = !group.expanded;
    this.scnFiles.update(v => [...v]); // trigger recompute
  }

  // ── Detail panel ─────────────────────────────────────────────────────────────

  openFile(file: ScnFile): void {
    this.selectedFile.set(file);
    this.channelSearch.set('');
    const parsed = parseScn(file.content, file.name);
    this.selectedChannels.set([...parsed.inputChannels, ...parsed.buses]);
  }

  closeFile(): void {
    this.selectedFile.set(null);
    this.selectedChannels.set([]);
  }

  downloadFile(file: ScnFile, event?: Event): void {
    event?.stopPropagation();
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = file.name + '.scn';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    input.value = '';
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      this.uploadContent.set(text);
      this.uploadFileName.set(file.name.replace(/\.scn$/i, ''));
      this.uploadName.set(file.name.replace(/\.scn$/i, ''));
      this.uploadNotes.set('');
      this.uploadGigId.set('');
      this.uploadVenueId.set('');
      this.showUploadModal.set(true);
    };
    reader.readAsText(file);
  }

  onUploadGigChange(gigId: string): void {
    this.uploadGigId.set(gigId);
    if (gigId) {
      const gig = this.gigs().find(g => g.id === gigId);
      if (gig?.venueId) this.uploadVenueId.set(gig.venueId);
    }
  }

  closeUploadModal(): void { this.showUploadModal.set(false); }

  async confirmUpload(): Promise<void> {
    if (!this.uploadName().trim()) return;
    this.uploadSaving.set(true);
    try {
      const dto: SaveScnFileDto = {
        name:    this.uploadName().trim(),
        content: this.uploadContent(),
        notes:   this.uploadNotes() || undefined,
        gigId:   this.uploadGigId() || undefined,
        venueId: this.uploadVenueId() || undefined,
      };
      const saved = await this.db.saveScnFile(dto);
      this.scnFiles.update(list => [saved, ...list]);
      this.showUploadModal.set(false);
      this.toast.success('Archivo guardado en la biblioteca');
    } catch (e: any) {
      this.toast.danger(e?.toString() ?? 'Error al guardar');
    } finally {
      this.uploadSaving.set(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  openEdit(file: ScnFile, event: Event): void {
    event.stopPropagation();
    this.editFile.set(file);
    this.editName.set(file.name);
    this.editNotes.set(file.notes ?? '');
    this.editGigId.set(file.gigId ?? '');
    this.editVenueId.set(file.venueId ?? '');
    this.showEditModal.set(true);
  }

  closeEditModal(): void { this.showEditModal.set(false); }

  onEditGigChange(gigId: string): void {
    this.editGigId.set(gigId);
    if (gigId) {
      const gig = this.gigs().find(g => g.id === gigId);
      if (gig?.venueId) this.editVenueId.set(gig.venueId);
    }
  }

  async confirmEdit(): Promise<void> {
    const file = this.editFile();
    if (!file || !this.editName().trim()) return;
    this.editSaving.set(true);
    try {
      const updated = await this.db.updateScnFile({
        id:      file.id,
        name:    this.editName().trim(),
        notes:   this.editNotes() || undefined,
        gigId:   this.editGigId() || null,
        venueId: this.editVenueId() || null,
      });
      this.scnFiles.update(list => list.map(f => f.id === updated.id ? updated : f));
      if (this.selectedFile()?.id === updated.id) this.selectedFile.set(updated);
      this.showEditModal.set(false);
      this.toast.success('Archivo actualizado');
    } catch (e: any) {
      this.toast.danger(e?.toString() ?? 'Error al actualizar');
    } finally {
      this.editSaving.set(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  deleteFile(file: ScnFile, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { title: 'Eliminar archivo', message: `¿Eliminar "${file.name}"?`, confirmLabel: 'Eliminar', danger: true } as ConfirmDialogData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        await this.db.deleteScnFile(file.id);
        this.scnFiles.update(list => list.filter(f => f.id !== file.id));
        if (this.selectedFile()?.id === file.id) this.closeFile();
        this.toast.success('Archivo eliminado');
      } catch (e: any) {
        this.toast.danger(e?.toString() ?? 'Error al eliminar');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  gigLabel(gigId: string): string {
    const gig = this.gigs().find(g => g.id === gigId);
    return gig ? `${gig.title}${gig.date ? ' · ' + this.fmtDate(gig.date) : ''}` : gigId;
  }

  fmtDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  eqChip(ch: ChannelData): { label: string; cls: string } {
    if (!ch.eqEnabled) return { label: 'EQ OFF', cls: 'chip-off' };
    if (ch.eqMode === 'GEQ') return { label: 'GEQ', cls: 'chip-geq' };
    const gains = ch.eqBands.map(b => b.gain).filter(g => g !== 0);
    if (!gains.length) return { label: 'flat', cls: 'chip-flat' };
    const maxG = Math.max(...gains.map(Math.abs));
    const best = gains.find(g => Math.abs(g) === maxG)!;
    const sign = best > 0 ? '+' : '';
    return maxG >= 5
      ? { label: `${sign}${best.toFixed(1)} dB`, cls: best > 0 ? 'chip-boost' : 'chip-cut' }
      : { label: `${sign}${best.toFixed(1)} dB`, cls: 'chip-mild' };
  }

  faderLabel(db: number): string {
    return isFinite(db) ? `${db > 0 ? '+' : ''}${db.toFixed(1)} dB` : '-∞';
  }

  panLabel(pan: number): string {
    if (pan === 0) return 'C';
    return pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`;
  }

  fmtFreq(f: number): string {
    if (f >= 1000) return `${+(f / 1000).toPrecision(2)}k`;
    return `${Math.round(f)}`;
  }

  venueNameForFile(file: ScnFile): string {
    if (!file.venueId) return '';
    return this.venueGroups().find(g => g.venueId === file.venueId)?.venueName ?? file.venueId;
  }

  isFinite(n: number): boolean { return Number.isFinite(n); }

  trackById(_: number, item: { id: string }): string { return item.id; }
  trackByKey(_: number, item: ChannelData): string { return item.key; }
}
