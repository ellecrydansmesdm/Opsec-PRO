import { app, BrowserWindow, protocol, net, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import url from 'url';
import dotenv from 'dotenv';
import { BotService } from './bot/bot-service';
import { AccountManager } from './bot/account-manager';
import { getSettings, saveSettings } from './utils/settings';
import { setupIpcHandlers } from './ipc/handlers';

dotenv.config();

// MUST register schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-resource',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true
    }
  },
  {
    scheme: 'opsec',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true
    }
  }
]);

process.on('uncaughtException', (err) => {
  console.error('------- FATAL CRASH --------');
  console.error(err);
  console.error('----------------------------');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('--- UNHANDLED REJECTION ----');
  console.error(reason);
  console.error('----------------------------');
});

const allowedPreviewPaths = new Set<string>();

export function allowPreviewPath(filePath: string) {
  if (filePath) {
    allowedPreviewPaths.add(path.resolve(filePath).toLowerCase());
  }
}

let mainWindow: BrowserWindow | null = null;
let botService: BotService | null = null;
let accountManager: AccountManager | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../assets/icon.ico'),
    resizable: false,
    center: true,
    backgroundColor: '#0a0a0f',
    show: true,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required'
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  // mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (accountManager) {
      validateTokensOnStartup(accountManager, mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup IPC Handlers
  setupIpcHandlers(mainWindow, botService, accountManager);
}

app.whenReady().then(() => {
  const configPath = path.join(app.getPath('userData'), 'opsec_config.json');
  accountManager = new AccountManager(configPath);
  botService = new BotService();

  botService.on('bot-log', (log: any) => {
    mainWindow?.webContents.send('bot-log', log);
  });

  createWindow();
});

// Register custom protocol for local resources (Modern API for Electron v14+)
app.whenReady().then(() => {
  protocol.handle('local-resource', async (request) => {
    try {
      console.log('[PROTOCOL] URL Reçue:', request.url);
      const parsedUrl = new URL(request.url);
      
      let decodedPath = decodeURIComponent(parsedUrl.pathname);
      
      // If host exists (like 'c'), prepend it to the path
      if (parsedUrl.host && parsedUrl.host.length === 1) {
        decodedPath = parsedUrl.host + ':' + decodedPath;
      }
      
      // Robustly clean up leading slashes and drive letters for Windows
      decodedPath = decodedPath.replace(/^\/+([a-zA-Z]:)/, '$1');
      
      if (decodedPath.startsWith('/') && !/^[a-zA-Z]:/.test(decodedPath)) {
        decodedPath = decodedPath.slice(1);
      }

      // --- SECURITY CONTROLS ---
      // 1. Block directory traversal (..)
      if (decodedPath.includes('..') || decodedPath.includes('%2e%2e')) {
        console.error('[PROTOCOL] Access denied (directory traversal detected):', decodedPath);
        return new Response('Access denied: Directory traversal blocked', { status: 403 });
      }

      // 2. Resolve to absolute path
      const absolutePath = path.resolve(decodedPath);

      // 3. Strict extension check to prevent arbitrary file reading
      const allowedExts = ['.cur', '.ani', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const ext = path.extname(absolutePath).toLowerCase();
      if (!allowedExts.includes(ext)) {
        console.error('[PROTOCOL] Access denied (invalid extension):', absolutePath);
        return new Response('Access denied: Invalid file extension', { status: 403 });
      }

      // 4. Confinement check: Path must be within standard user folders or installation directory, OR explicitly allowed preview paths
      const allowedBases = [
        app.getPath('userData'),
        app.getAppPath()
      ].map(p => path.resolve(p).toLowerCase());

      const targetLower = absolutePath.toLowerCase();
      const isAllowedDir = allowedBases.some(base => targetLower.startsWith(base)) || allowedPreviewPaths.has(targetLower);

      if (!isAllowedDir) {
        console.error('[PROTOCOL] Access denied (outside authorized folders):', absolutePath);
        return new Response('Access denied: Directory outside sandbox', { status: 403 });
      }

      console.log('[PROTOCOL] Path extrait et validé:', absolutePath);

      if (!fs.existsSync(absolutePath)) {
        console.error('[PROTOCOL] Fichier introuvable:', absolutePath);
        return new Response('File not found', { status: 404 });
      }

      const fileUri = url.pathToFileURL(absolutePath).toString();
      return net.fetch(fileUri);
    } catch (err: any) {
      console.error('[PROTOCOL] Erreur critique:', err);
      return new Response(err.message, { status: 500 });
    }
  });

  // NEW: Robust Protocol for Wallpapers & Cursors (Machine Independent)
  protocol.handle('opsec', async (request) => {
    try {
      const parsedUrl = new URL(request.url);
      if (parsedUrl.hostname === 'wallpaper') {
        // request.url is "opsec://wallpaper/filename.png"
        // parsedUrl.pathname is "/filename.png"
        const fileName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
        const targetPath = path.join(app.getPath('userData'), 'wallpapers', fileName);
        
        if (!fs.existsSync(targetPath)) {
            return new Response('Wallpaper not found', { status: 404 });
        }
        return net.fetch(url.pathToFileURL(targetPath).toString());
      }
      
      if (parsedUrl.hostname === 'cursor') {
        // request.url is "opsec://cursor/filename.png"
        // parsedUrl.pathname is "/filename.png"
        const fileName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
        const targetPath = path.join(app.getPath('userData'), 'cursors', fileName);
        
        if (!fs.existsSync(targetPath)) {
            return new Response('Cursor not found', { status: 404 });
        }
        return net.fetch(url.pathToFileURL(targetPath).toString());
      }
      
      return new Response('Invalid opsec protocol', { status: 400 });
    } catch (err: any) {
      return new Response(err.message, { status: 500 });
    }
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (botService) {
    try {
      botService.destroy();
    } catch (e) {
      console.error('[OPSEC] Error during botService.destroy() on quit:', e);
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

async function validateTokensOnStartup(manager: AccountManager, win: BrowserWindow | null) {
  const accounts = [...manager.getAccounts()];
  if (accounts.length === 0) return;

  const invalidAccounts: { id: string; username: string }[] = [];

  // Check all accounts in parallel using Promise.all
  await Promise.all(
    accounts.map(async (account) => {
      try {
        const res = await fetch('https://discord.com/api/v9/users/@me', {
          headers: {
            Authorization: account.token
          }
        });
        if (res.status === 401 || res.status === 403) {
          invalidAccounts.push({
            id: account.id,
            username: account.username || account.tag || 'Compte inconnu'
          });
        }
      } catch (e) {
        console.error(`[Startup Validation] Error checking ${account.username || account.tag}:`, e);
      }
    })
  );

  if (invalidAccounts.length > 0) {
    // Remove invalid accounts sequentially to avoid file write collisions/race conditions.
    for (const invalid of invalidAccounts) {
      manager.removeAccount(invalid.id);
    }

    const list = invalidAccounts.map(acc => `- ${acc.username}`).join('\n');
    dialog.showMessageBox(win!, {
      type: 'warning',
      title: 'Compte(s) Invalide(s) Détecté(s)',
      message: `Le(s) compte(s) suivant(s) ne fonctionne(nt) plus (token expiré ou révoqué) et a/ont été supprimé(s) :\n\n${list}`,
      buttons: ['OK']
    }).catch(err => console.error(err));

    const current = getSettings();
    saveSettings({ ...current, accounts: manager.getAccounts() });
    win?.webContents.send('settings-updated', getSettings());
  }
}
