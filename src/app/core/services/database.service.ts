import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Song, Playlist, PlaylistWithStats, LibrarySong, PlaylistSongView } from '../models/song.model';
import { BandMember, Microphone, Instrument, Amplifier, PaEquipment, ChannelEntry } from '../models/equipment.model';

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

  // ── Band Members ───────────────────────────────────────────────────────────

  getMembers(): Promise<BandMember[]> {
    return invoke<BandMember[]>('members_get_all');
  }

  createMember(payload: Omit<BandMember, 'id'>): Promise<BandMember> {
    return invoke<BandMember>('members_create', { payload });
  }

  updateMember(member: BandMember): Promise<BandMember> {
    return invoke<BandMember>('members_update', { member });
  }

  deleteMember(id: string): Promise<void> {
    return invoke<void>('members_delete', { id });
  }

  // ── Microphones ────────────────────────────────────────────────────────────

  getMicrophones(): Promise<Microphone[]> {
    return invoke<Microphone[]>('microphones_get_all');
  }

  createMicrophone(payload: Omit<Microphone, 'id'>): Promise<Microphone> {
    return invoke<Microphone>('microphones_create', { payload });
  }

  updateMicrophone(microphone: Microphone): Promise<Microphone> {
    return invoke<Microphone>('microphones_update', { microphone });
  }

  deleteMicrophone(id: string): Promise<void> {
    return invoke<void>('microphones_delete', { id });
  }

  // ── Instruments ────────────────────────────────────────────────────────────

  getInstruments(): Promise<Instrument[]> {
    return invoke<Instrument[]>('instruments_get_all');
  }

  createInstrument(payload: Omit<Instrument, 'id'>): Promise<Instrument> {
    return invoke<Instrument>('instruments_create', { payload });
  }

  updateInstrument(instrument: Instrument): Promise<Instrument> {
    return invoke<Instrument>('instruments_update', { instrument });
  }

  deleteInstrument(id: string): Promise<void> {
    return invoke<void>('instruments_delete', { id });
  }

  // ── Amplifiers ─────────────────────────────────────────────────────────────

  getAmplifiers(): Promise<Amplifier[]> {
    return invoke<Amplifier[]>('amplifiers_get_all');
  }

  createAmplifier(payload: Omit<Amplifier, 'id'>): Promise<Amplifier> {
    return invoke<Amplifier>('amplifiers_create', { payload });
  }

  updateAmplifier(amplifier: Amplifier): Promise<Amplifier> {
    return invoke<Amplifier>('amplifiers_update', { amplifier });
  }

  deleteAmplifier(id: string): Promise<void> {
    return invoke<void>('amplifiers_delete', { id });
  }

  // ── PA Equipment ───────────────────────────────────────────────────────────

  getPaEquipment(): Promise<PaEquipment[]> {
    return invoke<PaEquipment[]>('pa_get_all');
  }

  createPaItem(payload: Omit<PaEquipment, 'id'>): Promise<PaEquipment> {
    return invoke<PaEquipment>('pa_create', { payload });
  }

  updatePaItem(item: PaEquipment): Promise<PaEquipment> {
    return invoke<PaEquipment>('pa_update', { item });
  }

  deletePaItem(id: string): Promise<void> {
    return invoke<void>('pa_delete', { id });
  }

  // ── Channel List (derived) ─────────────────────────────────────────────────

  generateChannelList(): Promise<ChannelEntry[]> {
    return invoke<ChannelEntry[]>('channel_list_generate');
  }
}
