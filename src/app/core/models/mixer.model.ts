export interface ScnFile {
  id: string;
  bandId: string;
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveScnFileDto {
  name: string;
  content: string;
  notes?: string;
  gigId?: string;
  venue?: string;
}

export interface UpdateScnFileDto {
  name?: string;
  notes?: string;
  gigId?: string | null;
  venue?: string | null;
}
