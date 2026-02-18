import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  NbCardModule,
  NbButtonModule,
  NbInputModule,
  NbFormFieldModule,
  NbDialogRef,
} from '@nebular/theme';
import { Playlist } from '../../../core/models/song.model';

@Component({
  selector: 'app-playlist-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbFormFieldModule,
  ],
  templateUrl: './playlist-form.component.html',
  styleUrls: ['./playlist-form.component.scss'],
})
export class PlaylistFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(NbDialogRef<PlaylistFormComponent>);

  playlist: Playlist | null = null;

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    if (this.playlist) {
      this.form.patchValue({
        name: this.playlist.name,
        description: this.playlist.description ?? '',
      });
    }
  }

  get isEdit(): boolean {
    return this.playlist !== null;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.value;
    if (this.isEdit) {
      this.dialogRef.close({ ...this.playlist, name: name.trim(), description: description?.trim() || undefined });
    } else {
      this.dialogRef.close({ name: name.trim(), description: description?.trim() || undefined });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
