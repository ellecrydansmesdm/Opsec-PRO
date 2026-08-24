import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface CachedProfile {
    name: string;
    avatar: string;
    lastUpdated: number;
}

class ProfileCacheService {
    private cachePath: string;
    private cache: Record<string, CachedProfile> = {};

    constructor() {
        this.cachePath = path.join(app.getPath('userData'), 'profile_cache.json');
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(this.cachePath)) {
                this.cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
            }
        } catch (e) {
            console.error('[CACHE] Erreur chargement cache:', e);
            this.cache = {};
        }
    }

    public save() {
        fs.promises.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2))
            .catch(e => {
                console.error('[CACHE] Erreur sauvegarde cache:', e);
            });
    }

    public get(id: string): CachedProfile | null {
        return this.cache[id] || null;
    }

    public set(id: string, name: string, avatar: string) {
        this.cache[id] = {
            name,
            avatar,
            lastUpdated: Date.now()
        };
        // Debounced save could be added, but manual save is fine for now
    }

    public clear() {
        this.cache = {};
        this.save();
    }
}

export const profileCache = new ProfileCacheService();
