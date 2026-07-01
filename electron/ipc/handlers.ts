import { ipcMain, app, BrowserWindow, dialog, clipboard, shell, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { BotService } from '../bot/bot-service';
import { AccountManager } from '../bot/account-manager';
import { getSettings, saveSettings } from '../utils/settings';
import { IPCResponse } from '../../shared/ipc-types';
import { wallpaperService } from '../services/wallpaper-service';
import { statsService } from '../services/stats-service';
import { allowPreviewPath } from '../main';
import { KeyAuthClient } from '../utils/keyauth';

const getConfigPath = () => path.join(app.getPath('userData'), 'opsec_config.json');

// Centralized settings logic replaced by utils/settings.ts import

const notifySettingsUpdate = (mainWindow: BrowserWindow | null) => {
  if (mainWindow) {
    mainWindow.webContents.send('settings-updated', getSettings());
  }
};

let mainWindow: BrowserWindow | null = null;

export function setupIpcHandlers(win: BrowserWindow | null, botService: BotService | null, accountManager: AccountManager | null) {
  mainWindow = win;

  if (mainWindow) {
    mainWindow.on('closed', () => {
      if (mainWindow === win) {
        mainWindow = null;
      }
    });
  }

  if ((global as any).ipcHandlersRegistered) {
    return;
  }
  (global as any).ipcHandlersRegistered = true;

  ipcMain.handle('get-settings', async () => {
    return { success: true, data: getSettings() };
  });

  ipcMain.on('minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.on('close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('check-auth', async (_, data?: { licenseKey?: string }) => {
    try {
      const licenseKey = data?.licenseKey?.trim();

      // --- PATH 1: License key provided (user is activating) ---
      if (licenseKey) {
        console.log('[AUTH] Attempting activation with key:', licenseKey);
        const keyauth = new KeyAuthClient();
        await keyauth.initialize();
        const result = await keyauth.license(licenseKey);
        console.log('[AUTH] Activation result:', result);
        if (!result.success) {
          return { success: false, error: result.message };
        }
        // Save the validated key to config so future startups can re-validate
        const current = getSettings();
        console.log('[AUTH] Saving validated key to disk...');
        saveSettings({ ...current, licenseKey, licenseValidated: true });
        return { success: true, data: { authenticated: false } }; // Let login flow continue
      }

      // --- PATH 2: Startup re-validation (no key provided, check saved key) ---
      const settings = getSettings();
      console.log('[AUTH] Loaded settings from disk:', {
        hasKey: !!settings.licenseKey,
        licenseValidated: settings.licenseValidated,
        licenseKey: settings.licenseKey
      });
      if (!settings.licenseKey || !settings.licenseValidated) {
        console.log('[AUTH] No saved key or not validated. Requiring license screen.');
        return { success: true, data: { authenticated: false, requireLicense: true, savedKey: settings.licenseKey || '' } };
      }

      // Re-validate saved key silently on every startup
      console.log('[AUTH] Silent re-validating saved key:', settings.licenseKey);
      const keyauth = new KeyAuthClient();
      await keyauth.initialize();
      const revalidation = await keyauth.license(settings.licenseKey);
      console.log('[AUTH] Re-validation result:', revalidation);
      if (!revalidation.success) {
        console.warn('[AUTH] Silent re-validation failed. Mark as unvalidated! Reason:', revalidation.message);
        saveSettings({ ...settings, licenseValidated: false });
        return { success: true, data: { authenticated: false, requireLicense: true, savedKey: settings.licenseKey } };
      }

      // Key still valid — check if bot session is alive
      if (botService && botService.client.readyAt) {
        return { success: true, data: { authenticated: true, user: botService.getProfile() } };
      }
      return { success: true, data: { authenticated: false } };
    } catch (error: any) {
      console.error('[AUTH] Critical error in check-auth:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('login-attempt', async (_, { token, rememberMe }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    try {
      const result = await botService.login(token);
      if (result.success && result.user) {
        if (rememberMe && accountManager) {
           accountManager.addAccount({
             id: result.user.id,
             token: token,
             username: result.user.username,
             tag: result.user.tag,
             avatarURL: result.user.avatarURL,
             selected: true,
             rotator: {
               enabled: false,
               interval: 60,
               statuses: [],
               bios: [],
               usernames: [],
               customRPCs: [],
               activities: [],
               clanTags: [],
               currentStatusIndex: 0,
               currentBioIndex: 0,
               currentUsernameIndex: 0,
               currentActivityIndex: 0,
               currentClanTagIndex: 0,
               enabledSections: {
                 status: true,
                 bio: true,
                 username: false,
                 activity: true,
                 clanTag: false
               },
               hypesquadHouse: 0,
               stats: {
                 messagesToday: 0,
                 totalMessages: 0
               },
               totalRotations: 0
             }
           });
           accountManager.selectAccount(result.user.id);
        }
        
        // Save global settings (like autoLogin) safely WITH the updated accounts
        const current = getSettings();
        const updatedAccounts = accountManager ? accountManager.getAccounts() : current.accounts;
        saveSettings({ 
            ...current, 
            autoLogin: rememberMe, 
            accounts: updatedAccounts 
        });

        // Notify UI about new account and autoLogin state
        notifySettingsUpdate(mainWindow);

        botService.updateEngineSettings(getSettings());

        return { success: true, user: result.user };
      }
      return { success: false, error: result.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-accounts', () => {
    if (!accountManager) return { success: false, error: 'AccountManager non initialisé' };
    return { success: true, data: accountManager.getAccounts() };
  });

  ipcMain.handle('select-account', async (_, id) => {
  if (!accountManager || !botService) return { success: false, error: 'Services non initialisés' };
  accountManager.selectAccount(id);
  const account = accountManager.getSelectedAccount();
  if (account) {
      botService.destroy(); // Clear old client
      const res = await botService.login(account.token);
      if (res.success) {
          // Sync engine with latest settings
          botService.updateEngineSettings(getSettings());
          
          // Double ensure persistence of selected flag in global config
          const current = getSettings();
          saveSettings({ ...current, accounts: accountManager.getAccounts() });

          // Notify UI to refresh account list / selection
          notifySettingsUpdate(mainWindow);

          mainWindow?.webContents.send('auto-login-success', res.user);
          return { success: true, data: { user: res.user } };
      }
      return { success: false, error: res.message };
  }
  return { success: false, error: 'Compte introuvable' };
});

  ipcMain.handle('remove-account', (_, id) => {
    if (!accountManager) return { success: false, error: 'AccountManager non initialisé' };
    accountManager.removeAccount(id);
    notifySettingsUpdate(mainWindow);
    return { success: true };
  });

  ipcMain.on('logout', () => {
    const current = getSettings();
    // Reset autoLogin but KEEP the licenseKey so user only needs to re-enter Discord token
    saveSettings({ ...current, autoLogin: false });
    if (botService) botService.destroy();
  });

  ipcMain.handle('get-user-data', () => {
    return { success: true, data: botService?.getProfile() || null };
  });

  ipcMain.handle('log:info', (_, { message, type }) => {
    botService?.log(message, type || 'info');
    return { success: true };
  });

  ipcMain.handle('get-channels', async (_, accountIds?: string[]) => {
    try {
      const channels = await botService?.getChannelsList(accountIds) || { servers: [], dms: [] };
      return { success: true, data: channels };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('resolve-ids', async (_, ids: string[]) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    const results: Record<string, { name: string; icon?: string; type: string }> = {};
    
    for (const id of ids) {
      if (!id) continue;
      try {
        const channel = botService.client.channels.cache.get(id);
        if (channel) {
          if (channel.type === 'DM') {
            const recipient = (channel as any).recipient;
            results[id] = { 
              name: recipient ? (recipient.globalName || recipient.username) : 'DM', 
              icon: recipient?.displayAvatarURL() || '',
              type: 'dm'
            };
          } else if (channel.type === 'GROUP_DM') {
             results[id] = { name: (channel as any).name || 'Groupe DM', type: 'group' };
          } else {
             results[id] = { 
                name: (channel as any).name, 
                icon: (channel as any).guild?.iconURL() || '',
                type: 'channel' 
             };
          }
          continue;
        }
        
        const guild = botService.client.guilds.cache.get(id);
        if (guild) {
          results[id] = { name: guild.name, icon: guild.iconURL() || '', type: 'server' };
          continue;
        }

        const user = botService.client.users.cache.get(id);
        if (user) {
          results[id] = { name: user.globalName || user.username, icon: user.displayAvatarURL(), type: 'user' };
        }
      } catch (e) {}
    }
    return { success: true, data: results };
  });

  ipcMain.handle('get-friends-list', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    try {
      const friends = await botService.getFriendsList();
      return { success: true, data: friends };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-groups-list', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    try {
      const groups = await botService.getGroupsList();
      return { success: true, data: groups };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-servers-list', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    try {
      const servers = await botService.getServersList();
      return { success: true, data: servers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('leave-all-servers', async (_, ids) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    try {
      const res = await botService.leaveServers(ids);
      return { success: true, data: res };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-purge', async (_, { channelId, amount, purgeAll, delay }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    if (!channelId) return { success: false, error: 'Channel ID manquant pour la purge' };
    if (!amount || amount <= 0) return { success: false, error: 'Amount invalide pour la purge' };
    try {
      await botService.purgeMessages(channelId, amount, purgeAll, delay);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-purge-server', async (_, { serverId, amount, purgeAll, delay }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    if (!serverId) return { success: false, error: 'Server ID manquant pour la purge' };
    if (!amount || amount <= 0) return { success: false, error: 'Amount invalide pour la purge' };
    try {
      await botService.purgeServer(serverId, amount, purgeAll, delay);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-purge', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    await botService.stopPurge();
    return { success: true };
  });

  ipcMain.handle('save-settings', (_, updated) => {
    try {
      const current = getSettings();
      const newSettings = { ...current, ...updated };
      saveSettings(newSettings);
      
      // Sync with engine
      if (botService) {
        botService.updateEngineSettings(newSettings);
      }
      if (accountManager && updated.accounts) {
        accountManager.setAccounts(updated.accounts);
      }
      
      notifySettingsUpdate(mainWindow);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-commands-count', (_, userId) => {
    return { success: true, count: statsService.getCount(userId) };
  });

  ipcMain.handle('increment-command', (_, userId) => {
    statsService.increment(userId);
    return { success: true };
  });

  ipcMain.handle('jump-to-message', (_, messageId) => {
    if (messageId) {
      clipboard.writeText(messageId);
      if (messageId.startsWith('http://') || messageId.startsWith('https://')) {
        shell.openExternal(messageId).catch((err) => console.error('Failed to open jump link:', err));
      }
    }
    return { success: true };
  });

  // Additional handlers for Spam, etc.

  ipcMain.handle('start-spam', async (_, data: { channelIds: string[], texts: string[], delay: number, jitter?: boolean, maxMessages?: number, proxies?: string[] }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    if (!data.channelIds || data.channelIds.length === 0) return { success: false, error: 'Aucun salon sélectionné' };
    if (!data.texts || data.texts.length === 0) return { success: false, error: 'Aucun texte fourni' };
    return await botService.startSpam(data);
  });

  ipcMain.handle('stop-spam', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.stopSpam();
  });

  ipcMain.handle('get-spam-status', async () => {
    if (!botService) return { success: true, data: { running: false, count: 0 } };
    return { success: true, data: botService.getSpamStatus() };
  });

  ipcMain.handle('stop-dm-all', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    await botService.stopDMAll();
    return { success: true };
  });

  ipcMain.handle('stop-sanitizer', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    await botService.stopSanitizer();
    return { success: true };
  });

  ipcMain.handle('delete-all-friends', async (_, ids = []) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.deleteFriends(ids);
  });

  ipcMain.handle('dm-all-friends', async (_, data) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.dmAll(data);
  });

  ipcMain.handle('leave-all-groups', async (_, ids = [], silent = false) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.leaveGroups(ids, silent);
  });

  ipcMain.handle('get-farmer-status', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return { success: true, data: botService.getFarmerStatus() };
  });

  ipcMain.handle('close-all-dms', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.closeAllDMs();
  });

  ipcMain.handle('clear-logs', async () => {
    // This will be handled by the frontend store, but we can emit a signal if needed
    return { success: true };
  });

  ipcMain.handle('login-via-discord', async () => {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 500,
        height: 700,
        show: false,
        parent: mainWindow || undefined,
        modal: true,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      loginWin.loadURL('https://discord.com/login');
      loginWin.once('ready-to-show', () => loginWin.show());

      const intervalToken = setInterval(async () => {
        if (loginWin.isDestroyed()) {
          clearInterval(intervalToken);
          resolve({ success: false, error: 'Connexion annulée' });
          return;
        }

        try {
          const token = await loginWin.webContents.executeJavaScript(`
            (function() {
              try {
                return (window.webpackChunkdiscord_app ? window.localStorage.getItem('token') : null) || window.localStorage.getItem('token');
              } catch (e) { return null; }
            })()
          `);

          if (token) {
            const cleanToken = token.replace(/"/g, '');
            clearInterval(intervalToken);
            loginWin.removeAllListeners('closed');
            loginWin.close();
            resolve({ success: true, data: { token: cleanToken } });
          }
        } catch (e) {}
      }, 1000);

      loginWin.on('closed', () => {
        clearInterval(intervalToken);
        resolve({ success: false, error: 'Fenêtre fermée' });
      });
    });
  });

  ipcMain.handle('toggle-spotify-lyrics', async (_, { enabled, cookie }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    
    // Persist setting to config file
    const settings = getSettings();
    settings.spotifyLyricsEnabled = enabled;
    if (cookie) settings.spotifyCookie = cookie;
    saveSettings(settings);

    return await botService.toggleSpotifyLyrics(enabled, cookie);
  });

  ipcMain.handle('open-external', async (_, url) => {
    if (typeof url !== 'string') {
      return { success: false, error: 'Invalid URL type' };
    }
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      console.warn(`[SECURITY] Blocked attempt to open non-http/https external URL: ${url}`);
      return { success: false, error: 'Access denied: Only HTTP/HTTPS URLs are allowed' };
    }
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-file', async () => {
    if (!mainWindow) return { success: false, error: 'Fenêtre principale non trouvée' };
    
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Curseurs & Images', extensions: ['cur', 'ani', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'webp'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Sélection annulée' };
      }

      const filePath = result.filePaths[0];
      allowPreviewPath(filePath);
      return { success: true, data: filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- Cursor Import with Auto-Resize ---
  ipcMain.handle('cursor:import', async () => {
    if (!mainWindow) return { success: false, error: 'Fenêtre introuvable' };
    
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Curseurs', extensions: ['cur', 'ani', 'ico', 'png'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Annulé' };
      }

      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      
      const cursorDir = path.join(app.getPath('userData'), 'cursors');
      if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
      
      const fileName = `cursor_${Date.now()}${ext}`;
      const destPath = path.join(cursorDir, fileName);

      // .cur, .ani, .ico are dedicated cursor formats
      if (ext === '.cur' || ext === '.ani' || ext === '.ico') {
        fs.copyFileSync(filePath, destPath);
        const base64 = fs.readFileSync(destPath).toString('base64');
        const mime = ext === '.ico' || ext === '.cur' ? 'image/x-icon' : 'application/octet-stream';
        return { success: true, data: `data:${mime};base64,${base64}` };
      }
      
      // For .png files, check dimensions and auto-resize if too large for Chromium
      let img = nativeImage.createFromPath(filePath);
      const size = img.getSize();
      
      if (size.width > 64 || size.height > 64) {
        // Resize to 32x32 — Chromium rejects cursors > 128px silently
        img = img.resize({ width: 32, height: 32, quality: 'best' });
        const pngBuf = img.toPNG();
        fs.writeFileSync(destPath, pngBuf);
        
        console.log(`[CURSOR] Resized ${size.width}x${size.height} → 32x32:`, destPath);
        const base64 = pngBuf.toString('base64');
        return { success: true, data: `data:image/png;base64,${base64}`, resized: true, originalSize: `${size.width}x${size.height}` };
      }
      
      // If it's a small PNG, copy it as-is
      fs.copyFileSync(filePath, destPath);
      const base64 = fs.readFileSync(destPath).toString('base64');
      return { success: true, data: `data:image/png;base64,${base64}` };
    } catch (err: any) {
      console.error('[CURSOR] Processing error:', err);
      return { success: false, error: `Erreur de traitement: ${err.message}` };
    }
  });

  ipcMain.handle('select-token-file', async () => {
    if (!mainWindow) return { success: false, error: 'Fenêtre introuvable' };
    
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
      });

      if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };

      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      return { success: true, data: content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('toggle-animation', async (_, config) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.toggleRotator(config);
  });

  ipcMain.handle('force-rotator-update', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.forceRotatorUpdate();
  });

  ipcMain.handle('show-message-box', async (_, options) => {
    return await dialog.showMessageBox(mainWindow!, options);
  });

  // --- NEW: Wallpaper & Theme Handlers ---
  ipcMain.handle('wallpaper:upload', async (_, preSelectedPath?: string) => {
    if (!mainWindow) return { success: false, error: 'Fenêtre introuvable' };
    
    try {
      let filePath = preSelectedPath;
      
      if (!filePath) {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }]
        });
        if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };
        filePath = result.filePaths[0];
      }

      const internalUrl = await wallpaperService.saveLocalWallpaper(filePath);
      return { success: true, data: internalUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('wallpaper:reset', async () => {
    try {
      wallpaperService.reset();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });




  // --- V1.2.1 Pomelo Sniper Handlers ---
  ipcMain.handle('pomelo:check', async (_, data) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.checkPomelo(data.username, data.botToken);
  });

  ipcMain.handle('pomelo:claim', async (_, { username, password }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.claimPomelo(username, password);
  });

  ipcMain.handle('pomelo:start-batch', async (_, data) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.batchCheckPomelo(data.usernames, { 
      delay: data.delay, 
      autoClaim: data.autoClaim, 
      password: data.password,
      botToken: data.botToken,
      generator: data.generator
    });
  });

  ipcMain.handle('pomelo:stop-batch', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.stopPomeloBatch();
  });

  if (botService) {
    botService.on('pomelo-update', (data) => {
      mainWindow?.webContents.send('pomelo-update', data);
    });
  }

  // --- Group Pro & Sentinel Duo Handlers ---
  ipcMain.handle('group:start-rename', async (_, { channelId, names, delay, accounts }) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.startGroupRename(channelId, names, delay, accounts);
  });

  ipcMain.handle('group:stop-rename', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.stopGroupRename();
  });

  ipcMain.handle('group:rename-status', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return { success: true, data: botService.groupService.getRenameStatus() };
  });

  ipcMain.handle('sentinel:start', async (_, { partnerToken, groupIds, groupLinks }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.protectionService.startSentinel(partnerToken, groupIds, groupLinks);
  });

  ipcMain.handle('sentinel:stop', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.protectionService.stopSentinel();
  });

  ipcMain.handle('sentinel:status', async () => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return { success: true, data: botService.protectionService.getStatus() };
  });

  ipcMain.handle('sentinel:toggle-shield', async (_, { groupId, active }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.protectionService.toggleShield(groupId, active);
  });

  ipcMain.handle('group:clone', async (_, { groupId }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.cloneGroup(groupId);
  });

  ipcMain.handle('group:mass-add', async (_, { groupId, userIds, delay }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.massAddRecipients(groupId, userIds, delay);
  });

  ipcMain.handle('hypersquad:set', async (_, { houseId }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.setHypeSquad(houseId);
  });

  ipcMain.handle('start-auto-vote', async (_, { messageId, channelId, emoji, accounts }) => {
    if (!botService) return { success: false, error: 'Bot non initialise' };
    return await botService.reactionService.nukeReaction(messageId, channelId, emoji, accounts);
  });

  ipcMain.handle('capmonster:check-key', async (_, key) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkCapMonsterKey(key);
  });

  ipcMain.handle('2captcha:check-key', async (_, key) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkTwoCaptchaKey(key);
  });

  ipcMain.handle('anticaptcha:check-key', async (_, key) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkAntiCaptchaKey(key);
  });

  ipcMain.handle('capsolver:check-key', async (_, key) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkCapsolverKey(key);
  });

  ipcMain.handle('nocaptchaai:check-key', async (_, key) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkNoCaptchaAIKey(key);
  });

  ipcMain.handle('get-diagnostics', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return botService.getDiagnostics();
  });

  ipcMain.handle('auto-join-servers', async (_, data: { inviteLink: string; delay?: number }) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.autoJoinServers(data.inviteLink, data.delay ?? 3000);
  });

  ipcMain.handle('stop-auto-join', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return botService.stopAutoJoin();
  });

  ipcMain.handle('get-auto-join-status', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return { success: true, data: botService.getAutoJoinStatus() };
  });
}
