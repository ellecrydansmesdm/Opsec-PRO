import { UserProfile, LogEntry, AppSettings } from '../../shared/types';
import { IPCResponse } from '../../shared/ipc-types';

declare global {
  interface Window {
    electronAPI: {
      checkAuth: (data?: { licenseKey: string }) => Promise<IPCResponse<{ authenticated: boolean; user?: UserProfile; requireLicense?: boolean; savedKey?: string }>>;
      checkForUpdates: () => Promise<{ updateAvailable: boolean; currentVersion: string; latestVersion: string; downloadUrl?: string; releaseNotes?: string; publishedAt?: string }>;
      installUpdateAndQuit: (downloadUrl?: string) => Promise<IPCResponse<void>>;
      loginAttempt: (data: { token: string; rememberMe: boolean }) => Promise<IPCResponse<{ user: UserProfile }>>;
      logout: () => void;
      getUserData: () => Promise<IPCResponse<UserProfile | null>>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
      onLog: (callback: (log: LogEntry) => void) => () => void;
      startPurge: (data: { channelId: string; amount: number; purgeAll: boolean; delay: number }) => Promise<IPCResponse<void>>;
      startPurgeServer: (data: { serverId: string; amount: number; purgeAll: boolean; delay: number }) => Promise<IPCResponse<void>>;
      stopPurge: () => Promise<IPCResponse<void>>;
      getChannels: (accountIds?: string[]) => Promise<IPCResponse<{ servers: any[], dms: any[] }>>;
      resolveIds: (ids: string[]) => Promise<IPCResponse<Record<string, { name: string; icon?: string; type: string }>>>;
      getSettings: () => Promise<IPCResponse<AppSettings>>;
      saveSettings: (settings: any) => Promise<IPCResponse<void>>;
      resetSettings: () => Promise<IPCResponse<AppSettings>>;
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
      batchValidateTokens: (data: { tokens: string[]; rememberMe: boolean }) => Promise<IPCResponse<{ results: { token: string; user?: any; error?: string }[] }>>;
      toggleRotator: (config: any) => Promise<IPCResponse<void>>;
      dmAllFriends: (data: { message: string; target?: 'all' | 'friends' | 'groups'; delay?: number; pauseInterval?: number; pauseDuration?: number }) => Promise<IPCResponse<{ count: number }>>;
      stopDMAll: () => Promise<IPCResponse<void>>;
      stopSanitizer: () => Promise<IPCResponse<void>>;
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
      }) => Promise<IPCResponse<void>>;
      stopSpam: () => Promise<IPCResponse<void>>;
      getSpamStatus: () => Promise<IPCResponse<{ running: boolean; count: number; config?: any }>>;
      loginViaDiscord: () => Promise<IPCResponse<{ token: string }>>;
      toggleSpotifyLyrics: (data: { enabled: boolean; cookie?: string; config?: Partial<SpotifyConfig> }) => Promise<IPCResponse<{ success: boolean }>>;
      getSpotifyLiveStatus: () => Promise<SpotifyLiveStatus>;
      getCustomLyricsList: () => Promise<Array<{ fileName: string; artist: string; title: string; size: number; updatedAt: number }>>;
      saveCustomLyrics: (data: { artist: string; title: string; content: string }) => Promise<IPCResponse<boolean>>;
      deleteCustomLyrics: (fileName: string) => Promise<IPCResponse<boolean>>;
      saveSpotifyConfig: (config: Partial<SpotifyConfig>) => Promise<IPCResponse<boolean>>;
      openExternal: (url: string) => Promise<IPCResponse<{ success: boolean }>>;
      showMessageBox: (options: any) => Promise<any>;
      closeAllDMs: () => Promise<IPCResponse<{ count: number }>>;
      getFarmerStatus: () => Promise<IPCResponse<{ status: 'idle' | 'connected'; uptime: number; startTime: number | null }>>;
      clearLogs: () => Promise<IPCResponse<void>>;
      forceRotatorUpdate: () => Promise<IPCResponse<void>>;

      // V1.2.1 Pomelo Sniper
      checkPomelo: (data: { username: string; botToken?: string }) => Promise<IPCResponse<{ available: boolean; status: 'available' | 'taken' | 'ghost' | 'owned'; firstSeen?: number; reason?: string }>>;
      claimPomelo: (data: { username: string; password?: string }) => Promise<IPCResponse<{ username: string }>>;
      startPomeloBatch: (data: { usernames: string[]; delay?: number; autoClaim?: boolean; password?: string; botToken?: string; generator?: string }) => Promise<IPCResponse<{ found: number; claimed?: string }>>;
      stopPomeloBatch: () => Promise<IPCResponse<void>>;
      getPomeloStatus: () => Promise<IPCResponse<{ running: boolean }>>;
      onPomeloUpdate: (callback: (data: { username: string; status: 'taken' | 'available' }) => void) => () => void;
      
      onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void;
      
      // Additional PRO Features
      getCommandsCount: (userId: string) => Promise<IPCResponse<{ count: number }>>;
      incrementCommand: (userId: string) => Promise<IPCResponse<void>>;
      jumpToMessage: (messageId: string) => Promise<IPCResponse<void>>;
      onRotatorPulse: (callback: (data: any) => void) => () => void;
      wallpaperUpload: (filePath?: string) => Promise<IPCResponse<{ success: boolean; path: string }>>;
      wallpaperReset: () => Promise<IPCResponse<void>>;
      cursorImport: () => Promise<IPCResponse<string> & { resized?: boolean; originalSize?: string }>;

      // Group Pro & Sentinel Duo
      startGroupRename: (data: { channelId: string, names: string[], delay: number, accounts: any[] }) => Promise<IPCResponse<void>>;
      stopGroupRename: () => Promise<IPCResponse<void>>;
      groupRenameStatus: () => Promise<IPCResponse<{ active: boolean; channelId: string | null; names: string[]; delay: number; accountIds: string[] }>>;
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
      checkTwoCaptchaKey: (key: string) => Promise<IPCResponse<{ balance: number }>>;
      checkAntiCaptchaKey: (key: string) => Promise<IPCResponse<{ balance: number }>>;
      checkCapsolverKey: (key: string) => Promise<IPCResponse<{ balance: number }>>;
      checkNoCaptchaAIKey: (key: string) => Promise<IPCResponse<{ balance: number }>>;
      getDiagnostics: () => Promise<IPCResponse<any>>;
      autoJoinServers: (data: { inviteLink: string; delay?: number }) => Promise<IPCResponse<{ results: { username: string; status: string; message?: string }[]; total: number; hasCaptchaKey: boolean }>>;
      stopAutoJoin: () => Promise<IPCResponse<void>>;
      getAutoJoinStatus: () => Promise<IPCResponse<{ running: boolean }>>;

      // Last Word (Cardio Duel)
      startLastWord: (config: any) => Promise<IPCResponse<void>>;
      stopLastWord: () => Promise<IPCResponse<void>>;
      getLastWordStatus: () => Promise<IPCResponse<{ running: boolean; responseCount: number; targetChannelId: string | null; lastOpponentMessageTime: number }>>;
      onLastWordReply: (callback: (data: { count: number; author: string; content: string; time: string }) => void) => () => void;
      onLastWordDuelWon: (callback: (data: { count: number }) => void) => () => void;

      testProxies: (proxyList: string[]) => Promise<IPCResponse<{ proxy: string; status: 'online' | 'dead' | 'error'; latencyMs?: number; error?: string }[]>>;

      // In-Chat Command Dispatcher
      inChatToggle: (enabled: boolean) => Promise<IPCResponse<{ enabled: boolean }>>;
      inChatSetPrefix: (prefix: string) => Promise<IPCResponse<{ prefix: string }>>;
      inChatGetStatus: () => Promise<IPCResponse<{ enabled: boolean; prefix: string }>>;

      // Server Cloner & Backup Suite
      backupCreate: (guildId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      backupList: () => Promise<{ success: boolean; data: any[] }>;
      backupLoad: (fileName: string) => Promise<{ success: boolean; data?: any }>;
      backupClone: (data: { backup: any; targetGuildId: string; clearExisting?: boolean; delayMs?: number }) => Promise<{ success: boolean; error?: string }>;

      // Vanity URL Sniper
      vanityStart: (data: { targetGuildId: string; vanityCode?: string; vanityCodes?: string[]; delayMs?: number; botTokens?: string[]; webhookUrl?: string; gatewayListen?: boolean }) => Promise<{ success: boolean; error?: string }>;
      vanityStop: () => Promise<{ success: boolean }>;
      vanityStatus: () => Promise<{ success: boolean; data: any }>;
      vanityCheckGuild: (guildId: string) => Promise<{ success: boolean; data: { eligible: boolean; name?: string; reason?: string } }>;

      // Message Snipe & Logger
      snipeGet: (channelId: string, index?: number) => Promise<{ success: boolean; data: any }>;
      snipeGetEdit: (channelId: string, index?: number) => Promise<{ success: boolean; data: any }>;

      // Stealth & Anti-Detection
      stealthGetBuildNumber: () => Promise<{ success: boolean; buildNumber: number }>;
      stealthGetHeaders: () => Promise<{ success: boolean; headers: Record<string, string>; superProps: any }>;

      // Voice Channel Audio Streamer
      voiceJoin: (channelId: string) => Promise<{ success: boolean; error?: string }>;
      voiceLeave: () => Promise<{ success: boolean }>;
      voicePlay: (source: string) => Promise<{ success: boolean; error?: string }>;
      voiceStop: () => Promise<{ success: boolean }>;
      voiceStatus: () => Promise<{ success: boolean; data: { connected: boolean; channelId: string | null; channelName: string | null; guildName: string | null; playing: boolean; currentTrack: string | null; volume: number } }>;
      voiceSetVolume: (volume: number) => Promise<{ success: boolean }>;

      // Macro & Scenarios Engine
      macroList: () => Promise<{ success: boolean; data: any[] }>;
      macroSave: (macro: any) => Promise<{ success: boolean; data?: any }>;
      macroDelete: (macroId: string) => Promise<{ success: boolean }>;
      macroExecute: (macroId: string) => Promise<{ success: boolean; error?: string }>;
      macroCancel: () => Promise<{ success: boolean }>;
      macroRestoreSnapshot: () => Promise<{ success: boolean; error?: string }>;
      auditGetHistory: (level?: string) => Promise<{ success: boolean; data: any[] }>;
    };
  }
}
