import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, payload?: unknown): Promise<unknown> => {
    const allowed = [
      'playlists:getAll',
      'playlists:create',
      'playlists:update',
      'playlists:delete',
      'songs:getByPlaylist',
      'songs:create',
      'songs:update',
      'songs:delete',
      'songs:reorder',
    ];
    if (!allowed.includes(channel)) {
      return Promise.reject(new Error(`Channel "${channel}" not allowed`));
    }
    return ipcRenderer.invoke(channel, payload);
  },
});
