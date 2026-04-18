import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface GhostData {
    username: string;
    firstSeen: number; // timestamp
}

export class GhostTracker {
    private filePath: string;
    private ghosts: Record<string, number> = {};

    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'opsec_ghosts.json');
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                this.ghosts = JSON.parse(data);
            }
        } catch (e) {
            console.error('[GhostTracker] Error loading ghosts:', e);
            this.ghosts = {};
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.ghosts, null, 2));
        } catch (e) {
            console.error('[GhostTracker] Error saving ghosts:', e);
        }
    }

    /**
     * Records a ghost detection and returns the firstSeen timestamp
     */
    track(username: string): number {
        if (!this.ghosts[username]) {
            this.ghosts[username] = Date.now();
            this.save();
        }
        return this.ghosts[username];
    }

    get(username: string): number | null {
        return this.ghosts[username] || null;
    }

    remove(username: string) {
        if (this.ghosts[username]) {
            delete this.ghosts[username];
            this.save();
        }
    }

    getAll(): Record<string, number> {
        return this.ghosts;
    }
}

export const ghostTracker = new GhostTracker();
