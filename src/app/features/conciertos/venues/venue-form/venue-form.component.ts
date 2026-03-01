import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Venue } from '../../../../core/models/gig.model';

export interface VenueFormData { venue: Venue | null; }
export type VenueFormResult = Omit<Venue, 'id' | 'createdAt'>;

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-2xl">
      <h3 class="font-bold text-lg mb-4">{{ data.venue ? 'Editar sala' : 'Nueva sala / contacto' }}</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control col-span-2">
            <label class="label"><span class="label-text">Nombre *</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="name" placeholder="Ej: Sala Razzmatazz" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <span class="text-error text-xs mt-1">El nombre es obligatorio</span>
            }
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Ciudad</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="city" placeholder="Ej: Barcelona" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Aforo</span></label>
            <input type="number" class="input input-bordered input-sm" formControlName="capacity" placeholder="500" />
          </div>
          <div class="form-control col-span-2">
            <label class="label"><span class="label-text">Dirección</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="address" placeholder="Calle, número..." />
          </div>
          <div class="form-control col-span-2">
            <label class="label"><span class="label-text">Web</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="website" placeholder="https://..." />
          </div>
        </div>

        <div class="divider text-xs opacity-50">Contacto de booking</div>

        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="form-control col-span-3 sm:col-span-1">
            <label class="label"><span class="label-text">Nombre</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="bookingName" placeholder="Nombre del promotor" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Email</span></label>
            <input type="email" class="input input-bordered input-sm" formControlName="bookingEmail" placeholder="booking@sala.com" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Teléfono</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="bookingPhone" placeholder="+34 600 000 000" />
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Notas</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" formControlName="notes" rows="2" placeholder="Notas opcionales"></textarea>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `,
})
export class VenueFormComponent {
  readonly dialogRef = inject(DialogRef<VenueFormResult>);
  readonly data = inject<VenueFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: [''],
    city: [''],
    address: [''],
    website: [''],
    capacity: [null as number | null],
    bookingName: [''],
    bookingEmail: [''],
    bookingPhone: [''],
    notes: [''],
  });

  ngOnInit(): void {
    if (this.data.venue) {
      const v = this.data.venue;
      this.form.patchValue({
        name: v.name, city: v.city ?? '', address: v.address ?? '',
        website: v.website ?? '', capacity: v.capacity ?? null,
        bookingName: v.bookingName ?? '', bookingEmail: v.bookingEmail ?? '',
        bookingPhone: v.bookingPhone ?? '', notes: v.notes ?? '',
      });
    }
  }

  submit(): void {
    if (!this.form.value.name?.trim()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name!.trim(),
      city: v.city || undefined,
      address: v.address || undefined,
      website: v.website || undefined,
      capacity: v.capacity ?? undefined,
      bookingName: v.bookingName || undefined,
      bookingEmail: v.bookingEmail || undefined,
      bookingPhone: v.bookingPhone || undefined,
      notes: v.notes || undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
