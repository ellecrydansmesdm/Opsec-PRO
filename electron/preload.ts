import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  loginAttempt: (data: { token: string; rememberMe: boolean }) => ipcRenderer.invoke('login-attempt', data),
  logout: () => ipcRenderer.send('logout'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send(action),
  onLog: (callback: (log: any) => void) => {
    const listener = (_: any, log: any) => callback(log);
    ipcRenderer.on('bot-log', listener);
    return () => ipcRenderer.removeListener('bot-log', listener);
  },
  startPurge: (data: { channelId: string; amount: number; purgeAll: boolean; delay: number }) => ipcRenderer.invoke('start-purge', data),
  stopPurge: () => ipcRenderer.invoke('stop-purge'),
  getChannels: () => ipcRenderer.invoke('get-channels'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  onAutoLogin: (callback: (user: any) => void) => ipcRenderer.on('auto-login-success', (_, user) => callback(user)),
  onAutoLoginError: (callback: (error: string) => void) => ipcRenderer.on('auto-login-error', (_, err) => callback(err)),
  leaveAllGroups: (ids?: string[], silent?: boolean) => ipcRenderer.invoke('leave-all-groups', ids, silent),
  deleteAllFriends: (ids?: string[]) => ipcRenderer.invoke('delete-all-friends', ids),
  getFriendsList: () => ipcRenderer.invoke('get-friends-list'),
  getGroupsList: () => ipcRenderer.invoke('get-groups-list'),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  selectAccount: (id: string | number) => ipcRenderer.invoke('select-account', id),
  removeAccount: (id: string | number) => ipcRenderer.invoke('remove-account', id),
  selectFile: () => ipcRenderer.invoke('select-file'),
  dmAllFriends: (data: { message: string }) => ipcRenderer.invoke('dm-all-friends', data),
  startSpam: (data: { channelIds: string[]; texts: string[]; delay: number; jitter?: boolean; maxMessages?: number; proxies?: string[] }) => ipcRenderer.invoke('start-spam', data),
  stopSpam: () => ipcRenderer.invoke('stop-spam'),
  stopDMAll: () => ipcRenderer.invoke('stop-dm-all'),
  stopSanitizer: () => ipcRenderer.invoke('stop-sanitizer'),
  setVoiceStalker: (data: { userId: string | null }) => ipcRenderer.invoke('set-voice-stalker', data),
  loginViaDiscord: () => ipcRenderer.invoke('login-via-discord'),
  toggleSpotifyLyrics: (data: { enabled: boolean; cookie?: string }) => ipcRenderer.invoke('toggle-spotify-lyrics', data),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  
  // Stats & Dashboard Pro
  getCommandsCount: (userId: string) => ipcRenderer.invoke('get-commands-count', userId),
  incrementCommand: (userId: string) => ipcRenderer.invoke('increment-command', userId),
  jumpToMessage: (messageId: string) => ipcRenderer.invoke('jump-to-message', messageId),

  // Profile Rotator PRO
  toggleRotator: (config: any) => ipcRenderer.invoke('toggle-animation', config),
  forceRotatorUpdate: () => ipcRenderer.invoke('force-rotator-update'),
  onRotatorPulse: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('rotator-pulse', listener);
    return () => ipcRenderer.removeListener('rotator-pulse', listener);
  },
  
  // Wallpaper & Theme
  wallpaperUpload: (filePath?: string) => ipcRenderer.invoke('wallpaper:upload', filePath),
  wallpaperReset: () => ipcRenderer.invoke('wallpaper:reset'),
  
  // Dev Credits
  getDevAvatar: () => ipcRenderer.invoke('get-dev-avatar'),

  // V1.2.0 Automation & Farmer
  getFarmerStatus: () => ipcRenderer.invoke('get-farmer-status'),
  closeAllDMs: () => ipcRenderer.invoke('close-all-dms'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
});
