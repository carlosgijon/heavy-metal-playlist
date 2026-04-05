export type ScnFileType = 'general' | 'sala' | 'concierto' | 'ensayo';

export interface ScnFile {
  id: string;
  bandId: string;
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venueId?: string;
  type: ScnFileType;
  createdAt: string;
  updatedAt: string;
}

export interface SaveScnFileDto {
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venueId?: string;
  type: ScnFileType;
}

export interface UpdateScnFileDto {
  name?: string;
  notes?: string;
  gigId?: string | null;
  venueId?: string | null;
  type?: ScnFileType;
}
