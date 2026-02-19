import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';

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
  type?: 'song' | 'event';
  title: string;
  setlistName?: string;
  artist: string;
  album?: string;
  duration?: number; // seconds
  tempo?: number;    // BPM
  style?: string;
  notes?: string;
  joinWithNext?: boolean;
}

export interface Settings {
  theme: string;
}

interface StoreSchema {
  playlists: Playlist[];
  songs: Song[];
  settings: Settings;
}

const store = new Store<StoreSchema>({
  name: 'heavy-metal-playlist',
  defaults: { playlists: [], songs: [], settings: { theme: 'dark' } },
});

export class Database {
  constructor() {
    this.migrate();
  }

  /** Migra canciones sin playlistId a una playlist por defecto */
  private migrate(): void {
    const songs = store.get('songs', []) as any[];
    const orphans = songs.filter((s) => !s.playlistId);
    if (orphans.length === 0) return;

    const playlists: Playlist[] = store.get('playlists', []);
    let defaultPlaylist = playlists.find((p) => p.name === 'Setlist Principal');
    if (!defaultPlaylist) {
      defaultPlaylist = {
        id: uuidv4(),
        name: 'Setlist Principal',
        createdAt: new Date().toISOString(),
      };
      store.set('playlists', [...playlists, defaultPlaylist]);
    }

    const migrated = songs.map((s) =>
      s.playlistId ? s : { ...s, playlistId: defaultPlaylist!.id }
    );
    store.set('songs', migrated);
  }

  // ── Playlists ──────────────────────────────────────────────────

  getAllPlaylists(): PlaylistWithStats[] {
    const playlists: Playlist[] = store.get('playlists', []);
    const songs: Song[] = store.get('songs', []);
    return playlists.map((p) => {
      const ps = songs.filter((s) => s.playlistId === p.id);
      const songItems = ps.filter((s) => s.type !== 'event');
      return {
        ...p,
        songCount: songItems.length,
        totalDuration: songItems.reduce((acc, s) => acc + (s.duration ?? 0), 0),
      };
    });
  }

  createPlaylist(data: Pick<Playlist, 'name' | 'description'>): Playlist {
    const playlists: Playlist[] = store.get('playlists', []);
    const newPlaylist: Playlist = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    store.set('playlists', [...playlists, newPlaylist]);
    return newPlaylist;
  }

  updatePlaylist(updated: Playlist): Playlist {
    const playlists: Playlist[] = store.get('playlists', []);
    const index = playlists.findIndex((p) => p.id === updated.id);
    if (index === -1) throw new Error(`Playlist ${updated.id} not found`);
    playlists[index] = updated;
    store.set('playlists', playlists);
    return updated;
  }

  deletePlaylist(id: string): void {
    let playlists: Playlist[] = store.get('playlists', []);
    playlists = playlists.filter((p) => p.id !== id);
    store.set('playlists', playlists);
    // Elimina también todas las canciones de esa playlist
    let songs: Song[] = store.get('songs', []);
    songs = songs.filter((s) => s.playlistId !== id);
    store.set('songs', songs);
  }

  // ── Songs ──────────────────────────────────────────────────────

  getSongsByPlaylist(playlistId: string): Song[] {
    const songs: Song[] = store.get('songs', []);
    return songs
      .filter((s) => s.playlistId === playlistId)
      .sort((a, b) => a.position - b.position);
  }

  create(data: Omit<Song, 'id' | 'position'>): Song {
    const songs: Song[] = store.get('songs', []);
    const playlistSongs = songs.filter((s) => s.playlistId === data.playlistId);
    const newSong: Song = {
      ...data,
      id: uuidv4(),
      position: playlistSongs.length,
    };
    store.set('songs', [...songs, newSong]);
    return newSong;
  }

  update(updated: Song): Song {
    const songs: Song[] = store.get('songs', []);
    const index = songs.findIndex((s) => s.id === updated.id);
    if (index === -1) throw new Error(`Song ${updated.id} not found`);
    songs[index] = updated;
    store.set('songs', songs);
    return updated;
  }

  delete(id: string): void {
    let songs: Song[] = store.get('songs', []);
    const songToDelete = songs.find((s) => s.id === id);
    if (!songToDelete) return;
    const { playlistId } = songToDelete;
    songs = songs.filter((s) => s.id !== id);
    // Re-normaliza posiciones solo dentro de la misma playlist
    const playlistSongs = songs
      .filter((s) => s.playlistId === playlistId)
      .sort((a, b) => a.position - b.position)
      .map((s, i) => ({ ...s, position: i }));
    const otherSongs = songs.filter((s) => s.playlistId !== playlistId);
    store.set('songs', [...otherSongs, ...playlistSongs]);
  }

  // ── Settings ───────────────────────────────────────────────────

  getSettings(): Settings {
    return store.get('settings', { theme: 'dark' });
  }

  setSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    store.set('settings', updated);
    return updated;
  }

  reorder(playlistId: string, orderedIds: string[]): Song[] {
    const allSongs: Song[] = store.get('songs', []);
    const otherSongs = allSongs.filter((s) => s.playlistId !== playlistId);
    const reordered = orderedIds.map((id, index) => {
      const song = allSongs.find((s) => s.id === id);
      if (!song) throw new Error(`Song ${id} not found`);
      return { ...song, position: index };
    });
    store.set('songs', [...otherSongs, ...reordered]);
    return reordered.sort((a, b) => a.position - b.position);
  }
}
