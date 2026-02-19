import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';

// ── Interfaces ────────────────────────────────────────────────────────────────

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
  setlistName?: string;  // Display name override for PDF
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

// Backwards-compatible alias
export type Song = PlaylistSongView;

export interface Settings {
  theme: string;
  bpmApiKey?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiry?: number; // Unix ms timestamp
}

interface StoreSchema {
  playlists: Playlist[];
  librarySongs: LibrarySong[];
  playlistSongs: PlaylistSong[];
  songs: any[]; // Legacy — kept only for migration
  settings: Settings;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const store = new Store<StoreSchema>({
  name: 'heavy-metal-playlist',
  defaults: {
    playlists: [],
    librarySongs: [],
    playlistSongs: [],
    songs: [],
    settings: { theme: 'dark' },
  },
});

// ── Database ──────────────────────────────────────────────────────────────────

export class Database {
  constructor() {
    this.migrate();
  }

  /**
   * Migrates old single-table songs[] to the new librarySongs + playlistSongs model.
   * Runs once; subsequent calls are no-ops once the new tables have data.
   */
  private migrate(): void {
    const existing = store.get('librarySongs', []) as LibrarySong[];
    const existingPs = store.get('playlistSongs', []) as PlaylistSong[];
    const oldSongs: any[] = store.get('songs', []);

    // Already migrated (or fresh install with no legacy data)
    if (existing.length > 0 || existingPs.length > 0 || oldSongs.length === 0) {
      return;
    }

    // Fix orphan songs from the previous migration (songs without playlistId)
    const playlists: Playlist[] = store.get('playlists', []);
    let songsToMigrate = [...oldSongs];
    const orphans = songsToMigrate.filter((s) => !s.playlistId);
    if (orphans.length > 0) {
      let defaultPlaylist = playlists.find((p) => p.name === 'Setlist Principal');
      if (!defaultPlaylist) {
        defaultPlaylist = {
          id: uuidv4(),
          name: 'Setlist Principal',
          createdAt: new Date().toISOString(),
        };
        store.set('playlists', [...playlists, defaultPlaylist]);
      }
      songsToMigrate = songsToMigrate.map((s) =>
        s.playlistId ? s : { ...s, playlistId: defaultPlaylist!.id },
      );
    }

    // Build library songs — deduplicate by title+artist
    const newLibrarySongs: LibrarySong[] = [];
    const keyToLibId = new Map<string, string>();

    for (const s of songsToMigrate) {
      if (s.type === 'event') continue;
      const key = `${(s.title ?? '').trim().toLowerCase()}||${(s.artist ?? '').trim().toLowerCase()}`;
      if (!keyToLibId.has(key)) {
        const lib: LibrarySong = {
          id: uuidv4(),
          title: s.title ?? '',
          artist: s.artist ?? '',
          album: s.album,
          duration: s.duration,
          tempo: s.tempo,
          style: s.style,
          notes: s.notes,
        };
        newLibrarySongs.push(lib);
        keyToLibId.set(key, lib.id);
      }
    }

    // Build PlaylistSong entries
    const newPlaylistSongs: PlaylistSong[] = songsToMigrate.map((s) => {
      if (s.type === 'event') {
        return {
          id: uuidv4(),
          playlistId: s.playlistId,
          position: s.position ?? 0,
          type: 'event' as const,
          title: s.title ?? '',
          setlistName: s.setlistName,
          joinWithNext: s.joinWithNext,
        };
      }
      const key = `${(s.title ?? '').trim().toLowerCase()}||${(s.artist ?? '').trim().toLowerCase()}`;
      return {
        id: uuidv4(),
        playlistId: s.playlistId,
        songId: keyToLibId.get(key)!,
        position: s.position ?? 0,
        type: 'song' as const,
        setlistName: s.setlistName,
        joinWithNext: s.joinWithNext,
      };
    });

    store.set('librarySongs', newLibrarySongs);
    store.set('playlistSongs', newPlaylistSongs);
    store.set('songs', []); // Clear legacy data
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private mergeToView(ps: PlaylistSong, lib?: LibrarySong): PlaylistSongView {
    if (ps.type === 'event') {
      return {
        id: ps.id,
        playlistId: ps.playlistId,
        songId: undefined,
        position: ps.position,
        type: 'event',
        title: ps.title ?? '',
        setlistName: ps.setlistName,
        joinWithNext: ps.joinWithNext,
        artist: '',
      };
    }
    if (!lib) {
      return {
        id: ps.id,
        playlistId: ps.playlistId,
        songId: ps.songId,
        position: ps.position,
        type: ps.type ?? 'song',
        title: ps.title ?? '',
        setlistName: ps.setlistName,
        joinWithNext: ps.joinWithNext,
        artist: '',
      };
    }
    return {
      id: ps.id,
      playlistId: ps.playlistId,
      songId: lib.id,
      position: ps.position,
      type: ps.type ?? 'song',
      title: lib.title,
      setlistName: ps.setlistName,
      joinWithNext: ps.joinWithNext,
      artist: lib.artist,
      album: lib.album,
      duration: lib.duration,
      tempo: lib.tempo,
      style: lib.style,
      notes: lib.notes,
    };
  }

  // ── Playlists ─────────────────────────────────────────────────────────────

  getAllPlaylists(): PlaylistWithStats[] {
    const playlists: Playlist[] = store.get('playlists', []);
    const playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    const librarySongs: LibrarySong[] = store.get('librarySongs', []);

    return playlists.map((p) => {
      const entries = playlistSongs.filter((ps) => ps.playlistId === p.id);
      const songEntries = entries.filter((ps) => ps.type !== 'event');
      const totalDuration = songEntries.reduce((acc, ps) => {
        const lib = librarySongs.find((l) => l.id === ps.songId);
        return acc + (lib?.duration ?? 0);
      }, 0);
      return {
        ...p,
        songCount: songEntries.length,
        totalDuration,
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
    // Remove all playlist entries (library songs are shared, not deleted)
    let playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    playlistSongs = playlistSongs.filter((ps) => ps.playlistId !== id);
    store.set('playlistSongs', playlistSongs);
  }

  // ── Library Songs ─────────────────────────────────────────────────────────

  getAllLibrarySongs(): LibrarySong[] {
    return store.get('librarySongs', []);
  }

  createLibrarySong(data: Omit<LibrarySong, 'id'>): LibrarySong {
    const songs: LibrarySong[] = store.get('librarySongs', []);
    const newSong: LibrarySong = { ...data, id: uuidv4() };
    store.set('librarySongs', [...songs, newSong]);
    return newSong;
  }

  updateLibrarySong(updated: LibrarySong): LibrarySong {
    const songs: LibrarySong[] = store.get('librarySongs', []);
    const index = songs.findIndex((s) => s.id === updated.id);
    if (index === -1) throw new Error(`Library song ${updated.id} not found`);
    songs[index] = updated;
    store.set('librarySongs', songs);
    return updated;
  }

  deleteLibrarySong(id: string): void {
    // Cascade-delete from all playlists, then renormalise positions per playlist
    let playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    const affectedPlaylists = [...new Set(
      playlistSongs.filter((ps) => ps.songId === id).map((ps) => ps.playlistId),
    )];
    playlistSongs = playlistSongs.filter((ps) => ps.songId !== id);
    for (const playlistId of affectedPlaylists) {
      playlistSongs
        .filter((ps) => ps.playlistId === playlistId)
        .sort((a, b) => a.position - b.position)
        .forEach((ps, i) => { ps.position = i; });
    }
    store.set('playlistSongs', playlistSongs);

    let songs: LibrarySong[] = store.get('librarySongs', []);
    songs = songs.filter((s) => s.id !== id);
    store.set('librarySongs', songs);
  }

  /** Returns playlist IDs where the library song is used */
  getLibrarySongUsage(id: string): string[] {
    const playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    return [
      ...new Set(
        playlistSongs.filter((ps) => ps.songId === id).map((ps) => ps.playlistId),
      ),
    ];
  }

  /** Adds an existing library song to a playlist */
  addSongToPlaylist(
    playlistId: string,
    songId: string,
    opts: { setlistName?: string; joinWithNext?: boolean } = {},
  ): PlaylistSongView {
    const allPs: PlaylistSong[] = store.get('playlistSongs', []);
    const librarySongs: LibrarySong[] = store.get('librarySongs', []);
    const lib = librarySongs.find((l) => l.id === songId);
    if (!lib) throw new Error(`Library song ${songId} not found`);

    const position = allPs.filter((ps) => ps.playlistId === playlistId).length;
    const entry: PlaylistSong = {
      id: uuidv4(),
      playlistId,
      songId,
      position,
      type: 'song',
      setlistName: opts.setlistName,
      joinWithNext: opts.joinWithNext,
    };
    store.set('playlistSongs', [...allPs, entry]);
    return this.mergeToView(entry, lib);
  }

  // ── Songs (playlist entries — used by playlist view) ──────────────────────

  getSongsByPlaylist(playlistId: string): PlaylistSongView[] {
    const playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    const librarySongs: LibrarySong[] = store.get('librarySongs', []);

    return playlistSongs
      .filter((ps) => ps.playlistId === playlistId)
      .sort((a, b) => a.position - b.position)
      .map((ps) => {
        const lib = ps.songId ? librarySongs.find((l) => l.id === ps.songId) : undefined;
        return this.mergeToView(ps, lib);
      });
  }

  /**
   * Creates a new playlist entry.
   * - If data.songId is set: references existing library song.
   * - If data.type === 'event': creates inline event (no library entry).
   * - Otherwise: creates a new library song from the provided data.
   */
  create(data: Omit<Song, 'id' | 'position'>): PlaylistSongView {
    const allPs: PlaylistSong[] = store.get('playlistSongs', []);
    const position = allPs.filter((ps) => ps.playlistId === data.playlistId).length;

    if (data.type === 'event') {
      const entry: PlaylistSong = {
        id: uuidv4(),
        playlistId: data.playlistId,
        position,
        type: 'event',
        title: data.title,
      };
      store.set('playlistSongs', [...allPs, entry]);
      return this.mergeToView(entry);
    }

    let lib: LibrarySong | undefined;

    if (data.songId) {
      // Reference existing library song
      const librarySongs: LibrarySong[] = store.get('librarySongs', []);
      lib = librarySongs.find((l) => l.id === data.songId);
    }

    if (!lib) {
      // Create new library entry
      lib = this.createLibrarySong({
        title: data.title,
        artist: data.artist,
        album: data.album,
        duration: data.duration,
        tempo: data.tempo,
        style: data.style,
        notes: data.notes,
      });
    }

    const entry: PlaylistSong = {
      id: uuidv4(),
      playlistId: data.playlistId,
      songId: lib.id,
      position,
      type: 'song',
      setlistName: data.setlistName,
      joinWithNext: data.joinWithNext,
    };
    store.set('playlistSongs', [...allPs, entry]);
    return this.mergeToView(entry, lib);
  }

  /**
   * Updates a playlist entry.
   * - Playlist-specific fields (setlistName, joinWithNext) are updated on the PlaylistSong.
   * - Library fields (title, artist, album, etc.) are updated on the LibrarySong
   *   (this affects ALL playlists that reference this song).
   */
  update(updated: Song): PlaylistSongView {
    const allPs: PlaylistSong[] = store.get('playlistSongs', []);
    const index = allPs.findIndex((ps) => ps.id === updated.id);
    if (index === -1) throw new Error(`PlaylistSong ${updated.id} not found`);

    if (updated.type === 'event') {
      allPs[index] = {
        ...allPs[index],
        title: updated.title,
        setlistName: updated.setlistName,
        joinWithNext: updated.joinWithNext,
      };
      store.set('playlistSongs', allPs);
      return this.mergeToView(allPs[index]);
    }

    // Update playlist-specific fields
    allPs[index] = {
      ...allPs[index],
      setlistName: updated.setlistName,
      joinWithNext: updated.joinWithNext,
    };
    store.set('playlistSongs', allPs);

    // Update library song
    const songId = allPs[index].songId;
    if (songId) {
      const librarySongs: LibrarySong[] = store.get('librarySongs', []);
      const libIndex = librarySongs.findIndex((l) => l.id === songId);
      if (libIndex !== -1) {
        librarySongs[libIndex] = {
          ...librarySongs[libIndex],
          title: updated.title,
          artist: updated.artist,
          album: updated.album,
          duration: updated.duration,
          tempo: updated.tempo,
          style: updated.style,
          notes: updated.notes,
        };
        store.set('librarySongs', librarySongs);
        return this.mergeToView(allPs[index], librarySongs[libIndex]);
      }
    }

    return this.mergeToView(allPs[index]);
  }

  delete(id: string): void {
    let playlistSongs: PlaylistSong[] = store.get('playlistSongs', []);
    const entry = playlistSongs.find((ps) => ps.id === id);
    if (!entry) return;

    const { playlistId } = entry;
    playlistSongs = playlistSongs.filter((ps) => ps.id !== id);

    // Re-normalize positions within the same playlist
    const inPlaylist = playlistSongs
      .filter((ps) => ps.playlistId === playlistId)
      .sort((a, b) => a.position - b.position)
      .map((ps, i) => ({ ...ps, position: i }));
    const others = playlistSongs.filter((ps) => ps.playlistId !== playlistId);
    store.set('playlistSongs', [...others, ...inPlaylist]);
  }

  reorder(playlistId: string, orderedIds: string[]): PlaylistSongView[] {
    const allPs: PlaylistSong[] = store.get('playlistSongs', []);
    const librarySongs: LibrarySong[] = store.get('librarySongs', []);
    const others = allPs.filter((ps) => ps.playlistId !== playlistId);

    const reordered = orderedIds.map((id, index) => {
      const ps = allPs.find((p) => p.id === id);
      if (!ps) throw new Error(`PlaylistSong ${id} not found`);
      return { ...ps, position: index };
    });

    store.set('playlistSongs', [...others, ...reordered]);

    return reordered
      .sort((a, b) => a.position - b.position)
      .map((ps) => {
        const lib = ps.songId ? librarySongs.find((l) => l.id === ps.songId) : undefined;
        return this.mergeToView(ps, lib);
      });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings(): Settings {
    return store.get('settings', { theme: 'dark' });
  }

  setSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    store.set('settings', updated);
    return updated;
  }
}
