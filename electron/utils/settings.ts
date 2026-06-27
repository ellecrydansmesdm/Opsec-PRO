import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { AppSettings } from '../../shared/types';

export const defaultSettings: AppSettings = {
    autoLogin: false,
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

export function getSettings(): AppSettings {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return { ...defaultSettings };
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

        // Sync with defaults to ensure new keys exist
        return { ...defaultSettings, ...data };
    } catch (e) {
        return { ...defaultSettings };
    }
}

export function saveSettings(settings: AppSettings) {
    const configPath = getConfigPath();
    try {
        const settingsCopy = JSON.parse(JSON.stringify(settings));
        
        // Encrypt all account tokens before saving
        if (settingsCopy.accounts && Array.isArray(settingsCopy.accounts)) {
            settingsCopy.accounts = settingsCopy.accounts.map((acc: any) => {
                if (acc && acc.token) {
                    acc.token = encryptToken(acc.token);
                }
                return acc;
            });
        }

        fs.writeFileSync(configPath, JSON.stringify(settingsCopy, null, 2));
    } catch (e) {
        console.error('[settings] Save error:', e);
    }
}
