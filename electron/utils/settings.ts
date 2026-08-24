import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { AppSettings } from '../../shared/types';

// Ensure the app name is explicitly set so userData is always %APPDATA%\opsec-pro
app.name = 'opsec-pro';

export const defaultSettings: AppSettings = {
    autoLogin: false,
    licenseKey: '',
    licenseValidated: false,
    silentMode: true,
    privateMode: false,
    language: 'en',
    adminPurge: false,
    purgeDelay: 1000,
    themeBlur: 10,
    themeOpacity: 0.8,
    allowActiveAppDetection: false,
    spotifyLyricsEnabled: false,
    spotifyCookie: '',
    themeBackground: '',
    audioVolume: 0.5,
    audioEnabled: true,
    cyberCursorEnabled: false,
    accounts: [],
    sentinelEnabled: false,
    nitroStartDate: null,
    boostStartDate: null,
    farmerConfig: {
      enabled: false,
      selectedAccountIds: [],
      vocalHopper: {
        enabled: false,
        channelIds: [],
        interval: 10,
        jitter: true
      },
      messageFarmer: {
        enabled: false,
        channelIds: [],
        phrases: [],
        delay: 60
      },
      stealthMode: true
    },
    responderConfig: {
      enabled: false,
      afkOnly: true,
      dmOnly: true,
      rules: []
    },
    automationConfig: {
      autoReport: {
        enabled: false,
        targetUserId: '',
        floodLimit: 5,
        insultKeywords: ['fdp', 'connard', 'salope', 'useless'],
        reportCategory: [3, 28, 72]
      },
      nitroSniper: {
        enabled: false,
        priorityMain: true
      },
      giveawayJoiner: {
        enabled: false,
        delay: 5000
      },
      capMonsterKey: '',
      twoCaptchaKey: '',
      antiCaptchaKey: '',
      capsolverKey: '',
      noCaptchaAIKey: '',
      proxyEnabled: false,
      proxyType: 'http',
      proxyList: []
    }
};

export const getConfigPath = () => path.join(app.getPath('userData'), 'opsec_config.json');

export function encryptToken(token: string): string {
    if (!token) return '';
    if (token.startsWith('enc:')) return token;
    try {
        if (!safeStorage.isEncryptionAvailable()) return token;
        const encrypted = safeStorage.encryptString(token);
        return 'enc:' + encrypted.toString('base64');
    } catch (e) {
        console.error('[safeStorage] Encryption error:', e);
        return token;
    }
}

export function decryptToken(encryptedToken: string): string {
    if (!encryptedToken) return '';
    if (!encryptedToken.startsWith('enc:')) return encryptedToken;
    try {
        if (!safeStorage.isEncryptionAvailable()) {
            console.error('[safeStorage] Decryption is not available, cannot decrypt encrypted token');
            return '';
        }
        const base64Data = encryptedToken.slice(4);
        const buffer = Buffer.from(base64Data, 'base64');
        return safeStorage.decryptString(buffer);
    } catch (e) {
        console.error('[safeStorage] Decryption error:', e);
        return '';
    }
}

let cachedSettings: AppSettings | null = null;

export function getSettings(): AppSettings {
    if (cachedSettings !== null) {
        return cachedSettings;
    }
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        const defaults: AppSettings = { ...defaultSettings };
        cachedSettings = defaults;
        return defaults;
    }
    try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        // Auto-migration for v1.x tokens
        if (data.token && (!data.accounts || data.accounts.length === 0)) {
            data.accounts = [{
                id: 'legacy-' + Date.now(),
                token: data.token,
                username: 'Migrated Account',
                tag: '',
                avatarURL: '',
                selected: true,
                animations: []
            }];
            delete data.token;
        }

        // Decrypt all account tokens
        if (data.accounts && Array.isArray(data.accounts)) {
            data.accounts = data.accounts.map((acc: any) => {
                if (acc && acc.token) {
                    acc.token = decryptToken(acc.token);
                }
                return acc;
            });
        }

        // Decrypt Spotify Cookie
        if (data.spotifyCookie) {
            data.spotifyCookie = decryptToken(data.spotifyCookie);
        }

        // Decrypt Captcha solver API keys in automationConfig
        if (data.automationConfig) {
            if (data.automationConfig.capMonsterKey) data.automationConfig.capMonsterKey = decryptToken(data.automationConfig.capMonsterKey);
            if (data.automationConfig.twoCaptchaKey) data.automationConfig.twoCaptchaKey = decryptToken(data.automationConfig.twoCaptchaKey);
            if (data.automationConfig.antiCaptchaKey) data.automationConfig.antiCaptchaKey = decryptToken(data.automationConfig.antiCaptchaKey);
            if (data.automationConfig.capsolverKey) data.automationConfig.capsolverKey = decryptToken(data.automationConfig.capsolverKey);
            if (data.automationConfig.noCaptchaAIKey) data.automationConfig.noCaptchaAIKey = decryptToken(data.automationConfig.noCaptchaAIKey);
        }

        // Sync with defaults to ensure new keys exist
        const merged: AppSettings = { ...defaultSettings, ...data };
        cachedSettings = merged;
        return merged;
    } catch (e) {
        const fallback: AppSettings = { ...defaultSettings };
        cachedSettings = fallback;
        return fallback;
    }
}

let isWritingSettings = false;
let pendingSettingsQueue: AppSettings[] = [];

export function saveSettings(settings: Partial<AppSettings>) {
    const current = getSettings();
    
    // Protect validated license unconditionally from partial updates
    let licenseKey = current.licenseKey || '';
    let licenseValidated = current.licenseValidated || false;

    if (settings.licenseKey && settings.licenseKey.trim() !== '') {
        licenseKey = settings.licenseKey.trim();
    }

    if (settings.licenseValidated === true) {
        licenseValidated = true;
    } else if (settings.licenseValidated === false && (settings.licenseKey === '' || settings.licenseKey === null)) {
        // Explicit license revocation
        licenseValidated = false;
        licenseKey = '';
    } else if (settings.licenseValidated !== undefined && !licenseKey) {
        licenseValidated = settings.licenseValidated;
    }

    // Sanitize and clamp numeric settings
    const themeBlur = settings.themeBlur !== undefined 
        ? Math.max(0, Math.min(50, Number(settings.themeBlur) || 0)) 
        : current.themeBlur;

    const themeOpacity = settings.themeOpacity !== undefined 
        ? Math.max(0.1, Math.min(1, Number(settings.themeOpacity) || 0.8)) 
        : current.themeOpacity;

    const audioVolume = settings.audioVolume !== undefined 
        ? Math.max(0, Math.min(1, Number(settings.audioVolume) || 0.5)) 
        : current.audioVolume;

    const purgeDelay = settings.purgeDelay !== undefined 
        ? Math.max(100, Number(settings.purgeDelay) || 1000) 
        : current.purgeDelay;

    const merged: AppSettings = {
        ...current,
        ...settings,
        themeBlur,
        themeOpacity,
        audioVolume,
        purgeDelay,
        licenseKey: licenseKey || '',
        licenseValidated: Boolean(licenseValidated)
    };

    // Update in-memory cache synchronously so getSettings() and guards immediately see the new state
    cachedSettings = { ...merged };

    pendingSettingsQueue.push(merged);
    processSaveQueue();
}

export function resetSettingsToDefault(): AppSettings {
    const current = getSettings();
    const preservedLicenseKey = current.licenseKey;
    const preservedLicenseValidated = current.licenseValidated;
    const preservedAccounts = current.accounts;
    const preservedLastActive = current.lastActiveAccountId;

    const reset: AppSettings = {
        ...defaultSettings,
        licenseKey: preservedLicenseKey,
        licenseValidated: preservedLicenseValidated,
        accounts: preservedAccounts,
        lastActiveAccountId: preservedLastActive
    };

    saveSettings(reset);
    return reset;
}

function processSaveQueue() {
    if (isWritingSettings || pendingSettingsQueue.length === 0) return;
    isWritingSettings = true;

    const nextSettings = pendingSettingsQueue.reduce((acc, curr) => ({ ...acc, ...curr }), {} as AppSettings);
    pendingSettingsQueue = [];

    const configPath = getConfigPath();
    const tempPath = configPath + '.tmp';

    try {
        let diskSettings: any = {};
        if (fs.existsSync(configPath)) {
            try {
                diskSettings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } catch (_) {}
        }

        const mergedSettings = { ...diskSettings, ...nextSettings };
        
        // Ensure validated license is NEVER lost on disk write
        const diskKey = diskSettings.licenseKey;
        const diskVal = diskSettings.licenseValidated;
        const nextKey = nextSettings.licenseKey;
        const nextVal = nextSettings.licenseValidated;

        if (diskKey && (!nextKey || nextKey.trim() === '')) {
            mergedSettings.licenseKey = diskKey;
            mergedSettings.licenseValidated = diskVal !== undefined ? Boolean(diskVal) : true;
        } else if (nextKey && nextKey.trim() !== '') {
            mergedSettings.licenseKey = nextKey.trim();
            mergedSettings.licenseValidated = Boolean(nextVal);
        } else if (cachedSettings?.licenseKey && cachedSettings?.licenseValidated) {
            mergedSettings.licenseKey = cachedSettings.licenseKey;
            mergedSettings.licenseValidated = true;
        }

        const settingsCopy = JSON.parse(JSON.stringify(mergedSettings));

        // Encrypt Account Tokens with DPAPI
        if (settingsCopy.accounts && Array.isArray(settingsCopy.accounts)) {
            settingsCopy.accounts = settingsCopy.accounts.map((acc: any) => {
                if (acc && acc.token) {
                    acc.token = encryptToken(acc.token);
                }
                return copyForEncryption(acc);
            });
        }

        // Encrypt Spotify Cookie with DPAPI
        if (settingsCopy.spotifyCookie) {
            settingsCopy.spotifyCookie = encryptToken(settingsCopy.spotifyCookie);
        }

        // Encrypt Captcha solver keys in automationConfig
        if (settingsCopy.automationConfig) {
            if (settingsCopy.automationConfig.capMonsterKey) settingsCopy.automationConfig.capMonsterKey = encryptToken(settingsCopy.automationConfig.capMonsterKey);
            if (settingsCopy.automationConfig.twoCaptchaKey) settingsCopy.automationConfig.twoCaptchaKey = encryptToken(settingsCopy.automationConfig.twoCaptchaKey);
            if (settingsCopy.automationConfig.antiCaptchaKey) settingsCopy.automationConfig.antiCaptchaKey = encryptToken(settingsCopy.automationConfig.antiCaptchaKey);
            if (settingsCopy.automationConfig.capsolverKey) settingsCopy.automationConfig.capsolverKey = encryptToken(settingsCopy.automationConfig.capsolverKey);
            if (settingsCopy.automationConfig.noCaptchaAIKey) settingsCopy.automationConfig.noCaptchaAIKey = encryptToken(settingsCopy.automationConfig.noCaptchaAIKey);
        }

        fs.writeFileSync(tempPath, JSON.stringify(settingsCopy, null, 2), 'utf-8');
        fs.renameSync(tempPath, configPath);
    } catch (e) {
        console.error('[settings] Save error:', e);
    } finally {
        isWritingSettings = false;
        if (pendingSettingsQueue.length > 0) {
            setTimeout(processSaveQueue, 10);
        }
    }
}

function copyForEncryption(acc: any) {
    const copy = { ...acc };
    return copy;
}
