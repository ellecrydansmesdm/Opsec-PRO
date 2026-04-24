import { Client, Presence } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

interface LRCLibResponse {
    syncedLyrics?: string;
    plainLyrics?: string;
}

interface ParsedLyricInfo {
    timeMs: number;
    text: string;
}

export class SpotifyService {
    private client: Client;
    private isRunning: boolean = false;
    private currentTrackState: string | null = null;
    private lyrics: ParsedLyricInfo[] = [];
    private interval: NodeJS.Timeout | null = null;
    private lastSpotifyActivity: any = null;
    private _debugTick: number = 0;
    private botService: any;
    private localTrackInfo: { artist: string; title: string; startTime: number } | null = null;
    private lyricsService: any;

    constructor(client: Client, botService?: any) {
        this.client = client;
        this.botService = botService;
        this.lyricsService = new (require('../services/lyrics-service').LyricsService)(require('electron').app.getPath('userData'));
        
        // Listen to own presence updates
        this.client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (!this.isRunning || !newPresence) return;
            if (newPresence.userId !== this.client.user?.id) return;
            
            const spotifyActivity = newPresence.activities.find(a => 
                (a.name === 'Spotify' && a.type === 'LISTENING') || 
                (a.id && a.id.startsWith('spotify:'))
            );
            
            this.lastSpotifyActivity = spotifyActivity || null;
            
            if (spotifyActivity) {
               // Trigger immediate sync on update
               this.syncLyrics();
            }
        });
    }

    public setConfig(spDc: string | null) {
        // Obsolete
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log('Spotify Synced Lyrics activé via Discord Presence.', 'success');
        
        // Initial check
        if (this.client.user?.presence) {
            this.lastSpotifyActivity = this.client.user.presence.activities.find(a => 
                (a.name === 'Spotify' && a.type === 'LISTENING') || 
                (a.id && a.id.startsWith('spotify:'))
            ) || null;
        }

        this.runLoop();
    }

    public stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.currentTrackState = null;
        this.lastSpotifyActivity = null;
        this.log('Spotify Synced Lyrics désactivé.', 'info');
        
        // Reset status
        if (this.client.user) {
            this.client.user.setPresence({ activities: [] });
        }
    }

    private async runLoop() {
        if (this.interval) clearInterval(this.interval);
        
        let localCheckCounter = 0;

        // Fast polling loop to update the lyrics based on the cached activity
        this.interval = setInterval(() => {
            if (!this.isRunning) return;
            
            // Step 1: Force a local check (Every 3 seconds instead of every 1s to avoid high CPU usage)
            localCheckCounter++;
            if (localCheckCounter >= 6) {
                localCheckCounter = 0;
                this.checkLocalSpotify().catch(() => {});
            }
            
            // Step 2: Sync lyrics with whatever we found (Local or Discord)
            this.syncLyrics().catch(() => {});
        }, 500);
    }

    private async checkLocalSpotify() {
        if (process.platform !== 'win32') return;

        try {
            // we use PowerShell with UTF-8 OutputEncoding to keep accents (like 'é') intact.
            const { stdout } = await execAsync('powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Process Spotify -ErrorAction SilentlyContinue | Select-Object MainWindowTitle | ConvertTo-Json"');
            
            if (!stdout || stdout.trim() === '') return;

            let titles: any[] = [];
            try {
                const parsed = JSON.parse(stdout);
                titles = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                // If only one process, it might not be an array or might be malformed
                return;
            }

            let foundTitle: string | null = null;
            let foundArtist: string | null = null;

            for (const item of titles) {
                const fullTitle = item.MainWindowTitle?.trim();
                if (!fullTitle) continue;

                // Priority: If the title contains " - ", it MUST be the song
                if (fullTitle.includes(' - ')) {
                    const [artist, ...titleParts] = fullTitle.split(' - ');
                    foundArtist = artist.trim();
                    foundTitle = titleParts.join(' - ').trim();
                    break; // We found the song window!
                }
            }

            if (foundTitle && foundArtist) {
                if (!this.localTrackInfo || this.localTrackInfo.title !== foundTitle) {
                    this.log(`Détection locale (Radar) : ${foundTitle} par ${foundArtist}`, 'success');
                    this.localTrackInfo = {
                        artist: foundArtist,
                        title: foundTitle,
                        startTime: Date.now()
                    };
                }
            } else {
                if (this.localTrackInfo) {
                    this.log('Musique locale arrêtée.', 'info');
                    this.localTrackInfo = null;
                }
            }
        } catch (e) {
            // Silent fail for local check
        }
    }

    private async fetchLyrics(artist: string, track: string): Promise<ParsedLyricInfo[]> {
        try {
            // FUZZY SEARCH: Instead of a strict match, we search globally and pick the best synced result
            const query = `${artist} ${track}`.trim();
            const url = new URL('https://lrclib.net/api/search');
            url.searchParams.append('q', query);

            const res = await fetch(url.toString(), {
                headers: { 'User-Agent': 'OpsecPro/2.0 (Selfbot)' }
            });

            if (!res.ok) return [];
            
            const results = await res.json() as any[];
            if (!Array.isArray(results) || results.length === 0) return [];

            // Pick the first result that has synced lyrics
            const bestMatch = results.find(r => r.syncedLyrics) || results[0];
            
            if (bestMatch.syncedLyrics) {
                return this.parseLRC(bestMatch.syncedLyrics);
            }
            
            return [];
        } catch (e) {
            return [];
        }
    }

    private parseLRC(lrcText: string): ParsedLyricInfo[] {
        const lines = lrcText.split('\n');
        const parsed: ParsedLyricInfo[] = [];
        
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        
        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                let msStr = match[3];
                if (msStr.length === 2) msStr += '0';
                const milliseconds = parseInt(msStr, 10);
                
                const timeMs = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
                const text = line.replace(timeRegex, '').trim();
                
                if (text) {
                    parsed.push({ timeMs, text });
                }
            }
        }
        
        return parsed.sort((a, b) => a.timeMs - b.timeMs);
    }

    private async syncLyrics() {
        if (!this.client.user || !this.client.token || !this.isRunning) return;

        // --- SOURCE MERGING ---
        // We try Discord Activity first, but if empty, we fall back to Local Tracking
        let spotifyActivity = this.lastSpotifyActivity || this.client.user.presence?.activities.find(a => 
            (a.name === 'Spotify' && a.type === 'LISTENING') || 
            (a.id && a.id.startsWith('spotify:'))
        );

        // If Discord says NOTHING, but our local tracker has a song, we create a dummy activity object
        if (!spotifyActivity && this.localTrackInfo) {
            spotifyActivity = {
                state: this.localTrackInfo.artist,
                details: this.localTrackInfo.title,
                timestamps: { start: this.localTrackInfo.startTime },
                isLocal: true // Tag to avoid using it for permanent loops
            };
        }

        // DIAGNOSTIC LOG (Toutes les 10 minutes / 1200 ticks @ 500ms)
        this._debugTick++;
        if (this._debugTick % 1200 === 0) {
            const source = spotifyActivity?.isLocal ? 'WINDOWS_LOCAL' : 'DISCORD_GATEWAY';
            // Silent diagnostic in developer console
            console.log(`[Spotify] DIAGNOSTIC: Source: ${source} | Presence: ${spotifyActivity ? 'ACTIVE' : 'NONE'}`);
        }

        if (!spotifyActivity || !spotifyActivity.timestamps?.start) {
            // User is not listening to Spotify or it ended
            if (this.currentTrackState) {
                this.log('Musique arrêtée ou non détectée.', 'info');
                this.currentTrackState = null;
                this.lyrics = [];
                // Clear custom status if we were lyrics syncing (regardless of logo)
                const currentPresence = this.client.user.presence;
                const currentStatus = currentPresence?.activities.find((a: any) => a.type === 'CUSTOM' || (a.type as any) === 4)?.state;
                
                // If the current status is one of our lyrics, clear it. 
                // Since we don't have the icon anymore, we check if it's NOT an empty string.
                if (currentStatus) {
                    this.log('Nettoyage du statut personnalisé...', 'info');
                    this.botService.updateCustomStatus('', true);
                    
                    // On retente une fois après 2s pour être CERTAIN que Discord a pris le changement
                    setTimeout(() => {
                        this.botService.updateCustomStatus('', true);
                    }, 2000);
                }
            }
            return;
        }

        const artist = spotifyActivity.state;
        const title = spotifyActivity.details;
        const trackState = `${artist} - ${title}`;

        // If the song changed, fetch new lyrics
        if (trackState !== this.currentTrackState) {
            this.currentTrackState = trackState;
            this.lyrics = []; // Clear immediately to avoid stale ones during fetch
            this.botService.updateCustomStatus('', true); // Clear status immediately
            
            this.log(`Lecture détectée : ${title} par ${artist}`, 'info');
            
            // 1. Check local storage first
            const localLrc = this.lyricsService.getCustomLyrics(artist || '', title || '');
            if (localLrc) {
                this.log(`Paroles locales (.lrc) trouvées pour : ${title}`, 'success');
                this.lyrics = this.parseLRC(localLrc);
            } else {
                // 2. Fallback to LRCLIB
                this.lyrics = await this.fetchLyrics(artist || '', title || '');
                if (this.lyrics.length === 0) {
                     this.log(`Aucune parole trouvées (en ligne ou local) pour : ${title} - ${artist}.`, 'info');
                     // STRICT MODE: If no lyrics found, we must not show anything
                     this.botService.updateCustomStatus('', true);
                } else {
                     this.log(`Paroles trouvées sur LRCLIB ! (${this.lyrics.length} lignes)`, 'success');
                }
            }
        }

        // --- DYNAMIC STATUS UPDATE ---
        let currentText = '';

        if (this.lyrics.length > 0) {
            // mode: Paroles Synchronisées
            const startRaw = spotifyActivity.timestamps.start as any;
            const startTime = typeof startRaw === 'number' ? startRaw : new Date(startRaw).getTime();
            
            // OPSEC MAGIC: Add an offset (+800ms) to compensate for Discord's API rate limit and visual delay.
            // This ensures the lyrics appear on screen at the exact millisecond they are sung.
            const progressMs = Date.now() - startTime + 800; 

            for (let i = 0; i < this.lyrics.length; i++) {
                if (this.lyrics[i].timeMs <= progressMs) {
                    // Direct Flow: No gap, just show the current phrase
                    currentText = this.lyrics[i].text;
                } else {
                    break;
                }
            }
        } 

        if (currentText) {
            // No emoji icon, just the clean phrase
            this.botService.updateCustomStatus(currentText, true);
        } else {
            // In Instrumental or end, clear status
            this.botService.updateCustomStatus('', true);
        }
    }

    private log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
        if (this.botService && this.botService.log) {
            this.botService.log(`[Spotify] ${msg}`, type);
        } else {
            console.log(chalk.green(`[SPOTIFY] ${msg}`));
        }
    }
}
