import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, MeResponse, SelectBandResponse, User, UserPayload, UserUpdate } from '../models/auth.model';
import { Song, Playlist, PlaylistWithStats, LibrarySong, PlaylistSongView, LibraryStats, VoteSession, VoteEntry, VoteResult } from '../models/song.model';
import { BandMember, Microphone, Instrument, Amplifier, PaEquipment, ChannelEntry } from '../models/equipment.model';
import { Venue, Gig, GigStatus, GigSummary, CalendarEvent, GigChecklist, ChecklistItem, GigContact } from '../models/gig.model';
import { Transaction, WishListItem } from '../models/finance.model';
import { MerchItem, MerchSaleDto, MerchRestockDto, MerchWaitingEntry } from '../models/merch.model';
import { Rehearsal, RehearsalSongEntry } from '../models/rehearsal.model';
import { Poll, PollResults, CreatePollDto, PollStatus, PollOption } from '../models/poll.model';
import { ScnFile, SaveScnFileDto, UpdateScnFileDto } from '../models/mixer.model';

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

  getSettings(): Promise<{ theme: string; fontSize?: string; fontFamily?: string; navTheme?: string }> {
    return this.get('/settings');
  }

  setSettings(partial: { theme?: string; fontSize?: string; fontFamily?: string; navTheme?: string }): Promise<void> {
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

  getLibraryStats(): Promise<LibraryStats> {
    return this.get('/library/stats');
  }

  getPlaylistGigs(playlistId: string): Promise<Array<{ id: string; title: string; date?: string; status: string; venueName?: string }>> {
    return this.get(`/playlists/${playlistId}/gigs`);
  }

  // -- Setlist voting --------------------------------------------------------

  getVoteSession(playlistId: string): Promise<VoteSession | null> {
    return this.get(`/vote-sessions?playlistId=${playlistId}`);
  }

  createVoteSession(playlistId: string, title: string): Promise<VoteSession> {
    return this.post('/vote-sessions', { playlistId, title });
  }

  closeVoteSession(sessionId: string): Promise<VoteSession> {
    return this.put(`/vote-sessions/${sessionId}/close`, {});
  }

  reopenVoteSession(sessionId: string): Promise<VoteSession> {
    return this.put(`/vote-sessions/${sessionId}/reopen`, {});
  }

  deleteVoteSession(sessionId: string): Promise<void> {
    return this.del(`/vote-sessions/${sessionId}`);
  }

  castVote(sessionId: string, voterName: string, orderedIds: string[]): Promise<VoteEntry> {
    return this.post(`/vote-sessions/${sessionId}/votes`, { voterName, orderedIds });
  }

  getVoteResults(sessionId: string): Promise<VoteResult[]> {
    return this.get(`/vote-sessions/${sessionId}/results`);
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
    return this.post(`/playlists/${playlistId}/songs`, { type: 'song', ...rest });
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

  // -- Finance: Transactions --------------------------------------------------

  getTransactions(): Promise<Transaction[]> {
    return this.get('/finance/transactions');
  }

  createTransaction(dto: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    return this.post('/finance/transactions', dto);
  }

  updateTransaction(dto: Transaction): Promise<Transaction> {
    return this.put(`/finance/transactions/${dto.id}`, dto);
  }

  deleteTransaction(id: string): Promise<void> {
    return this.del(`/finance/transactions/${id}`);
  }

  // -- Finance: Wish List -----------------------------------------------------

  getWishList(): Promise<WishListItem[]> {
    return this.get('/finance/wish-list');
  }

  createWishListItem(dto: Omit<WishListItem, 'id' | 'createdAt'>): Promise<WishListItem> {
    return this.post('/finance/wish-list', dto);
  }

  updateWishListItem(dto: WishListItem & { finalPrice?: number }): Promise<WishListItem> {
    return this.put(`/finance/wish-list/${dto.id}`, dto);
  }

  deleteWishListItem(id: string): Promise<void> {
    return this.del(`/finance/wish-list/${id}`);
  }

  getInitialBalance(): Promise<{ initialBalance: number }> {
    return this.get('/finance/balance');
  }

  setInitialBalance(amount: number): Promise<{ initialBalance: number }> {
    return this.put('/finance/balance', { initialBalance: amount });
  }

  // -- Merch ------------------------------------------------------------------

  getMerchItems(): Promise<MerchItem[]> {
    return this.get('/merch');
  }

  createMerchItem(dto: Omit<MerchItem, 'id' | 'createdAt'>): Promise<MerchItem> {
    return this.post('/merch', dto);
  }

  updateMerchItem(dto: MerchItem): Promise<MerchItem> {
    return this.put(`/merch/${dto.id}`, dto);
  }

  deleteMerchItem(id: string): Promise<void> {
    return this.del(`/merch/${id}`);
  }

  sellMerchItem(id: string, dto: MerchSaleDto): Promise<{ item: MerchItem; transaction: any }> {
    return this.post(`/merch/${id}/sell`, dto);
  }

  restockMerchItem(id: string, dto: MerchRestockDto): Promise<MerchItem> {
    return this.put(`/merch/${id}/stock`, dto);
  }

  getMerchWaitingList(): Promise<MerchWaitingEntry[]> {
    return this.get('/merch/waiting');
  }

  addMerchWaiting(itemId: string, dto: { name: string; quantity: number; size?: string; contact?: string; notes?: string }): Promise<MerchWaitingEntry> {
    return this.post(`/merch/${itemId}/waiting`, dto);
  }

  updateMerchWaiting(entryId: string, dto: { status?: string; contact?: string; notes?: string }): Promise<MerchWaitingEntry> {
    return this.put(`/merch/waiting/${entryId}`, dto);
  }

  deleteMerchWaiting(entryId: string): Promise<void> {
    return this.del(`/merch/waiting/${entryId}`);
  }

  // Aliases used by GigDetailComponent
  getChecklistItems(checklistId: string): Promise<ChecklistItem[]> {
    return this.getChecklistByList(checklistId);
  }

  deleteGigChecklistById(id: string): Promise<void> {
    return this.deleteGigChecklist(id);
  }

  resetChecklistItems(checklistId: string): Promise<void> {
    return this.resetChecklistByList(checklistId);
  }

  deleteChecklistItemById(id: string): Promise<void> {
    return this.deleteChecklistItem(id);
  }

  // -- Gig summary ------------------------------------------------------------

  getGigSummary(gigId: string): Promise<GigSummary> {
    return this.get(`/gigs/${gigId}/summary`);
  }

  // -- AI ---------------------------------------------------------------------

  generateSetlist(songs: any[], preferences: string): Promise<{ orderedIds: string[]; joinAfter: string[]; bisAfterSongId: string | null; explanation: string }> {
    return this.post('/ai/setlist', { songs, preferences });
  }

  // -- Rehearsals --------------------------------------------------------------

  getRehearsals(): Promise<Rehearsal[]> {
    return this.get('/rehearsals');
  }

  createRehearsal(dto: { date: string; notes?: string }): Promise<Rehearsal> {
    return this.post('/rehearsals', dto);
  }

  updateRehearsal(dto: Pick<Rehearsal, 'id'> & { date?: string; notes?: string }): Promise<Rehearsal> {
    return this.put(`/rehearsals/${dto.id}`, dto);
  }

  deleteRehearsal(id: string): Promise<void> {
    return this.del(`/rehearsals/${id}`);
  }

  addRehearsalSong(rehearsalId: string, dto: { songId: string; notes?: string; rating?: number }): Promise<RehearsalSongEntry> {
    return this.post(`/rehearsals/${rehearsalId}/songs`, dto);
  }

  updateRehearsalSong(rehearsalId: string, entryId: string, dto: { notes?: string; rating?: number }): Promise<RehearsalSongEntry> {
    return this.put(`/rehearsals/${rehearsalId}/songs/${entryId}`, dto);
  }

  deleteRehearsalSong(rehearsalId: string, entryId: string): Promise<void> {
    return this.del(`/rehearsals/${rehearsalId}/songs/${entryId}`);
  }

  // ── Polls ──────────────────────────────────────────────────────────────────

  getPolls(): Promise<Poll[]> {
    return this.get('/polls');
  }

  getPoll(id: string): Promise<Poll> {
    return this.get(`/polls/${id}`);
  }

  createPoll(dto: CreatePollDto): Promise<Poll> {
    return this.post('/polls', dto);
  }

  setPollStatus(id: string, status: PollStatus): Promise<Poll> {
    return this.patch(`/polls/${id}/status`, { status });
  }

  deletePoll(id: string): Promise<void> {
    return this.del(`/polls/${id}`);
  }

  addPollOption(pollId: string, text: string, proposedBy: string): Promise<PollOption> {
    return this.post(`/polls/${pollId}/options`, { text, proposedBy });
  }

  deletePollOption(pollId: string, optionId: string): Promise<void> {
    return this.del(`/polls/${pollId}/options/${optionId}`);
  }

  castPollVote(pollId: string, dto: { voterName: string; value?: string; approvedOptionIds?: string[]; comment?: string }): Promise<Poll> {
    return this.post(`/polls/${pollId}/votes`, dto);
  }

  getPollResults(pollId: string): Promise<PollResults> {
    return this.get(`/polls/${pollId}/results`);
  }

  // -- SCN Files (Mixer) ------------------------------------------------------

  getScnFiles(): Promise<ScnFile[]> {
    return this.get('/mixer/scn-files');
  }

  saveScnFile(dto: SaveScnFileDto): Promise<ScnFile> {
    return this.post('/mixer/scn-files', dto);
  }

  updateScnFile(id: string, dto: UpdateScnFileDto): Promise<ScnFile> {
    return this.patch(`/mixer/scn-files/${id}`, dto);
  }

  deleteScnFile(id: string): Promise<void> {
    return this.del(`/mixer/scn-files/${id}`);
  }
}
