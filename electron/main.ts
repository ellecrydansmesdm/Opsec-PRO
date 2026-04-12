import { app, BrowserWindow, protocol, net } from 'electron';
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
      // request.url can look like:
      // local-resource://C:/Users/path... (Chromium might treat C: as host)
      // local-resource:///C:/Users/path... (Best case, triple slash)
      
      console.log('[PROTOCOL] URL Reçue:', request.url);
      
      const parsedUrl = new URL(request.url);
      
      // If C: was treated as host, pathname is /Users/...
      // If it's host-less, pathname starts with /C:/...
      let decodedPath = decodeURIComponent(parsedUrl.pathname);
      
      // If host exists (like 'c'), prepend it to the path
      if (parsedUrl.host && parsedUrl.host.length === 1) {
        decodedPath = parsedUrl.host + ':' + decodedPath;
      }
      
      // Remove leading slash if it exists (e.g. /C:/ -> C:/)
      if (decodedPath.startsWith('/')) {
        decodedPath = decodedPath.slice(1);
      }

      console.log('[PROTOCOL] Path extrait:', decodedPath);

      // Verify file existence
      if (!fs.existsSync(decodedPath)) {
        console.error('[PROTOCOL] Fichier introuvable:', decodedPath);
        return new Response('File not found', { status: 404 });
      }

      const fileUri = url.pathToFileURL(decodedPath).toString();
      console.log('[PROTOCOL] Résolution file://:', fileUri);

      return net.fetch(fileUri);
    } catch (err: any) {
      console.error('[PROTOCOL] Erreur critique:', err);
      return new Response(err.message, { status: 500 });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
