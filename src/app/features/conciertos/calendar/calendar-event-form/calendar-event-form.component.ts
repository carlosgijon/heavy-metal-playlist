import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  CalendarEvent, CalendarEventType, EVENT_TYPE_LABELS,
} from '../../../../core/models/gig.model';
import { BandMember } from '../../../../core/models/equipment.model';

export interface CalendarEventFormData {
  event: CalendarEvent | null;
  members: BandMember[];
  defaultDate?: string;
}
export type CalendarEventFormResult = Omit<CalendarEvent, 'id' | 'createdAt' | 'memberName'>;

@Component({
  selector: 'app-calendar-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-box w-11/12 max-w-lg">
      <h3 class="font-bold text-lg mb-4">{{ data.event ? 'Editar evento' : 'Nuevo evento' }}</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Type + Title -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              <option value="rehearsal">{{ typeLabels['rehearsal'] }}</option>
              <option value="unavailable">{{ typeLabels['unavailable'] }}</option>
              <option value="other">{{ typeLabels['other'] }}</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Título *</span></label>
            <input type="text" class="input input-bordered input-sm" formControlName="title"
                   [placeholder]="titlePlaceholder" />
          </div>
        </div>

        <!-- Member (only for unavailable) -->
        @if (form.get('type')?.value === 'unavailable') {
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Integrante</span></label>
            <select class="select select-bordered select-sm" formControlName="memberId">
              <option value="">Todo el grupo</option>
              @for (m of data.members; track m.id) {
                <option [value]="m.id">{{ m.name }}</option>
              }
            </select>
          </div>
        }

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Fecha inicio *</span></label>
            <input type="date" class="input input-bordered input-sm" formControlName="date" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Fecha fin (opcional)</span></label>
            <input type="date" class="input input-bordered input-sm" formControlName="endDate" />
          </div>
        </div>

        <!-- Notes -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Notas</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" formControlName="notes"
                    rows="2"></textarea>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  `,
})
export class CalendarEventFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<CalendarEventFormResult>);
  readonly data = inject<CalendarEventFormData>(DIALOG_DATA);
  private fb = inject(FormBuilder);

  readonly typeLabels = EVENT_TYPE_LABELS;

  form = this.fb.group({
    type: ['rehearsal' as CalendarEventType],
    title: [''],
    date: [''],
    endDate: [''],
    memberId: [''],
    notes: [''],
  });

  get titlePlaceholder(): string {
    const t = this.form.get('type')?.value;
    if (t === 'rehearsal') return 'Ej: Ensayo general';
    if (t === 'unavailable') return 'Ej: Vacaciones verano';
    return 'Ej: Reunión, grabación...';
  }

  ngOnInit(): void {
    if (this.data.event) {
      const e = this.data.event;
      this.form.patchValue({
        type: e.type, title: e.title, date: e.date,
        endDate: e.endDate ?? '', memberId: e.memberId ?? '', notes: e.notes ?? '',
      });
    } else if (this.data.defaultDate) {
      this.form.patchValue({ date: this.data.defaultDate });
    }
  }

  submit(): void {
    const v = this.form.getRawValue();
    if (!v.title?.trim() || !v.date) { this.form.markAllAsTouched(); return; }
    this.dialogRef.close({
      type: v.type as CalendarEventType,
      title: v.title.trim(),
      date: v.date,
      endDate: v.endDate || undefined,
      memberId: v.type === 'unavailable' ? (v.memberId || undefined) : undefined,
      allDay: true,
      notes: v.notes || undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
