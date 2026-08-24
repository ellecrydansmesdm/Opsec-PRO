import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface CommandStats {
    count: number;
    lastUsed: number;
}

interface StatsSchema {
    [userId: string]: CommandStats;
}

export class StatsService {
    private statsPath: string;
    private stats: StatsSchema = {};

    constructor() {
        this.statsPath = path.join(app.getPath('userData'), 'commands_stats.json');
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(this.statsPath)) {
                const data = fs.readFileSync(this.statsPath, 'utf-8');
                this.stats = JSON.parse(data);
            }
        } catch (error) {
            console.error('[STATS] Error loading stats:', error);
            this.stats = {};
        }
    }

    private save() {
        fs.promises.writeFile(this.statsPath, JSON.stringify(this.stats, null, 2))
            .catch(error => {
                console.error('[STATS] Error saving stats:', error);
            });
    }

    public increment(userId: string) {
        if (!userId) return;
        
        if (!this.stats[userId]) {
            this.stats[userId] = { count: 0, lastUsed: Date.now() };
        }
        
        this.stats[userId].count++;
        this.stats[userId].lastUsed = Date.now();
        this.save();
    }

    public getCount(userId: string): number {
        if (!userId || !this.stats[userId]) return 0;
        return this.stats[userId].count;
    }

    public getAllStats(userId: string): CommandStats | null {
        if (!userId || !this.stats[userId]) return null;
        return this.stats[userId];
    }
}

// Singleton
export const statsService = new StatsService();
