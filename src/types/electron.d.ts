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
      getSettings: () => Promise<IPCResponse<AppSettings>>;
      saveSettings: (settings: any) => Promise<IPCResponse<void>>;
      onAutoLogin: (callback: (user: UserProfile) => void) => void;
      onAutoLoginError: (callback: (error: string) => void) => void;
      leaveAllGroups: (ids?: string[], silent?: boolean) => Promise<IPCResponse<{ count: number }>>;
      deleteAllFriends: (ids?: string[]) => Promise<IPCResponse<{ count: number }>>;
      getFriendsList: () => Promise<IPCResponse<any[]>>;
      getGroupsList: () => Promise<IPCResponse<any[]>>;
      getAccounts: () => Promise<IPCResponse<any[]>>;
      selectAccount: (id: string | number) => Promise<IPCResponse<{ user: UserProfile }>>;
      removeAccount: (id: string | number) => Promise<IPCResponse<void>>;
      selectFile: () => Promise<IPCResponse<string>>;
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
    };
  }
}
