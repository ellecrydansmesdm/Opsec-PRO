import { UserProfile, LogEntry, AppSettings } from '../../shared/types';
import { IPCResponse } from '../../shared/ipc-types';

declare global {
  interface Window {
    electronAPI: {
      checkAuth: () => Promise<IPCResponse<{ authenticated: boolean; user?: UserProfile }>>;
      loginAttempt: (data: { token: string; rememberMe: boolean }) => Promise<IPCResponse<{ user: UserProfile }>>;
      logout: () => void;
      getUserData: () => Promise<IPCResponse<UserProfile | null>>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
      onLog: (callback: (log: LogEntry) => void) => () => void;
      startPurge: (data: { channelId: string; amount: number; purgeAll: boolean; delay: number }) => Promise<IPCResponse<void>>;
      stopPurge: () => Promise<IPCResponse<void>>;
      getChannels: () => Promise<IPCResponse<{ servers: any[], dms: any[] }>>;
      resolveIds: (ids: string[]) => Promise<IPCResponse<Record<string, { name: string; icon?: string; type: string }>>>;
      getSettings: () => Promise<IPCResponse<AppSettings>>;
      saveSettings: (settings: any) => Promise<IPCResponse<void>>;
      onAutoLogin: (callback: (user: UserProfile) => void) => () => void;
      onAutoLoginError: (callback: (error: string) => void) => () => void;
      leaveAllGroups: (ids?: string[], silent?: boolean) => Promise<IPCResponse<{ count: number }>>;
      deleteAllFriends: (ids?: string[]) => Promise<IPCResponse<{ count: number }>>;
      getFriendsList: () => Promise<IPCResponse<any[]>>;
      getGroupsList: () => Promise<IPCResponse<any[]>>;
      getServersList: () => Promise<IPCResponse<any[]>>;
      getAccounts: () => Promise<IPCResponse<any[]>>;
      selectAccount: (id: string | number) => Promise<IPCResponse<{ user: UserProfile }>>;
      removeAccount: (id: string | number) => Promise<IPCResponse<void>>;
      leaveAllServers: (ids?: string[]) => Promise<IPCResponse<{ count: number }>>;
      selectFile: () => Promise<IPCResponse<string>>;
      selectTokenFile: () => Promise<IPCResponse<string>>;
      toggleAnimation: (anim: any) => Promise<IPCResponse<void>>;
      dmAllFriends: (data: { message: string }) => Promise<IPCResponse<{ count: number }>>;
      stopDMAll: () => Promise<IPCResponse<void>>;
      stopSanitizer: () => Promise<IPCResponse<void>>;
      startSpam: (data: { channelIds: string[]; texts: string[]; delay: number; jitter?: boolean; maxMessages?: number; proxies?: string[] }) => Promise<IPCResponse<void>>;
      stopSpam: () => Promise<IPCResponse<void>>;
      setVoiceStalker: (data: { channelId?: string | null; userId?: string | null }) => Promise<IPCResponse<void>>;
      loginViaDiscord: () => Promise<IPCResponse<{ token: string }>>;
      toggleSpotifyLyrics: (data: { enabled: boolean; cookie?: string }) => Promise<IPCResponse<{ success: boolean }>>;
      openExternal: (url: string) => Promise<IPCResponse<{ success: boolean }>>;
      showMessageBox: (options: any) => Promise<any>;
      closeAllDMs: () => Promise<IPCResponse<{ count: number }>>;
      getFarmerStatus: () => Promise<IPCResponse<{ voice: any; xp: any; autoResponder: any }>>;
      clearLogs: () => Promise<IPCResponse<void>>;
      forceRotatorUpdate: () => Promise<IPCResponse<void>>;

      // V1.2.1 Pomelo Sniper
      checkPomelo: (username: string) => Promise<IPCResponse<{ available: boolean; status: 'available' | 'taken' | 'ghost' | 'owned'; firstSeen?: number; reason?: string }>>;
      claimPomelo: (data: { username: string; password?: string }) => Promise<IPCResponse<{ username: string }>>;
      startPomeloBatch: (data: { usernames: string[]; delay?: number; autoClaim?: boolean; password?: string }) => Promise<IPCResponse<{ found: number; claimed?: string }>>;
      stopPomeloBatch: () => Promise<IPCResponse<void>>;
      onPomeloUpdate: (callback: (data: { username: string; status: 'taken' | 'available' }) => void) => () => void;
      
      onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void;
      
      // Additional PRO Features
      getCommandsCount: (userId: string) => Promise<IPCResponse<{ count: number }>>;
      incrementCommand: (userId: string) => Promise<IPCResponse<void>>;
      jumpToMessage: (messageId: string) => Promise<IPCResponse<void>>;
      onRotatorPulse: (callback: (data: any) => void) => () => void;
      wallpaperUpload: (filePath?: string) => Promise<IPCResponse<{ success: boolean; path: string }>>;
      wallpaperReset: () => Promise<IPCResponse<void>>;
      getDevAvatar: () => Promise<IPCResponse<string>>;

      // Group Pro & Sentinel Duo
      startGroupRename: (data: { channelId: string, names: string[], delay: number }) => Promise<IPCResponse<void>>;
      stopGroupRename: () => Promise<IPCResponse<void>>;
      startSentinel: (data: { partnerToken: string, groupIds: string[], groupLinks?: {[key: string]: string} }) => Promise<IPCResponse<void>>;
      stopSentinel: () => Promise<IPCResponse<void>>;
      sentinelStatus: () => Promise<IPCResponse<any>>;
      toggleSentinelShield: (groupId: string, active: boolean) => Promise<IPCResponse<void>>;
      cloneGroup: (groupId: string) => Promise<IPCResponse<void>>;
      massAddRecipients: (groupId: string, userIds: string[], delay: number) => Promise<IPCResponse<void>>;
      logInfo: (message: string, type?: 'info' | 'success' | 'error') => Promise<IPCResponse<void>>;
      setHypeSquadBadge: (houseId: number) => Promise<IPCResponse<void>>;
      startAutoVote: (data: { messageId: string, channelId: string, emoji: string, accounts: any[] }) => Promise<IPCResponse<void>>;
      checkCapMonsterKey: (key: string) => Promise<IPCResponse<{ balance: number }>>;
    };
  }
}
