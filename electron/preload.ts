import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, payload?: unknown): Promise<unknown> => {
    const allowed = [
      'playlists:getAll',
      'playlists:create',
      'playlists:update',
      'playlists:delete',
      'library:getAll',
      'library:create',
      'library:update',
      'library:delete',
      'library:getUsage',
      'library:addToPlaylist',
      'songs:getByPlaylist',
      'songs:create',
      'songs:update',
      'songs:delete',
      'songs:reorder',
      'settings:get',
      'settings:set',
      'spotify:auth',
      'spotify:getBpm',
      'spotify:disconnect',
      'dialog:confirm',
      'bpm:lookup',
    ];
    if (!allowed.includes(channel)) {
      return Promise.reject(new Error(`Channel "${channel}" not allowed`));
    }
    return ipcRenderer.invoke(channel, payload);
  },
});
