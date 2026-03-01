import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Gig, GigStatus, GIG_STATUSES, GIG_STATUS_LABELS, Venue } from '../../../../core/models/gig.model';
import { PlaylistWithStats } from '../../../../core/models/song.model';

export interface GigFormData {
  gig: Gig | null;
  venues: Venue[];
  playlists: PlaylistWithStats[];
}
export type GigFormResult = Omit<Gig, 'id' | 'createdAt' | 'venueName'>;

@Component({
  selector: 'app-gig-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-2xl">
      <h3 class="font-bold text-lg mb-4">{{ data.gig ? 'Editar concierto' : 'Nuevo concierto' }}</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Title -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Título *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="title"
                 placeholder="Ej: Sala Razzmatazz — Noche del Metal" />
          @if (form.get('title')?.invalid && form.get('title')?.touched) {
            <span class="text-error text-xs mt-1">El título es obligatorio</span>
          }
        </div>

        <!-- Date + Time -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Fecha</span></label>
            <input type="date" class="input input-bordered input-sm" formControlName="date" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Hora actuación</span></label>
            <input type="time" class="input input-bordered input-sm" formControlName="time" />
          </div>
        </div>

        <!-- Venue + Status -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Sala / Venue</span></label>
            <select class="select select-bordered select-sm" formControlName="venueId">
              <option value="">Sin sala</option>
              @for (v of data.venues; track v.id) {
                <option [value]="v.id">{{ v.name }}{{ v.city ? ' · ' + v.city : '' }}</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Estado</span></label>
            <select class="select select-bordered select-sm" formControlName="status">
              @for (s of statuses; track s) {
                <option [value]="s">{{ statusLabels[s] }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Pay + Setlist -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Caché / Pago</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="pay"
                   placeholder="Ej: 500€, taquilla, trato..." />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Setlist vinculada</span></label>
            <select class="select select-bordered select-sm" formControlName="setlistId">
              <option value="">Sin setlist</option>
              @for (p of data.playlists; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Timing -->
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Hora carga</span></label>
            <input type="time" class="input input-bordered input-sm" formControlName="loadInTime" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Soundcheck</span></label>
            <input type="time" class="input input-bordered input-sm" formControlName="soundcheckTime" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Hora set</span></label>
            <input type="time" class="input input-bordered input-sm" formControlName="setTime" />
          </div>
        </div>

        <!-- Notes -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Notas</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" formControlName="notes"
                    rows="2" placeholder="Rider, condiciones, contacto..."></textarea>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `,
})
export class GigFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<GigFormResult>);
  readonly data = inject<GigFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  readonly statuses = GIG_STATUSES;
  readonly statusLabels = GIG_STATUS_LABELS;

  form = this.fb.group({
    title: [''],
    date: [''],
    time: [''],
    venueId: [''],
    status: ['lead' as GigStatus],
    pay: [''],
    setlistId: [''],
    loadInTime: [''],
    soundcheckTime: [''],
    setTime: [''],
    notes: [''],
  });

  ngOnInit(): void {
    if (this.data.gig) {
      const g = this.data.gig;
      this.form.patchValue({
        title: g.title, date: g.date ?? '', time: g.time ?? '',
        venueId: g.venueId ?? '', status: g.status,
        pay: g.pay ?? '', setlistId: g.setlistId ?? '',
        loadInTime: g.loadInTime ?? '', soundcheckTime: g.soundcheckTime ?? '',
        setTime: g.setTime ?? '', notes: g.notes ?? '',
      });
    }
  }

  submit(): void {
    if (!this.form.value.title?.trim()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      title: v.title!.trim(),
      date: v.date || undefined,
      time: v.time || undefined,
      venueId: v.venueId || undefined,
      status: v.status as GigStatus,
      pay: v.pay || undefined,
      setlistId: v.setlistId || undefined,
      loadInTime: v.loadInTime || undefined,
      soundcheckTime: v.soundcheckTime || undefined,
      setTime: v.setTime || undefined,
      notes: v.notes || undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
