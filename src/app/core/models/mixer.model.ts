export interface ScnFile {
  id: string;
  bandId: string;
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venueId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveScnFileDto {
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venueId?: string;
}

export interface UpdateScnFileDto {
  name?: string;
  notes?: string;
  gigId?: string | null;
  venueId?: string | null;
}
