import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../../shared/types';

export const defaultSettings: AppSettings = {
    autoLogin: false,
    silentMode: true,
    privateMode: false,
    language: 'fr',
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
    sentinelEnabled: false
};

export const getConfigPath = () => path.join(app.getPath('userData'), 'opsec_config.json');

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
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
        }

        // Sync with defaults to ensure new keys exist
        return { ...defaultSettings, ...data };
    } catch (e) {
        return { ...defaultSettings };
    }
}

export function saveSettings(settings: AppSettings) {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
}
