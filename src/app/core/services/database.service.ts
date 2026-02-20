import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Song, Playlist, PlaylistWithStats, LibrarySong, PlaylistSongView } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  // ── Playlists ──────────────────────────────────────────────────────────────

  getPlaylists(): Promise<PlaylistWithStats[]> {
    return invoke<PlaylistWithStats[]>('playlists_get_all');
  }

  createPlaylist(data: Pick<Playlist, 'name' | 'description'>): Promise<Playlist> {
    return invoke<Playlist>('playlists_create', { payload: data });
  }

  updatePlaylist(playlist: Playlist): Promise<Playlist> {
    return invoke<Playlist>('playlists_update', { playlist });
  }

  deletePlaylist(id: string): Promise<void> {
    return invoke<void>('playlists_delete', { id });
  }

  // ── Library Songs ──────────────────────────────────────────────────────────

  getLibrarySongs(): Promise<LibrarySong[]> {
    return invoke<LibrarySong[]>('library_get_all');
  }

  createLibrarySong(data: Omit<LibrarySong, 'id'>): Promise<LibrarySong> {
    return invoke<LibrarySong>('library_create', { payload: data });
  }

  updateLibrarySong(song: LibrarySong): Promise<LibrarySong> {
    return invoke<LibrarySong>('library_update', { song });
  }

  deleteLibrarySong(id: string): Promise<void> {
    return invoke<void>('library_delete', { id });
  }

  getLibrarySongUsage(id: string): Promise<string[]> {
    return invoke<string[]>('library_get_usage', { id });
  }

  addSongToPlaylist(
    playlistId: string,
    songId: string,
    opts: { setlistName?: string; joinWithNext?: boolean } = {},
  ): Promise<PlaylistSongView> {
    return invoke<PlaylistSongView>('library_add_to_playlist', {
      payload: {
        playlistId,
        songId,
        setlistName: opts.setlistName,
        joinWithNext: opts.joinWithNext,
      },
    });
  }

  // ── Songs (playlist entries) ───────────────────────────────────────────────

  getSongsByPlaylist(playlistId: string): Promise<Song[]> {
    return invoke<Song[]>('songs_get_by_playlist', { playlistId });
  }

  create(song: Omit<Song, 'id' | 'position'>): Promise<Song> {
    return invoke<Song>('songs_create', { song });
  }

  update(song: Song): Promise<Song> {
    return invoke<Song>('songs_update', { song });
  }

  delete(id: string): Promise<void> {
    return invoke<void>('songs_delete', { id });
  }

  reorder(playlistId: string, ids: string[]): Promise<Song[]> {
    return invoke<Song[]>('songs_reorder', { payload: { playlistId, ids } });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings(): Promise<{ theme: string; bpmApiKey?: string }> {
    return invoke<{ theme: string; bpmApiKey?: string }>('settings_get');
  }

  setSettings(partial: { theme?: string; bpmApiKey?: string }): Promise<void> {
    return invoke<void>('settings_set', { payload: partial });
  }
}
