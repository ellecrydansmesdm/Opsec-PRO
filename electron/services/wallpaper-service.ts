import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class WallpaperService {
  private wallpaperDir: string;

  constructor() {
    this.wallpaperDir = path.join(app.getPath('userData'), 'wallpapers');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.wallpaperDir)) {
      fs.mkdirSync(this.wallpaperDir, { recursive: true });
    }
  }

  /**
   * Copies a local file to the app's internal wallpaper storage
   * @param sourcePath Original path of the image
   * @returns The local-resource URL to be used in the frontend
   */
  async saveLocalWallpaper(sourcePath: string): Promise<string> {
    console.log('[WALLPAPER] Étape 1: Fichier sélectionné:', sourcePath);
    const fileName = `wallpaper_${Date.now()}${path.extname(sourcePath)}`;
    const destPath = path.join(this.wallpaperDir, fileName);

    // Basic validation
    const stats = fs.statSync(sourcePath);
    if (stats.size > 10 * 1024 * 1024) {
      console.error('[WALLPAPER] Erreur: Image trop lourde (>10MB)');
      throw new Error('Image trop lourde (max 10MB)');
    }

    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    if (!allowedExts.includes(path.extname(sourcePath).toLowerCase())) {
      console.error('[WALLPAPER] Erreur: Format non supporté:', path.extname(sourcePath));
      throw new Error('Unsupported format (PNG, JPG, WEBP, GIF only)');
    }

    // Copy file
    console.log('[WALLPAPER] Étape 2: Copie vers:', destPath);
    await fs.promises.copyFile(sourcePath, destPath);

    // Clean up old wallpapers (optional, but keeps AppData clean)
    this.cleanupOldWallpapers(fileName);

    const protocolUrl = `local-resource:///${destPath.replace(/\\/g, '/')}`;
    console.log('[WALLPAPER] Étape 3: Protocol URL généré:', protocolUrl);
    return protocolUrl;
  }

  private cleanupOldWallpapers(currentFile: string) {
    const files = fs.readdirSync(this.wallpaperDir);
    for (const file of files) {
      if (file !== currentFile) {
        try {
          fs.unlinkSync(path.join(this.wallpaperDir, file));
        } catch (e) {
          console.error('[WallpaperService] Failed to cleanup:', file);
        }
      }
    }
  }

  reset() {
    const files = fs.readdirSync(this.wallpaperDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(this.wallpaperDir, file));
      } catch (e) {}
    }
  }
}

export const wallpaperService = new WallpaperService();
