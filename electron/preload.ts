import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkAuth: (data?: { licenseKey?: string }) => ipcRenderer.invoke('check-auth', data),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdateAndQuit: (url?: string) => ipcRenderer.invoke('install-update-and-quit', url),
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
  startPurgeServer: (data: { serverId: string; amount: number; purgeAll: boolean; delay: number }) => ipcRenderer.invoke('start-purge-server', data),
  stopPurge: () => ipcRenderer.invoke('stop-purge'),
  getChannels: (accountIds?: string[]) => ipcRenderer.invoke('get-channels', accountIds),
  resolveIds: (ids: string[]) => ipcRenderer.invoke('resolve-ids', ids),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
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
  dmAllFriends: (data: { message: string; target?: 'all' | 'friends' | 'groups'; delay?: number; pauseInterval?: number; pauseDuration?: number }) => ipcRenderer.invoke('dm-all-friends', data),
  startSpam: (data: {
    channelIds: string[];
    texts: string[];
    delay: number;
    jitter?: boolean;
    maxMessages?: number;
    proxies?: string[];
    accounts?: any[];
    replyMode?: boolean;
    uiPhrases?: string;
    uiSelectedTargets?: any[];
    uiSelectedAccounts?: string[];
    uiBigTextMode?: boolean;
    uiSniperMode?: boolean;
    uiSniperId?: string;
    uiSpamSingleMessage?: boolean;
  }) => ipcRenderer.invoke('start-spam', data),
  stopSpam: () => ipcRenderer.invoke('stop-spam'),
  getSpamStatus: () => ipcRenderer.invoke('get-spam-status'),
  stopDMAll: () => ipcRenderer.invoke('stop-dm-all'),
  stopSanitizer: () => ipcRenderer.invoke('stop-sanitizer'),
  toggleSpotifyLyrics: (data: { enabled: boolean; cookie?: string; config?: any }) => ipcRenderer.invoke('toggle-spotify-lyrics', data),
  getSpotifyLiveStatus: () => ipcRenderer.invoke('get-spotify-live-status'),
  getCustomLyricsList: () => ipcRenderer.invoke('get-custom-lyrics-list'),
  saveCustomLyrics: (data: { artist: string; title: string; content: string }) => ipcRenderer.invoke('save-custom-lyrics', data),
  deleteCustomLyrics: (fileName: string) => ipcRenderer.invoke('delete-custom-lyrics', fileName),
  saveSpotifyConfig: (config: any) => ipcRenderer.invoke('save-spotify-config', config),
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
  
  // Cursor Import (auto-resize)
  cursorImport: () => ipcRenderer.invoke('cursor:import'),
  


  // V1.2.0 Automation & Farmer
  getFarmerStatus: () => ipcRenderer.invoke('get-farmer-status'),
  closeAllDMs: () => ipcRenderer.invoke('close-all-dms'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),

  // V1.2.1 Pomelo Sniper
  checkPomelo: (data: { username: string, botToken?: string }) => ipcRenderer.invoke('pomelo:check', data),
  claimPomelo: (data: { username: string, password?: string }) => ipcRenderer.invoke('pomelo:claim', data),
  startPomeloBatch: (data: { usernames: string[], delay?: number, autoClaim?: boolean, password?: string, botToken?: string, generator?: string }) => ipcRenderer.invoke('pomelo:start-batch', data),
  stopPomeloBatch: () => ipcRenderer.invoke('pomelo:stop-batch'),
  getPomeloStatus: () => ipcRenderer.invoke('pomelo:get-status'),
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
  startGroupRename: (data: { channelId: string, names: string[], delay: number, accounts: any[] }) => ipcRenderer.invoke('group:start-rename', data),
  stopGroupRename: () => ipcRenderer.invoke('group:stop-rename'),
  groupRenameStatus: () => ipcRenderer.invoke('group:rename-status'),
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
  batchValidateTokens: (data: { tokens: string[]; rememberMe: boolean }) => ipcRenderer.invoke('batch-validate-tokens', data),
  checkCapMonsterKey: (key: string) => ipcRenderer.invoke('capmonster:check-key', key),
  checkTwoCaptchaKey: (key: string) => ipcRenderer.invoke('2captcha:check-key', key),
  checkAntiCaptchaKey: (key: string) => ipcRenderer.invoke('anticaptcha:check-key', key),
  checkCapsolverKey: (key: string) => ipcRenderer.invoke('capsolver:check-key', key),
  checkNoCaptchaAIKey: (key: string) => ipcRenderer.invoke('nocaptchaai:check-key', key),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  autoJoinServers: (data: { inviteLink: string; delay?: number }) => ipcRenderer.invoke('auto-join-servers', data),
  stopAutoJoin: () => ipcRenderer.invoke('stop-auto-join'),
  getAutoJoinStatus: () => ipcRenderer.invoke('get-auto-join-status'),
  testProxies: (proxyList: string[]) => ipcRenderer.invoke('test-proxies', proxyList),

  // Last Word (Cardio Duel)
  startLastWord: (config: any) => ipcRenderer.invoke('lastword:start', config),
  stopLastWord: () => ipcRenderer.invoke('lastword:stop'),
  getLastWordStatus: () => ipcRenderer.invoke('lastword:get-status'),
  onLastWordReply: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('lastword-reply', sub);
    return () => ipcRenderer.removeListener('lastword-reply', sub);
  },
  onLastWordDuelWon: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('lastword-duel-won', sub);
    return () => ipcRenderer.removeListener('lastword-duel-won', sub);
  },

  // In-Chat Command Dispatcher
  inChatToggle: (enabled: boolean) => ipcRenderer.invoke('inchat:toggle', enabled),
  inChatSetPrefix: (prefix: string) => ipcRenderer.invoke('inchat:set-prefix', prefix),
  inChatGetStatus: () => ipcRenderer.invoke('inchat:get-status'),

  // Server Cloner & Backup Suite
  backupCreate: (guildId: string) => ipcRenderer.invoke('backup:create', guildId),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupLoad: (fileName: string) => ipcRenderer.invoke('backup:load', fileName),
  backupClone: (data: { backup: any; targetGuildId: string; clearExisting?: boolean; delayMs?: number }) => ipcRenderer.invoke('backup:clone', data),

  // Vanity URL Sniper
  vanityStart: (data: { targetGuildId: string; vanityCode?: string; vanityCodes?: string[]; delayMs?: number; botTokens?: string[]; webhookUrl?: string; gatewayListen?: boolean }) => ipcRenderer.invoke('vanity:start', data),
  vanityStop: () => ipcRenderer.invoke('vanity:stop'),
  vanityStatus: () => ipcRenderer.invoke('vanity:status'),
  vanityCheckGuild: (guildId: string) => ipcRenderer.invoke('vanity:check-guild', guildId),

  // Message Snipe & Logger
  snipeGet: (channelId: string, index?: number) => ipcRenderer.invoke('snipe:get', { channelId, index }),
  snipeGetEdit: (channelId: string, index?: number) => ipcRenderer.invoke('snipe:get-edit', { channelId, index }),

  // Stealth & Anti-Detection
  stealthGetBuildNumber: () => ipcRenderer.invoke('stealth:get-build-number'),
  stealthGetHeaders: () => ipcRenderer.invoke('stealth:get-headers'),

  // Voice Channel Audio Streamer
  voiceJoin: (channelId: string) => ipcRenderer.invoke('voice:join', channelId),
  voiceLeave: () => ipcRenderer.invoke('voice:leave'),
  voicePlay: (source: string) => ipcRenderer.invoke('voice:play', source),
  voiceStop: () => ipcRenderer.invoke('voice:stop'),
  voiceStatus: () => ipcRenderer.invoke('voice:status'),
  voiceSetVolume: (volume: number) => ipcRenderer.invoke('voice:set-volume', volume),

  // Macro & Scenarios Engine
  macroList: () => ipcRenderer.invoke('macro:list'),
  macroSave: (macro: any) => ipcRenderer.invoke('macro:save', macro),
  macroDelete: (macroId: string) => ipcRenderer.invoke('macro:delete', macroId),
  macroExecute: (macroId: string) => ipcRenderer.invoke('macro:execute', macroId),
  macroCancel: () => ipcRenderer.invoke('macro:cancel'),
  macroRestoreSnapshot: () => ipcRenderer.invoke('macro:restore-snapshot'),
  auditGetHistory: (level?: string) => ipcRenderer.invoke('audit:get-history', level),
});
