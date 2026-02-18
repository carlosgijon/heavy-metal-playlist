export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface PlaylistWithStats extends Playlist {
  songCount: number;
  totalDuration: number; // seconds
}

export interface Song {
  id: string;
  playlistId: string;
  position: number;
  type?: 'song' | 'event';  // default 'song'; 'event' = intro/outro/bis/etc.
  title: string;
  setlistName?: string;     // nombre para mostrar en el setlist impreso
  artist: string;
  album?: string;
  duration?: number; // seconds
  tempo?: number;    // BPM (manual)
  style?: string;    // genre
  notes?: string;
  joinWithNext?: boolean; // unir con la siguiente canción en la impresión
}

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackTimeMillis: number;
  primaryGenreName: string;
  artworkUrl60?: string;
}

export interface ItunesResponse {
  resultCount: number;
  results: ItunesTrack[];
}
