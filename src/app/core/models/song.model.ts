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

/** Song in the global library (not tied to any playlist) */
export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number; // seconds
  tempo?: number;    // BPM
  style?: string;
  notes?: string;
}

/** Entry linking a playlist to a library song (or an inline event) */
export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId?: string;       // LibrarySong.id — undefined for events
  position: number;
  type?: 'song' | 'event';
  title?: string;        // Inline title for events
  setlistName?: string;
  joinWithNext?: boolean;
}

/** Merged view used by the UI — combines PlaylistSong + LibrarySong */
export interface PlaylistSongView {
  id: string;            // PlaylistSong.id
  playlistId: string;
  songId?: string;       // LibrarySong.id
  position: number;
  type?: 'song' | 'event';
  title: string;
  setlistName?: string;
  joinWithNext?: boolean;
  artist: string;
  album?: string;
  duration?: number;
  tempo?: number;
  style?: string;
  notes?: string;
}

// Backwards-compatible alias — all existing components use Song
export type Song = PlaylistSongView;

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackTimeMillis: number;
  primaryGenreName: string;
  artworkUrl60?: string;
  previewUrl?: string;
}

export interface ItunesResponse {
  resultCount: number;
  results: ItunesTrack[];
}
