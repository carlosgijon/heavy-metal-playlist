import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { Database, Song, Playlist } from './database';

const db = new Database();
const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

// ── Playlist IPC Handlers ──────────────────────────────────────

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

// ── Song IPC Handlers ──────────────────────────────────────────

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
