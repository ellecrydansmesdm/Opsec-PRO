import fs from 'fs';
import path from 'path';

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
     * Select and import an LRC file
     */
    public async importLrcFile(artist: string, title: string, sourcePath: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(sourcePath, 'utf-8');
            return await this.saveCustomLyrics(artist, title, content);
        } catch (e) {
            return false;
        }
    }

    private generateFileName(artist: string, title: string): string {
        // Simple slugify
        return `${artist}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.lrc';
    }
}
