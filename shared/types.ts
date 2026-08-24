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
  startTimestamp?: number;
  buttons?: Array<{ label: string; url: string }>; // Clickable Discord profile buttons
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string; // Global Name Discord
  tag: string;
  avatarURL: string;
  bannerURL?: string;
  bannerColor?: string;
  accentColor?: number;
  bio?: string;
  nitro: boolean;
  badges: string[];
  publicFlags?: number;
  premiumType?: number | null;
  premiumSince?: string | null;
  premiumGuildSince?: string | null;
  legacyUsername?: string | null;
  profileBadges?: Array<{ id: string; description?: string; icon?: string; link?: string }>;
  activities: UserActivity[];
  platform: string;
  status: string;
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
  proxy?: string; // Proxy format: http://ip:port or socks5://user:pass@ip:port
  notes?: string;
  guildsData?: any[];
  rotator?: RotatorConfig;
}

export interface AppSettings {
  autoLogin: boolean;
  licenseKey?: string;       // Stored license key validated against Firebase
  licenseValidated?: boolean; // Whether license was validated successfully
  silentMode: boolean;
  privateMode: boolean; // Hide "Opsec Pro" from bio/status
  language: 'fr' | 'en';
  adminPurge: boolean;
  purgeDelay: number;
  spotifyCookie?: string;
  spotifyLyricsEnabled?: boolean;
  spotifyConfig?: SpotifyConfig;
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
  nitroStartDate?: string | null;
  boostStartDate?: string | null;
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
  twoCaptchaKey?: string;
  antiCaptchaKey?: string;
  capsolverKey?: string;
  noCaptchaAIKey?: string;
  proxyEnabled?: boolean;
  proxyType?: 'http' | 'socks4' | 'socks5';
  proxyList?: string[];
}

export interface FarmerConfig {
  enabled: boolean;
  selectedAccountIds?: string[];
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

export interface ResponderRule {
  trigger: string;
  replies: string[];
  matchingMode?: 'contains' | 'exact' | 'regex';
  action?: 'reply' | 'react' | 'both';
  emoji?: string;
  replyWithPing?: boolean;
  delay?: number; // custom delay in seconds
}

export interface ResponderConfig {
  enabled: boolean;
  afkOnly: boolean; // Only reply if Farmer/Rotator is active
  dmOnly: boolean;
  rules: ResponderRule[];
}

export interface SpotifyConfig {
  enabled: boolean;
  prefix: string; // e.g. "🎵 " | "🎶 " | "[ {lyrics} ]" | "« {lyrics} »" | ""
  offsetMs: number; // -3000 to +3000, default +800
  fallbackMode: 'song_info' | 'clear' | 'custom';
  customFallback: string;
  showInstrumental: boolean;
  instrumentalText: string;
  cleanActivity: boolean; // Suppress Spotify RPC
  sourceMode: 'auto' | 'gateway' | 'local';
}

export interface SpotifyLiveStatus {
  isRunning: boolean;
  isConnected: boolean;
  source: 'DISCORD_GATEWAY' | 'WINDOWS_LOCAL' | 'NONE';
  track: {
    title: string;
    artist: string;
    album?: string;
    progressMs: number;
    durationMs: number;
    currentLyric: string;
    nextLyric?: string;
    hasSyncedLyrics: boolean;
    lyricsCount: number;
    artUrl?: string;
  } | null;
}
