import fs from 'fs';
import path from 'path';

export interface CustomLyricEntry {
    fileName: string;
    artist: string;
    title: string;
    size: number;
    updatedAt: number;
}

export class LyricsService {
    private storagePath: string;

    constructor(userDataPath: string) {
        this.storagePath = path.join(userDataPath, 'custom_lyrics');
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    /**
     * Checks if a custom .lrc file exists for a track
     */
    public getCustomLyrics(artist: string, title: string): string | null {
        try {
            const fileName = this.generateFileName(artist, title);
            const filePath = path.join(this.storagePath, fileName);
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf-8');
            }
        } catch (e) {
            console.error('[LYRICS] Error reading custom lyrics:', e);
        }
        return null;
    }

    /**
     * Saves a custom .lrc file
     */
    public async saveCustomLyrics(artist: string, title: string, content: string): Promise<boolean> {
        try {
            const fileName = this.generateFileName(artist, title);
            const filePath = path.join(this.storagePath, fileName);
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch (e) {
            console.error('[LYRICS] Error saving custom lyrics:', e);
            return false;
        }
    }

    /**
     * Select and import an LRC file from path
     */
    public async importLrcFile(artist: string, title: string, sourcePath: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(sourcePath, 'utf-8');
            return await this.saveCustomLyrics(artist, title, content);
        } catch (e) {
            return false;
        }
    }

    /**
     * Lists all custom saved .lrc files in the vault
     */
    public listCustomLyrics(): CustomLyricEntry[] {
        try {
            if (!fs.existsSync(this.storagePath)) return [];
            const files = fs.readdirSync(this.storagePath);
            const list: CustomLyricEntry[] = [];

            for (const file of files) {
                if (!file.endsWith('.lrc')) continue;
                const fullPath = path.join(this.storagePath, file);
                const stat = fs.statSync(fullPath);
                
                // Parse artist and title from filename (artist_title.lrc)
                const base = file.replace(/\.lrc$/, '');
                const parts = base.split('_');
                const artist = parts[0] ? parts[0].toUpperCase() : 'UNKNOWN';
                const title = parts.slice(1).join(' ') || 'UNKNOWN';

                list.push({
                    fileName: file,
                    artist,
                    title,
                    size: stat.size,
                    updatedAt: stat.mtimeMs
                });
            }

            return list.sort((a, b) => b.updatedAt - a.updatedAt);
        } catch (e) {
            console.error('[LYRICS] Error listing custom lyrics:', e);
            return [];
        }
    }

    /**
     * Deletes a custom .lrc file
     */
    public deleteCustomLyrics(fileName: string): boolean {
        try {
            // Sanitize filename to prevent path traversal
            const cleanName = path.basename(fileName);
            const filePath = path.join(this.storagePath, cleanName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
        } catch (e) {
            console.error('[LYRICS] Error deleting custom lyrics:', e);
        }
        return false;
    }

    private generateFileName(artist: string, title: string): string {
        return `${artist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.lrc';
    }
}
