import { ipcMain, app, BrowserWindow, dialog, clipboard, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { BotService } from '../bot/bot-service';
import { AccountManager } from '../bot/account-manager';
import { getSettings, saveSettings } from '../utils/settings';
import { IPCResponse } from '../../shared/ipc-types';
import { wallpaperService } from '../services/wallpaper-service';
import { statsService } from '../services/stats-service';

const getConfigPath = () => path.join(app.getPath('userData'), 'opsec_config.json');

// Centralized settings logic replaced by utils/settings.ts import

const notifySettingsUpdate = (mainWindow: BrowserWindow | null) => {
  if (mainWindow) {
    mainWindow.webContents.send('settings-updated', getSettings());
  }
};

export function setupIpcHandlers(mainWindow: BrowserWindow | null, botService: BotService | null, accountManager: AccountManager | null) {
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

  ipcMain.handle('check-auth', async () => {
    try {
      if (botService && botService.client.readyAt) {
        return { success: true, data: { authenticated: true, user: botService.getProfile() } };
      }
      return { success: true, data: { authenticated: false } };
    } catch (error: any) {
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
    // Only reset autoLogin on EXPLICIT logout. This ensures the session IS remembered on app restart.
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

  ipcMain.handle('get-channels', async () => {
    try {
      const channels = await botService?.getChannelsList() || { servers: [], dms: [] };
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

  ipcMain.handle('dm-all-friends', async (_, { message }) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.dmAll(message);
  });

  ipcMain.handle('leave-all-groups', async (_, ids = [], silent = false) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return await botService.leaveGroups(ids, silent);
  });

  ipcMain.handle('set-voice-stalker', async (_, data) => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    
    // REDIRECT: data.userId is now treated as channelId in the new AFK Farmer system
    const targetId = data.channelId || data.userId;
    
    if (targetId) {
      await botService.voiceStalker.joinAFK(targetId);
    } else {
      await botService.voiceStalker.leaveAFK();
    }
    return { success: true };
  });

  ipcMain.handle('get-farmer-status', async () => {
    if (!botService) return { success: false, error: 'Bot service non initialisé' };
    return { success: true, data: botService.voiceStalker.getStatus() };
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
    shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('select-file', async () => {
    if (!mainWindow) return { success: false, error: 'Fenêtre principale non trouvée' };
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Sélection annulée' };
    }

    return { success: true, data: result.filePaths[0] };
  });

  ipcMain.handle('select-token-file', async () => {
    if (!mainWindow) return { success: false, error: 'Fenêtre introuvable' };
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };

    try {
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
    
    let filePath = preSelectedPath;
    
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }]
      });
      if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };
      filePath = result.filePaths[0];
    }

    try {
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

  ipcMain.handle('get-dev-avatar', async () => {
    try {
      if (!botService || !botService.client.readyAt) {
        // Fallback if bot is not connected yet
        return 'https://cdn.discordapp.com/avatars/759026330003308625/a_8a2b535d4f3b7f14b6099bdac25f0e34.gif';
      }
      const devUser = await botService.client.users.fetch('759026330003308625');
      return devUser.displayAvatarURL({ dynamic: true, size: 128 });
    } catch (e) {
      return 'https://cdn.discordapp.com/avatars/759026330003308625/a_8a2b535d4f3b7f14b6099bdac25f0e34.gif';
    }
  });


  // --- V1.2.1 Pomelo Sniper Handlers ---
  ipcMain.handle('pomelo:check', async (_, username) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.checkPomelo(username);
  });

  ipcMain.handle('pomelo:claim', async (_, { username, password }) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.claimPomelo(username, password);
  });

  ipcMain.handle('pomelo:start-batch', async (_, data) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.batchCheckPomelo(data.usernames, { 
      delay: data.delay, 
      autoClaim: data.autoClaim, 
      password: data.password 
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
  ipcMain.handle('group:start-rename', async (_, { channelId, names, delay }) => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.startGroupRename(channelId, names, delay);
  });

  ipcMain.handle('group:stop-rename', async () => {
    if (!botService) return { success: false, error: 'Bot non initialisé' };
    return await botService.stopGroupRename();
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
}
