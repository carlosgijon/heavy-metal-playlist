import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, MeResponse, SelectBandResponse, User, UserPayload, UserUpdate } from '../models/auth.model';
import { Song, Playlist, PlaylistWithStats, LibrarySong, PlaylistSongView } from '../models/song.model';
import { BandMember, Microphone, Instrument, Amplifier, PaEquipment, ChannelEntry } from '../models/equipment.model';
import { Venue, Gig, GigStatus, CalendarEvent, GigChecklist, ChecklistItem, GigContact } from '../models/gig.model';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Extracts a readable message from NestJS error responses and re-throws as string. */
  private handleError(err: any): never {
    const msg = err?.error?.message ?? err?.message ?? 'Error desconocido';
    throw Array.isArray(msg) ? msg.join(', ') : String(msg);
  }

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.api}${path}`).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  private post<T>(path: string, body: any = {}): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.api}${path}`, body).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  private put<T>(path: string, body: any = {}): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(`${this.api}${path}`, body).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  private patch<T>(path: string, body: any = {}): Promise<T> {
    return firstValueFrom(
      this.http.patch<T>(`${this.api}${path}`, body).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  private del<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${this.api}${path}`).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  // -- Bands (superadmin only) -----------------------------------------------

  getBands(): Promise<Array<{ id: string; name: string; slug: string; createdAt: string; _count: { userBands: number } }>> {
    return this.get('/bands');
  }

  createBand(payload: { name: string; slug: string; adminUsername: string; adminPassword: string }): Promise<{ id: string; name: string; slug: string }> {
    return this.post('/bands', payload);
  }

  deleteBand(id: string): Promise<void> {
    return this.del(`/bands/${id}`);
  }

  // -- Band settings (admin) -------------------------------------------------

  getMyBand(): Promise<{ id: string; name: string; slug: string; logo?: string }> {
    return this.get('/bands/mine');
  }

  updateMyBand(dto: { name?: string; logo?: string | null }): Promise<{ id: string; name: string; slug: string; logo?: string }> {
    return this.put('/bands/mine', dto);
  }

  // -- Auth ------------------------------------------------------------------

  login(username: string, password: string): Promise<AuthResponse> {
    return this.post('/auth/login', { username, password });
  }

  selectBand(bandId: string): Promise<SelectBandResponse> {
    return this.post(`/auth/select-band/${bandId}`);
  }

  authLogout(_token: string): Promise<void> {
    return Promise.resolve();
  }

  validateToken(token: string): Promise<MeResponse> {
    return firstValueFrom(
      this.http.get<MeResponse>(`${this.api}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).pipe(catchError(err => { this.handleError(err); })),
    );
  }

  // -- Users (admin) ---------------------------------------------------------

  getUsers(): Promise<User[]> {
    return this.get('/users');
  }

  createUser(payload: UserPayload): Promise<User> {
    return this.post('/users', payload);
  }

  updateUser(user: UserUpdate): Promise<User> {
    return this.put(`/users/${user.id}`, user);
  }

  deleteUser(id: string): Promise<void> {
    return this.del(`/users/${id}`);
  }

  changePassword(id: string, newPassword: string): Promise<void> {
    return this.put(`/users/${id}/password`, { newPassword });
  }

  // -- Settings --------------------------------------------------------------

  getSettings(): Promise<{ theme: string; bpmApiKey?: string }> {
    return this.get('/settings');
  }

  setSettings(partial: { theme?: string; bpmApiKey?: string }): Promise<void> {
    return this.post('/settings', partial);
  }

  // -- Playlists -------------------------------------------------------------

  getPlaylists(): Promise<PlaylistWithStats[]> {
    return this.get('/playlists');
  }

  createPlaylist(data: Pick<Playlist, 'name' | 'description'>): Promise<Playlist> {
    return this.post('/playlists', data);
  }

  updatePlaylist(playlist: Playlist): Promise<Playlist> {
    return this.put(`/playlists/${playlist.id}`, playlist);
  }

  deletePlaylist(id: string): Promise<void> {
    return this.del(`/playlists/${id}`);
  }

  // -- Library Songs ---------------------------------------------------------

  getLibrarySongs(): Promise<LibrarySong[]> {
    return this.get('/library');
  }

  createLibrarySong(data: Omit<LibrarySong, 'id'>): Promise<LibrarySong> {
    return this.post('/library', data);
  }

  updateLibrarySong(song: LibrarySong): Promise<LibrarySong> {
    return this.put(`/library/${song.id}`, song);
  }

  deleteLibrarySong(id: string): Promise<void> {
    return this.del(`/library/${id}`);
  }

  getLibrarySongUsage(id: string): Promise<string[]> {
    return this.get(`/library/${id}/usage`);
  }

  addSongToPlaylist(
    playlistId: string,
    songId: string,
    opts: { setlistName?: string; joinWithNext?: boolean } = {},
  ): Promise<PlaylistSongView> {
    return this.post(`/playlists/${playlistId}/songs`, { songId, type: 'song', ...opts });
  }

  // -- Songs (playlist entries) ----------------------------------------------

  getSongsByPlaylist(playlistId: string): Promise<Song[]> {
    return this.get(`/playlists/${playlistId}/songs`);
  }

  create(song: Omit<Song, 'id' | 'position'>): Promise<Song> {
    const { playlistId, ...rest } = song;
    return this.post(`/playlists/${playlistId}/songs`, { type: 'event', ...rest });
  }

  update(song: Song): Promise<Song> {
    return this.put(`/playlists/${song.playlistId}/songs/${song.id}`, song);
  }

  delete(id: string, playlistId?: string): Promise<void> {
    if (playlistId) {
      return this.del(`/playlists/${playlistId}/songs/${id}`);
    }
    // fallback if caller doesn't provide playlistId
    return this.del(`/playlists/songs/${id}`);
  }

  reorder(playlistId: string, ids: string[]): Promise<Song[]> {
    return this.post(`/playlists/${playlistId}/reorder`, { ids });
  }

  // -- Band Members ----------------------------------------------------------

  getMembers(): Promise<BandMember[]> {
    return this.get('/members');
  }

  createMember(payload: Omit<BandMember, 'id'>): Promise<BandMember> {
    return this.post('/members', payload);
  }

  updateMember(member: BandMember): Promise<BandMember> {
    return this.put(`/members/${member.id}`, member);
  }

  deleteMember(id: string): Promise<void> {
    return this.del(`/members/${id}`);
  }

  // -- Microphones -----------------------------------------------------------

  getMicrophones(): Promise<Microphone[]> {
    return this.get('/microphones');
  }

  createMicrophone(payload: Omit<Microphone, 'id'>): Promise<Microphone> {
    return this.post('/microphones', payload);
  }

  updateMicrophone(microphone: Microphone): Promise<Microphone> {
    return this.put(`/microphones/${microphone.id}`, microphone);
  }

  deleteMicrophone(id: string): Promise<void> {
    return this.del(`/microphones/${id}`);
  }

  // -- Instruments -----------------------------------------------------------

  getInstruments(): Promise<Instrument[]> {
    return this.get('/instruments');
  }

  createInstrument(payload: Omit<Instrument, 'id'>): Promise<Instrument> {
    return this.post('/instruments', payload);
  }

  updateInstrument(instrument: Instrument): Promise<Instrument> {
    return this.put(`/instruments/${instrument.id}`, instrument);
  }

  deleteInstrument(id: string): Promise<void> {
    return this.del(`/instruments/${id}`);
  }

  // -- Amplifiers ------------------------------------------------------------

  getAmplifiers(): Promise<Amplifier[]> {
    return this.get('/amplifiers');
  }

  createAmplifier(payload: Omit<Amplifier, 'id'>): Promise<Amplifier> {
    return this.post('/amplifiers', payload);
  }

  updateAmplifier(amplifier: Amplifier): Promise<Amplifier> {
    return this.put(`/amplifiers/${amplifier.id}`, amplifier);
  }

  deleteAmplifier(id: string): Promise<void> {
    return this.del(`/amplifiers/${id}`);
  }

  updateAmplifierInstrumentLink(ampId: string, instrumentId: string | null): Promise<void> {
    return this.put(`/amplifiers/${ampId}/instrument-link`, { instrumentId });
  }

  setInstrumentMics(instrumentId: string, micIds: string[]): Promise<void> {
    // Update each mic's assignedToId on the server
    return this.post(`/instruments/${instrumentId}/mics`, { micIds });
  }

  setAmplifierMics(amplifierId: string, micIds: string[]): Promise<void> {
    return this.post(`/amplifiers/${amplifierId}/mics`, { micIds });
  }

  // -- PA Equipment ----------------------------------------------------------

  getPaEquipment(): Promise<PaEquipment[]> {
    return this.get('/pa');
  }

  createPaItem(payload: Omit<PaEquipment, 'id'>): Promise<PaEquipment> {
    return this.post('/pa', payload);
  }

  updatePaItem(item: PaEquipment): Promise<PaEquipment> {
    return this.put(`/pa/${item.id}`, item);
  }

  deletePaItem(id: string): Promise<void> {
    return this.del(`/pa/${id}`);
  }

  generateChannelList(): Promise<ChannelEntry[]> {
    return this.get('/channel-list');
  }

  // -- Venues ----------------------------------------------------------------

  getVenues(): Promise<Venue[]> {
    return this.get('/venues');
  }

  createVenue(payload: Omit<Venue, 'id' | 'createdAt'>): Promise<Venue> {
    return this.post('/venues', payload);
  }

  updateVenue(venue: Venue): Promise<Venue> {
    return this.put(`/venues/${venue.id}`, venue);
  }

  deleteVenue(id: string): Promise<void> {
    return this.del(`/venues/${id}`);
  }

  // -- Gigs ------------------------------------------------------------------

  getGigs(): Promise<Gig[]> {
    return this.get('/gigs');
  }

  createGig(payload: Omit<Gig, 'id' | 'createdAt' | 'venueName'>): Promise<Gig> {
    return this.post('/gigs', payload);
  }

  updateGig(gig: Gig): Promise<Gig> {
    return this.put(`/gigs/${gig.id}`, gig);
  }

  updateGigStatus(id: string, status: GigStatus): Promise<Gig> {
    return this.patch(`/gigs/${id}/status`, { status });
  }

  deleteGig(id: string): Promise<void> {
    return this.del(`/gigs/${id}`);
  }

  updateGigFollowUp(id: string, followUpDate: string | undefined, followUpNote: string | undefined): Promise<void> {
    return this.patch(`/gigs/${id}/follow-up`, { followUpDate, followUpNote });
  }

  // -- Calendar Events -------------------------------------------------------

  getCalendarEvents(): Promise<CalendarEvent[]> {
    return this.get('/calendar');
  }

  getCalendarEventsByMonth(year: number, month: number): Promise<CalendarEvent[]> {
    return this.get(`/calendar?year=${year}&month=${month}`);
  }

  createCalendarEvent(payload: Omit<CalendarEvent, 'id' | 'createdAt' | 'memberName'>): Promise<CalendarEvent> {
    return this.post('/calendar', payload);
  }

  updateCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
    return this.put(`/calendar/${event.id}`, event);
  }

  deleteCalendarEvent(id: string): Promise<void> {
    return this.del(`/calendar/${id}`);
  }

  // -- Gig Checklists --------------------------------------------------------

  getGigChecklists(gigId: string): Promise<GigChecklist[]> {
    return this.get(`/gigs/${gigId}/checklists`);
  }

  createGigChecklist(payload: { gigId: string; name: string }): Promise<GigChecklist> {
    return this.post(`/gigs/${payload.gigId}/checklists`, { name: payload.name });
  }

  deleteGigChecklist(id: string): Promise<void> {
    return this.del(`/gigs/checklists/${id}`);
  }

  getChecklistByList(checklistId: string): Promise<ChecklistItem[]> {
    return this.get(`/gigs/checklists/${checklistId}/items`);
  }

  createChecklistItem(payload: Omit<ChecklistItem, 'id' | 'done'>): Promise<ChecklistItem> {
    return this.post(`/gigs/checklists/${payload.checklistId}/items`, payload);
  }

  updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    return this.put(`/gigs/checklists/${item.checklistId}/items/${item.id}`, item);
  }

  deleteChecklistItem(id: string): Promise<void> {
    return this.del(`/gigs/checklist-items/${id}`);
  }

  resetChecklistByList(checklistId: string): Promise<void> {
    return this.post(`/gigs/checklists/${checklistId}/reset`);
  }

  // -- Gig Contacts ----------------------------------------------------------

  getGigContacts(gigId: string): Promise<GigContact[]> {
    return this.get(`/gigs/${gigId}/contacts`);
  }

  createGigContact(payload: Omit<GigContact, 'id' | 'createdAt'>): Promise<GigContact> {
    return this.post(`/gigs/${payload.gigId}/contacts`, payload);
  }

  deleteGigContact(id: string): Promise<void> {
    return this.del(`/gigs/contacts/${id}`);
  }
}
