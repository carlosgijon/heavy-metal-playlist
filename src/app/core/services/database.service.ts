import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Song, Playlist, PlaylistWithStats, LibrarySong, PlaylistSongView } from '../models/song.model';
import { BandMember, Microphone, Instrument, Amplifier, PaEquipment, ChannelEntry } from '../models/equipment.model';
import { Venue, Gig, GigStatus, CalendarEvent, GigChecklist, ChecklistItem, GigContact } from '../models/gig.model';

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

  updateAmplifierInstrumentLink(ampId: string, instrumentId: string | null): Promise<void> {
    return invoke<void>('amplifiers_update_instrument_link', { ampId, instrumentId });
  }

  setInstrumentMics(instrumentId: string, micIds: string[]): Promise<void> {
    return invoke<void>('instrument_mics_set', { instrumentId, micIds });
  }

  setAmplifierMics(amplifierId: string, micIds: string[]): Promise<void> {
    return invoke<void>('amplifier_mics_set', { amplifierId, micIds });
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

  // ── Venues ─────────────────────────────────────────────────────────────────

  getVenues(): Promise<Venue[]> {
    return invoke<Venue[]>('venues_get_all');
  }

  createVenue(payload: Omit<Venue, 'id' | 'createdAt'>): Promise<Venue> {
    return invoke<Venue>('venues_create', { payload });
  }

  updateVenue(venue: Venue): Promise<Venue> {
    return invoke<Venue>('venues_update', { venue });
  }

  deleteVenue(id: string): Promise<void> {
    return invoke<void>('venues_delete', { id });
  }

  // ── Gigs ───────────────────────────────────────────────────────────────────

  getGigs(): Promise<Gig[]> {
    return invoke<Gig[]>('gigs_get_all');
  }

  createGig(payload: Omit<Gig, 'id' | 'createdAt' | 'venueName'>): Promise<Gig> {
    return invoke<Gig>('gigs_create', { payload });
  }

  updateGig(gig: Gig): Promise<Gig> {
    return invoke<Gig>('gigs_update', { gig });
  }

  updateGigStatus(id: string, status: GigStatus): Promise<Gig> {
    return invoke<Gig>('gigs_update_status', { id, status });
  }

  deleteGig(id: string): Promise<void> {
    return invoke<void>('gigs_delete', { id });
  }

  // ── Calendar Events ────────────────────────────────────────────────────────

  getCalendarEvents(): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>('calendar_events_get_all');
  }

  getCalendarEventsByMonth(year: number, month: number): Promise<CalendarEvent[]> {
    return invoke<CalendarEvent[]>('calendar_events_get_by_month', { year, month });
  }

  createCalendarEvent(payload: Omit<CalendarEvent, 'id' | 'createdAt' | 'memberName'>): Promise<CalendarEvent> {
    return invoke<CalendarEvent>('calendar_events_create', { payload });
  }

  updateCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
    return invoke<CalendarEvent>('calendar_events_update', { event });
  }

  deleteCalendarEvent(id: string): Promise<void> {
    return invoke<void>('calendar_events_delete', { id });
  }

  // ── GigChecklists ──────────────────────────────────────────────────────────

  getGigChecklists(gigId: string): Promise<GigChecklist[]> {
    return invoke<GigChecklist[]>('gig_checklists_get_by_gig', { gigId });
  }

  createGigChecklist(payload: { gigId: string; name: string }): Promise<GigChecklist> {
    return invoke<GigChecklist>('gig_checklists_create', { payload });
  }

  deleteGigChecklist(id: string): Promise<void> {
    return invoke<void>('gig_checklists_delete', { id });
  }

  // ── ChecklistItems ─────────────────────────────────────────────────────────

  getChecklistByList(checklistId: string): Promise<ChecklistItem[]> {
    return invoke<ChecklistItem[]>('checklist_get_by_list', { checklistId });
  }

  createChecklistItem(payload: Omit<ChecklistItem, 'id' | 'done'>): Promise<ChecklistItem> {
    return invoke<ChecklistItem>('checklist_create', { payload });
  }

  updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    return invoke<ChecklistItem>('checklist_update', { item });
  }

  deleteChecklistItem(id: string): Promise<void> {
    return invoke<void>('checklist_delete', { id });
  }

  resetChecklistByList(checklistId: string): Promise<void> {
    return invoke<void>('checklist_reset_done_by_list', { checklistId });
  }

  // ── Gig Contacts ───────────────────────────────────────────────────────────

  getGigContacts(gigId: string): Promise<GigContact[]> {
    return invoke<GigContact[]>('gig_contacts_get_by_gig', { gigId });
  }

  createGigContact(payload: Omit<GigContact, 'id' | 'createdAt'>): Promise<GigContact> {
    return invoke<GigContact>('gig_contacts_create', { payload });
  }

  deleteGigContact(id: string): Promise<void> {
    return invoke<void>('gig_contacts_delete', { id });
  }

  updateGigFollowUp(id: string, followUpDate: string | undefined, followUpNote: string | undefined): Promise<void> {
    return invoke<void>('gigs_update_follow_up', { id, followUpDate, followUpNote });
  }
}
