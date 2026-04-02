import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash } from '@ng-icons/heroicons/outline';
import { PollType, POLL_TYPE_LABELS, CreatePollDto } from '../../../core/models/poll.model';
import { BandMember } from '../../../core/models/equipment.model';
import { Gig } from '../../../core/models/gig.model';

export interface PollFormData {
  members: BandMember[];
  gigs:    Gig[];
}

@Component({
  selector: 'app-poll-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ heroPlus, heroTrash })],
  template: `
    <div class="modal-box w-11/12 max-w-lg">
      <h3 class="font-bold text-lg mb-4">Nueva votación</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Title -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Título *</span></label>
          <input type="text" class="input input-bordered input-sm" formControlName="title"
                 placeholder="Ej: ¿Tocamos en la Sala Razzmatazz?" />
        </div>

        <!-- Description -->
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Descripción</span></label>
          <textarea class="textarea textarea-bordered textarea-sm" formControlName="description"
                    rows="2" placeholder="Contexto o detalles adicionales..."></textarea>
        </div>

        <!-- Type + CreatedBy -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Tipo *</span></label>
            <select class="select select-bordered select-sm" formControlName="type">
              <option value="yes_no">{{ typeLabels['yes_no'] }}</option>
              <option value="approval">{{ typeLabels['approval'] }}</option>
              <option value="proposal">{{ typeLabels['proposal'] }}</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Creada por *</span></label>
            <select class="select select-bordered select-sm" formControlName="createdBy">
              @for (m of data.members; track m.id) {
                <option [value]="m.name">{{ m.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Type hint -->
        <div class="alert alert-info alert-sm py-2 px-3 mb-3 text-xs">
          @if (form.get('type')?.value === 'yes_no') {
            <span>Los miembros votan <strong>Sí</strong>, <strong>No</strong> o <strong>Me abstengo</strong>.</span>
          } @else if (form.get('type')?.value === 'approval') {
            <span>Defines las opciones y cada miembro aprueba las que prefiere.</span>
          } @else {
            <span>Cada miembro propone una opción. Luego todos votan por las propuestas.</span>
          }
        </div>

        <!-- Seed options (approval type) -->
        @if (form.get('type')?.value === 'approval') {
          <div class="form-control mb-3">
            <label class="label">
              <span class="label-text">Opciones</span>
              <button type="button" class="btn btn-xs btn-ghost gap-1" (click)="addOption()">
                <ng-icon name="heroPlus" size="12" /> Añadir
              </button>
            </label>
            @for (ctrl of optionsArray.controls; track $index) {
              <div class="flex gap-2 mb-1">
                <input type="text" class="input input-bordered input-xs flex-1"
                       [formControl]="ctrl" placeholder="Opción {{ $index + 1 }}" />
                <button type="button" class="btn btn-ghost btn-xs text-error" (click)="removeOption($index)">
                  <ng-icon name="heroTrash" size="12" />
                </button>
              </div>
            }
          </div>
        }

        <!-- Linked gig + deadline -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Concierto (opcional)</span></label>
            <select class="select select-bordered select-sm" formControlName="linkedGigId">
              <option value="">Sin vincular</option>
              @for (g of data.gigs; track g.id) {
                <option [value]="g.id">{{ g.title }}</option>
              }
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Fecha límite</span></label>
            <input type="date" class="input input-bordered input-sm" formControlName="deadline" />
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-sm btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Crear votación</button>
        </div>
      </form>
    </div>
  `,
})
export class PollFormComponent implements OnInit {
  readonly dialogRef = inject(DialogRef<CreatePollDto>);
  readonly data      = inject<PollFormData>(DIALOG_DATA);
  private fb         = inject(FormBuilder);

  readonly typeLabels = POLL_TYPE_LABELS;

  form = this.fb.group({
    title:       [''],
    description: [''],
    type:        ['yes_no' as PollType],
    createdBy:   [''],
    deadline:    [''],
    linkedGigId: [''],
  });

  get optionsArray(): FormArray<FormControl<string | null>> {
    return this._optionsArray;
  }
  private _optionsArray = this.fb.array<FormControl<string | null>>([]);

  ngOnInit(): void {
    if (this.data.members.length) {
      this.form.patchValue({ createdBy: this.data.members[0].name });
    }
  }

  addOption(): void {
    this._optionsArray.push(this.fb.control('') as FormControl<string>);
  }

  removeOption(i: number): void {
    this._optionsArray.removeAt(i);
  }

  submit(): void {
    const v = this.form.getRawValue();
    if (!v.title?.trim() || !v.createdBy) { this.form.markAllAsTouched(); return; }
    const options = this._optionsArray.value.map((s: string | null) => s?.trim()).filter(Boolean) as string[];
    this.dialogRef.close({
      title:       v.title.trim(),
      description: v.description?.trim() || undefined,
      type:        v.type as PollType,
      createdBy:   v.createdBy!,
      deadline:    v.deadline || undefined,
      linkedGigId: v.linkedGigId || undefined,
      options:     options.length ? options : undefined,
    });
  }

  cancel(): void { this.dialogRef.close(); }
}
