import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as https from 'https';
import { Database, Song, Playlist, Settings, LibrarySong } from './database';
import { spotifyAuth, refreshSpotifyToken, getSpotifyBpm } from './spotify';

const db = new Database();
const isDev = !app.isPackaged;
const SPOTIFY_CLIENT_ID = '0cc600adfdd74ce8b384f3bb25c65337';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1920,
    minHeight: 1080,
    title: 'Heavy Metal Playlist',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'heavy-metal-playlist', 'browser', 'index.html'));
  }
}

// ── Playlist IPC Handlers ──────────────────────────────────────────────────

ipcMain.handle('playlists:getAll', () => {
  return db.getAllPlaylists();
});

ipcMain.handle('playlists:create', (_event, payload: Pick<Playlist, 'name' | 'description'>) => {
  return db.createPlaylist(payload);
});

ipcMain.handle('playlists:update', (_event, payload: { playlist: Playlist }) => {
  return db.updatePlaylist(payload.playlist);
});

ipcMain.handle('playlists:delete', (_event, payload: { id: string }) => {
  db.deletePlaylist(payload.id);
});

// ── Library Song IPC Handlers ──────────────────────────────────────────────

ipcMain.handle('library:getAll', () => {
  return db.getAllLibrarySongs();
});

ipcMain.handle('library:create', (_event, payload: Omit<LibrarySong, 'id'>) => {
  return db.createLibrarySong(payload);
});

ipcMain.handle('library:update', (_event, payload: LibrarySong) => {
  return db.updateLibrarySong(payload);
});

ipcMain.handle('library:delete', (_event, payload: { id: string }) => {
  db.deleteLibrarySong(payload.id);
});

ipcMain.handle('library:getUsage', (_event, payload: { id: string }) => {
  return db.getLibrarySongUsage(payload.id);
});

ipcMain.handle(
  'library:addToPlaylist',
  (
    _event,
    payload: {
      playlistId: string;
      songId: string;
      setlistName?: string;
      joinWithNext?: boolean;
    },
  ) => {
    return db.addSongToPlaylist(payload.playlistId, payload.songId, {
      setlistName: payload.setlistName,
      joinWithNext: payload.joinWithNext,
    });
  },
);

// ── Song IPC Handlers (playlist entries) ──────────────────────────────────

ipcMain.handle('songs:getByPlaylist', (_event, payload: { playlistId: string }) => {
  return db.getSongsByPlaylist(payload.playlistId);
});

ipcMain.handle('songs:create', (_event, payload: { song: Omit<Song, 'id' | 'position'> }) => {
  return db.create(payload.song);
});

ipcMain.handle('songs:update', (_event, payload: { song: Song }) => {
  return db.update(payload.song);
});

ipcMain.handle('songs:delete', (_event, payload: { id: string }) => {
  db.delete(payload.id);
});

ipcMain.handle('songs:reorder', (_event, payload: { playlistId: string; ids: string[] }) => {
  return db.reorder(payload.playlistId, payload.ids);
});

// ── Spotify IPC Handlers ───────────────────────────────────────────────────

ipcMain.handle('spotify:auth', async () => {
  const tokens = await spotifyAuth(SPOTIFY_CLIENT_ID);
  db.setSettings({
    spotifyAccessToken: tokens.accessToken,
    spotifyRefreshToken: tokens.refreshToken,
    spotifyTokenExpiry: tokens.expiry,
  });
  return { success: true };
});

ipcMain.handle('spotify:getBpm', async (_event, payload: { title: string; artist: string }) => {
  const settings = db.getSettings();
  if (!settings.spotifyAccessToken) return null;

  let accessToken = settings.spotifyAccessToken;

  // Refresh token if expired or expiring in the next minute
  if (settings.spotifyTokenExpiry && Date.now() > settings.spotifyTokenExpiry - 60_000) {
    if (settings.spotifyRefreshToken) {
      try {
        const tokens = await refreshSpotifyToken(SPOTIFY_CLIENT_ID, settings.spotifyRefreshToken);
        accessToken = tokens.accessToken;
        db.setSettings({
          spotifyAccessToken: tokens.accessToken,
          spotifyRefreshToken: tokens.refreshToken,
          spotifyTokenExpiry: tokens.expiry,
        });
      } catch {
        return null; // Refresh failed — user needs to re-authenticate
      }
    } else {
      return null;
    }
  }

  return getSpotifyBpm(accessToken, payload.title, payload.artist);
});

ipcMain.handle('spotify:disconnect', () => {
  db.setSettings({
    spotifyAccessToken: undefined,
    spotifyRefreshToken: undefined,
    spotifyTokenExpiry: undefined,
  });
});

// ── BPM Lookup (Deezer via Node.js, no CORS) ──────────────────────────────

function httpsGetJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

ipcMain.handle('bpm:lookup', async (_event, payload: { title: string; artist: string }) => {
  try {
    const q = encodeURIComponent(`track:"${payload.title}" artist:"${payload.artist}"`);
    const searchRes = await httpsGetJson(`https://api.deezer.com/search?q=${q}&limit=1`) as any;
    const id = searchRes?.data?.[0]?.id;
    if (!id) return null;
    const trackRes = await httpsGetJson(`https://api.deezer.com/track/${id}`) as any;
    const bpm = trackRes?.bpm;
    return bpm ? Math.round(bpm) : null;
  } catch {
    return null;
  }
});

// ── Dialog IPC Handlers ────────────────────────────────────────────────────

ipcMain.handle(
  'dialog:confirm',
  async (event, payload: { message: string; detail?: string; confirmLabel?: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showMessageBox(win!, {
      type: 'question',
      buttons: ['Cancelar', payload.confirmLabel ?? 'Aceptar'],
      defaultId: 1,
      cancelId: 0,
      message: payload.message,
      detail: payload.detail,
    });
    return result.response === 1;
  },
);

// ── Settings IPC Handlers ──────────────────────────────────────────────────

ipcMain.handle('settings:get', () => {
  return db.getSettings();
});

ipcMain.handle('settings:set', (_event, payload: Partial<Settings>) => {
  return db.setSettings(payload);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
