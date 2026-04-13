import { create } from 'zustand';
import { AppSettings } from '../../shared/types';

interface SettingsState {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { 
    autoLogin: false, 
    silentMode: true, 
    privateMode: false,
    language: 'fr', 
    adminPurge: false, 
    purgeDelay: 1000,
    spotifyCookie: '',
    spotifyLyricsEnabled: false,
    themeBackground: '',
    themeBlur: 10,
    themeOpacity: 0.8,
    allowActiveAppDetection: false,
    accounts: [],
    farmerConfig: {
      enabled: false,
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
    audioVolume: 0.5,
    audioEnabled: true
  },
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) => {
    set((state) => {
      const newSettings = { ...state.settings, [key]: value };
      
      // PERSIST TO DISK: Sync with Electron backend
      if (window.electronAPI && window.electronAPI.saveSettings) {
        window.electronAPI.saveSettings({ [key]: value }).catch((err: any) => {
          console.error("[STORE] Persistence Error:", err);
        });
      }

      return { settings: newSettings };
    });
  },
}));
