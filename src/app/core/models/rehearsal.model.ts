export interface RehearsalSongEntry {
  id: string;
  songId: string;
  title: string;
  artist: string;
  tempo?: number;
  style?: string;
  notes?: string;
  rating?: number; // 1–5
}

export interface Rehearsal {
  id: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  songs: RehearsalSongEntry[];
}
