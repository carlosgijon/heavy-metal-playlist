import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Playlist } from '../../../core/models/song.model';

@Component({
  selector: 'app-playlist-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './playlist-form.component.html',
  styleUrls: ['./playlist-form.component.scss'],
})
export class PlaylistFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DialogRef<Playlist | Pick<Playlist, 'name' | 'description'>>);
  readonly data = inject<{ playlist: Playlist | null }>(DIALOG_DATA);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(200)]],
  });

  get isEdit(): boolean {
    return this.data.playlist !== null;
  }

  ngOnInit(): void {
    if (this.data.playlist) {
      this.form.patchValue({
        name: this.data.playlist.name,
        description: this.data.playlist.description ?? '',
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.value;
    if (this.isEdit) {
      this.dialogRef.close({ ...this.data.playlist, name: name.trim(), description: description?.trim() || undefined });
    } else {
      this.dialogRef.close({ name: name.trim(), description: description?.trim() || undefined });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
