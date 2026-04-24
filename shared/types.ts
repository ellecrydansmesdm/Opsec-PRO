// shared/types.ts

export interface UserActivity {
  name: string;
  type: number;
  details?: string;
  state?: string;
}

export interface CustomRPC {
  applicationId?: string; // App ID for logos
  name: string;           // Display Name
  type: number;           // Playing, Watching, etc.
  details?: string;       // Line 1
  state?: string;         // Line 2
  largeImage?: string;    // URL or Asset Key
  largeText?: string;     // Hover Text
  smallImage?: string;    // URL or Asset Key
  smallText?: string;     // Hover Text
  showTimestamp: boolean; // Show elapsed time
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string; // Global Name Discord
  tag: string;
  avatarURL: string;
  bannerURL?: string;
  nitro: boolean;
  badges: string[];
  activities: UserActivity[];
  platform: string;
  nitroExpiry?: string;
  uptime: number;
  guildsCount: number;
  friendsCount: number;
}

export interface LogEntry {
  msg: string;
  type: 'info' | 'success' | 'error';
  time: string;
  messageId?: string; // For Jump functionality
}

export interface RotatorConfig {
  enabled: boolean;
  interval: number; // in seconds
  statuses: string[];
  bios: string[];
  usernames: string[];
  customRPCs: CustomRPC[]; // PRO Custom RPC Engine
  activities: string[];    // Legacy (kept for fallback)
  clanTags: string[]; 
  currentStatusIndex: number;
  currentBioIndex: number;
  currentUsernameIndex: number;
  currentActivityIndex: number;
  currentClanTagIndex: number;
  enabledSections: {
    status: boolean;
    bio: boolean;
    username: boolean;
    activity: boolean;
    clanTag: boolean;
  };
  hypesquadHouse: number; // 0: None, 1: Bravery, 2: Brilliance, 3: Balance
  stats: {
    messagesToday: number;
    totalMessages: number;
    lastStatsReset?: number;
  };
  totalRotations: number;
  lastRotationTime?: number;
  pausedUsernameUntil?: number; // timestamp for 429 backoff
}

export interface Account {
  id: string;
  token: string;
  username: string;
  tag: string;
  avatarURL: string;
  selected: boolean;
  guildsData?: any[];
  rotator?: RotatorConfig;
}

export interface AppSettings {
  autoLogin: boolean;
  silentMode: boolean;
  privateMode: boolean; // Hide "Opsec Pro" from bio/status
  language: 'fr' | 'en';
  adminPurge: boolean;
  purgeDelay: number;
  spotifyCookie?: string;
  spotifyLyricsEnabled?: boolean;
  // Opsec PRO 2.0 Theme
  themeBackground?: string;
  themeBlur: number;
  themeOpacity: number;
  allowActiveAppDetection: boolean;
  // Automation Configs
  farmerConfig?: FarmerConfig;
  responderConfig?: ResponderConfig;
  // Audio Config
  audioVolume: number; // 0 to 1
  audioEnabled: boolean;
  cyberCursorEnabled: boolean;
  customCursorUrl?: string; // New: Custom cursor support
  // Multi-account
  accounts: Account[];
  // Sentinel Mode (Anti-Kick)
  sentinelEnabled: boolean;
  // Account memory
  lastActiveAccountId?: string;
  // Advanced Automation
  automationConfig?: AutomationConfig;
}

export interface AutomationConfig {
  autoReport: {
    enabled: boolean;
    targetUserId: string;
    targetGuildId?: string; // Optional: restrict to a specific server
    floodLimit: number; // messages per minute
    insultKeywords: string[];
    useRegex?: boolean; // New: support regex for keywords
    historyScanDepth?: number; // New: how many messages to analyze in history
    reportCategory: number[]; // breadcrumbs [3, 28, 72]
  };
  nitroSniper: {
    enabled: boolean;
    priorityMain: boolean;
  };
  giveawayJoiner: {
    enabled: boolean;
    delay: number; // jitter delay in ms
  };
  capMonsterKey?: string;
}

export interface FarmerConfig {
  enabled: boolean;
  vocalHopper: {
    enabled: boolean;
    channelIds: string[];
    interval: number; // in minutes
    jitter: boolean;
  };
  messageFarmer: {
    enabled: boolean;
    channelIds: string[];
    phrases: string[];
    delay: number; // in seconds
  };
  stealthMode: boolean;
  startTime?: number;
}

export interface ResponderConfig {
  enabled: boolean;
  afkOnly: boolean; // Only reply if Farmer/Rotator is active
  dmOnly: boolean;
  rules: {
    trigger: string;
    replies: string[];
  }[];
}
