import { Injectable } from '@angular/core';
import { Song, Playlist, PlaylistWithStats } from '../models/song.model';

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private invoke<T>(channel: string, payload?: unknown): Promise<T> {
    return window.electronAPI.invoke(channel, payload) as Promise<T>;
  }

  // ── Playlists ──────────────────────────────────────────────────

  getPlaylists(): Promise<PlaylistWithStats[]> {
    return this.invoke<PlaylistWithStats[]>('playlists:getAll');
  }

  createPlaylist(data: Pick<Playlist, 'name' | 'description'>): Promise<Playlist> {
    return this.invoke<Playlist>('playlists:create', data);
  }

  updatePlaylist(playlist: Playlist): Promise<Playlist> {
    return this.invoke<Playlist>('playlists:update', { playlist });
  }

  deletePlaylist(id: string): Promise<void> {
    return this.invoke<void>('playlists:delete', { id });
  }

  // ── Songs ──────────────────────────────────────────────────────

  getSongsByPlaylist(playlistId: string): Promise<Song[]> {
    return this.invoke<Song[]>('songs:getByPlaylist', { playlistId });
  }

  create(song: Omit<Song, 'id' | 'position'>): Promise<Song> {
    return this.invoke<Song>('songs:create', { song });
  }

  update(song: Song): Promise<Song> {
    return this.invoke<Song>('songs:update', { song });
  }

  delete(id: string): Promise<void> {
    return this.invoke<void>('songs:delete', { id });
  }

  reorder(playlistId: string, ids: string[]): Promise<Song[]> {
    return this.invoke<Song[]>('songs:reorder', { playlistId, ids });
  }

  // ── Settings ──────────────────────────────────────────────────

  getSettings(): Promise<{ theme: string }> {
    return this.invoke<{ theme: string }>('settings:get');
  }

  setSettings(partial: { theme?: string }): Promise<{ theme: string }> {
    return this.invoke<{ theme: string }>('settings:set', partial);
  }
}
