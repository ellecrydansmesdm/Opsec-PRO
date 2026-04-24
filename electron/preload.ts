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
  resolveIds: (ids: string[]) => ipcRenderer.invoke('resolve-ids', ids),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  onAutoLogin: (callback: (user: any) => void) => {
    const listener = (_: any, user: any) => callback(user);
    ipcRenderer.on('auto-login-success', listener);
    return () => ipcRenderer.removeListener('auto-login-success', listener);
  },
  onAutoLoginError: (callback: (error: string) => void) => {
    const listener = (_: any, err: string) => callback(err);
    ipcRenderer.on('auto-login-error', listener);
    return () => ipcRenderer.removeListener('auto-login-error', listener);
  },
  leaveAllGroups: (ids?: string[], silent?: boolean) => ipcRenderer.invoke('leave-all-groups', ids, silent),
  deleteAllFriends: (ids?: string[]) => ipcRenderer.invoke('delete-all-friends', ids),
  getFriendsList: () => ipcRenderer.invoke('get-friends-list'),
  getGroupsList: () => ipcRenderer.invoke('get-groups-list'),
  getServersList: () => ipcRenderer.invoke('get-servers-list'),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  selectAccount: (id: string | number) => ipcRenderer.invoke('select-account', id),
  removeAccount: (id: string | number) => ipcRenderer.invoke('remove-account', id),
  leaveAllServers: (ids?: string[]) => ipcRenderer.invoke('leave-all-servers', ids),
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

  // V1.2.1 Pomelo Sniper
  checkPomelo: (username: string) => ipcRenderer.invoke('pomelo:check', username),
  claimPomelo: (data: { username: string, password?: string }) => ipcRenderer.invoke('pomelo:claim', data),
  startPomeloBatch: (data: { usernames: string[], delay?: number, autoClaim?: boolean, password?: string }) => ipcRenderer.invoke('pomelo:start-batch', data),
  stopPomeloBatch: () => ipcRenderer.invoke('pomelo:stop-batch'),
  onPomeloUpdate: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('pomelo-update', listener);
    return () => ipcRenderer.removeListener('pomelo-update', listener);
  },
  onSettingsUpdated: (callback: (settings: any) => void) => {
    const listener = (_: any, settings: any) => callback(settings);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  },

  // Group Pro & Sentinel Duo
  startGroupRename: (data: { channelId: string, names: string[], delay: number }) => ipcRenderer.invoke('group:start-rename', data),
  stopGroupRename: () => ipcRenderer.invoke('group:stop-rename'),
  startSentinel: (data: { partnerToken: string, groupIds: string[], groupLinks?: {[key: string]: string} }) => ipcRenderer.invoke('sentinel:start', data),
  stopSentinel: () => ipcRenderer.invoke('sentinel:stop'),
  sentinelStatus: () => ipcRenderer.invoke('sentinel:status'),
  toggleSentinelShield: (groupId: string, active: boolean) => ipcRenderer.invoke('sentinel:toggle-shield', { groupId, active }),
  cloneGroup: (groupId: string) => ipcRenderer.invoke('group:clone', { groupId }),
  massAddRecipients: (groupId: string, userIds: string[], delay: number) => ipcRenderer.invoke('group:mass-add', { groupId, userIds, delay }),
  logInfo: (message: string, type?: 'info' | 'success' | 'error') => ipcRenderer.invoke('log:info', { message, type }),
  setHypeSquadBadge: (houseId: number) => ipcRenderer.invoke('hypersquad:set', { houseId }),
  startAutoVote: (data: { messageId: string, channelId: string, emoji: string, accounts: any[] }) => ipcRenderer.invoke('start-auto-vote', data),
  selectTokenFile: () => ipcRenderer.invoke('select-token-file'),
  checkCapMonsterKey: (key: string) => ipcRenderer.invoke('capmonster:check-key', key),
});
