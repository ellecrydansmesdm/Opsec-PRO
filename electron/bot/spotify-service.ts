import { Client, Presence } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import { LyricsService, CustomLyricEntry } from '../services/lyrics-service';
import { SpotifyConfig, SpotifyLiveStatus } from '../../shared/types';

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
    public lyricsService: LyricsService;

    // Advanced Configuration
    private config: SpotifyConfig = {
        enabled: false,
        prefix: '🎵 ',
        offsetMs: 800,
        fallbackMode: 'song_info',
        customFallback: 'Listening to Spotify 🎧',
        showInstrumental: true,
        instrumentalText: '🎶 (Instrumental)',
        cleanActivity: true,
        sourceMode: 'auto'
    };

    // Live Telemetry Cache
    private liveStatusCache: SpotifyLiveStatus = {
        isRunning: false,
        isConnected: false,
        source: 'NONE',
        track: null
    };

    private boundPresenceUpdate = (oldPresence: any, newPresence: any) => {
        if (!this.isRunning || !newPresence) return;
        if (newPresence.userId !== this.client.user?.id) return;
        
        const spotifyActivity = newPresence.activities.find((a: any) => 
            (a.name === 'Spotify' && a.type === 'LISTENING') || 
            (a.id && a.id.startsWith('spotify:'))
        );
        
        if (spotifyActivity) {
            this.lastSpotifyActivity = spotifyActivity;
            
            // Suppress "Listening to Spotify" from showing on the Discord profile if cleanActivity is true
            if (this.config.cleanActivity) {
                const cleanActivities = newPresence.activities.filter((a: any) => 
                    a.name !== 'Spotify' && !(a.id && a.id.startsWith('spotify:'))
                );
                
                if (cleanActivities.length !== newPresence.activities.length) {
                    (this.client.user as any).setPresence({ activities: cleanActivities }).catch(() => {});
                }
            }
            
            this.syncLyrics();
        }
    };

    constructor(client: Client, botService?: any) {
        this.client = client;
        this.botService = botService;
        this.lyricsService = new LyricsService(app.getPath('userData'));
        
        // Listen to own presence updates
        this.client.on('presenceUpdate', this.boundPresenceUpdate);
    }

    public setConfig(config?: Partial<SpotifyConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }

    public getConfig(): SpotifyConfig {
        return { ...this.config };
    }

    public getLiveStatus(): SpotifyLiveStatus {
        return {
            ...this.liveStatusCache,
            isRunning: this.isRunning,
            isConnected: !!this.client?.user
        };
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log('Spotify Synced Lyrics Pro activé.', 'success');
        
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
        this.liveStatusCache = {
            isRunning: false,
            isConnected: !!this.client?.user,
            source: 'NONE',
            track: null
        };
        this.log('Spotify Synced Lyrics désactivé.', 'info');
        
        // Reset status
        if (this.client.user) {
            this.botService.updateCustomStatus('', true);
        }
    }

    public destroy() {
        this.stop();
        this.client.off('presenceUpdate', this.boundPresenceUpdate);
    }

    private async runLoop() {
        if (this.interval) clearInterval(this.interval);
        
        let localCheckCounter = 0;

        // Fast polling loop to update the lyrics based on the cached activity
        this.interval = setInterval(() => {
            if (!this.isRunning) return;
            
            // Step 1: Force a local check (Every 3 seconds instead of every 1s to avoid CPU overhead)
            localCheckCounter++;
            if (localCheckCounter >= 6) {
                localCheckCounter = 0;
                if (this.config.sourceMode !== 'gateway') {
                    this.checkLocalSpotify().catch(() => {});
                }
            }
            
            // Step 2: Sync lyrics with whatever we found (Local or Discord)
            this.syncLyrics().catch(() => {});
        }, 500);
    }

    private async checkLocalSpotify() {
        if (process.platform !== 'win32') return;

        try {
            const { stdout } = await execAsync('cmd /c chcp 65001 >nul && tasklist /FI "IMAGENAME eq Spotify.exe" /V /FO CSV');
            
            if (!stdout || !stdout.includes('Spotify.exe')) return;

            const lines = stdout.split('\r\n').filter((l: string) => l.includes('Spotify.exe'));
            let foundTitle: string | null = null;
            let foundArtist: string | null = null;

            for (const line of lines) {
                const parts = line.split('","');
                if (parts.length < 9) continue;
                const fullTitle = parts[8].replace(/"/g, '').trim();
                if (!fullTitle || fullTitle === 'Spotify Free' || fullTitle === 'Spotify Premium' || fullTitle === 'Spotify') continue;

                if (fullTitle.includes(' - ')) {
                    const [artist, ...titleParts] = fullTitle.split(' - ');
                    foundArtist = artist.trim();
                    foundTitle = titleParts.join(' - ').trim();
                    break;
                }
            }

            if (foundTitle && foundArtist) {
                if (!this.localTrackInfo || this.localTrackInfo.title !== foundTitle) {
                    this.log(`Détection locale (Radar Process) : ${foundTitle} par ${foundArtist}`, 'success');
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
            const query = `${artist} ${track}`.trim();
            const url = new URL('https://lrclib.net/api/search');
            url.searchParams.append('q', query);

            const res = await fetch(url.toString(), {
                headers: { 'User-Agent': 'OpsecPro/2.0 (Discord-Selfbot-Toolkit)' }
            });

            if (!res.ok) return [];
            
            const results = await res.json() as any[];
            if (!Array.isArray(results) || results.length === 0) return [];

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

    private formatLyricStatus(rawText: string, artist: string, title: string): string {
        if (!rawText) return '';
        const prefix = this.config.prefix || '';
        
        // Formatter presets
        if (prefix === '[ {lyrics} ]') return `[ ${rawText} ]`;
        if (prefix === '« {lyrics} »') return `« ${rawText} »`;
        if (prefix === '✨ {lyrics}') return `✨ ${rawText}`;
        if (prefix === '🎶 {lyrics}') return `🎶 ${rawText}`;
        
        return `${prefix}${rawText}`.trim();
    }

    private async syncLyrics() {
        if (!this.client.user || !this.client.token || !this.isRunning) return;

        // --- SOURCE RESOLUTION ---
        let spotifyActivity = this.lastSpotifyActivity || this.client.user.presence?.activities.find(a => 
            (a.name === 'Spotify' && a.type === 'LISTENING') || 
            (a.id && a.id.startsWith('spotify:'))
        );

        let source: 'DISCORD_GATEWAY' | 'WINDOWS_LOCAL' | 'NONE' = spotifyActivity ? 'DISCORD_GATEWAY' : 'NONE';

        if (!spotifyActivity && this.localTrackInfo && this.config.sourceMode !== 'gateway') {
            spotifyActivity = {
                state: this.localTrackInfo.artist,
                details: this.localTrackInfo.title,
                timestamps: { start: this.localTrackInfo.startTime },
                isLocal: true
            };
            source = 'WINDOWS_LOCAL';
        }

        if (!spotifyActivity || !spotifyActivity.timestamps?.start) {
            if (this.currentTrackState) {
                this.log('Musique arrêtée ou non détectée.', 'info');
                this.currentTrackState = null;
                this.lyrics = [];
                this.liveStatusCache = {
                    isRunning: this.isRunning,
                    isConnected: !!this.client?.user,
                    source: 'NONE',
                    track: null
                };
                
                this.botService.updateCustomStatus('', true);
                setTimeout(() => this.botService.updateCustomStatus('', true), 2000);
            }
            return;
        }

        const artist = spotifyActivity.state || 'Unknown Artist';
        const title = spotifyActivity.details || 'Unknown Title';
        const trackState = `${artist} - ${title}`;

        // If the song changed, fetch new lyrics
        if (trackState !== this.currentTrackState) {
            this.currentTrackState = trackState;
            this.lyrics = [];
            this.botService.updateCustomStatus('', true);
            
            this.log(`Lecture détectée : ${title} par ${artist}`, 'info');
            
            // 1. Check local storage first
            const localLrc = this.lyricsService.getCustomLyrics(artist, title);
            if (localLrc) {
                this.log(`Paroles locales (.lrc) trouvées pour : ${title}`, 'success');
                this.lyrics = this.parseLRC(localLrc);
            } else {
                // 2. Fallback to LRCLIB
                this.lyrics = await this.fetchLyrics(artist, title);
                if (this.lyrics.length === 0) {
                     this.log(`Aucune parole trouvée pour : ${title} - ${artist}.`, 'info');
                     
                     // Fallback handling
                     if (this.config.fallbackMode === 'song_info') {
                         this.botService.updateCustomStatus(`🎵 ${title} - ${artist}`, true);
                     } else if (this.config.fallbackMode === 'custom' && this.config.customFallback) {
                         this.botService.updateCustomStatus(this.config.customFallback, true);
                     } else {
                         this.botService.updateCustomStatus('', true);
                     }
                } else {
                     this.log(`Paroles synchronisées chargées (${this.lyrics.length} lignes)`, 'success');
                }
            }
        }

        // --- DYNAMIC STATUS UPDATE ---
        let currentText = '';
        let nextText = '';
        let currentLyricIdx = -1;

        const startRaw = spotifyActivity.timestamps.start as any;
        const startTime = typeof startRaw === 'number' ? startRaw : new Date(startRaw).getTime();
        const offset = typeof this.config.offsetMs === 'number' ? this.config.offsetMs : 800;
        const progressMs = Math.max(0, Date.now() - startTime + offset);

        if (this.lyrics.length > 0) {
            for (let i = 0; i < this.lyrics.length; i++) {
                if (this.lyrics[i].timeMs <= progressMs) {
                    currentText = this.lyrics[i].text;
                    currentLyricIdx = i;
                } else {
                    nextText = this.lyrics[i].text;
                    break;
                }
            }

            // Check for long instrumental gap
            if (currentLyricIdx >= 0 && nextText) {
                const nextTime = this.lyrics[currentLyricIdx + 1]?.timeMs || 0;
                if (nextTime - progressMs > 9000 && this.config.showInstrumental) {
                    currentText = this.config.instrumentalText || '🎶 (Instrumental)';
                }
            }
        } else {
            if (this.config.fallbackMode === 'song_info') {
                currentText = `${title} - ${artist}`;
            } else if (this.config.fallbackMode === 'custom') {
                currentText = this.config.customFallback || '';
            }
        }

        // Update live telemetry cache for UI
        this.liveStatusCache = {
            isRunning: this.isRunning,
            isConnected: !!this.client?.user,
            source,
            track: {
                title,
                artist,
                album: spotifyActivity.assets?.large_text || spotifyActivity.sync_id || '',
                progressMs: Math.max(0, Date.now() - startTime),
                durationMs: spotifyActivity.timestamps?.end ? (new Date(spotifyActivity.timestamps.end).getTime() - startTime) : 0,
                currentLyric: currentText,
                nextLyric: nextText,
                hasSyncedLyrics: this.lyrics.length > 0,
                lyricsCount: this.lyrics.length
            }
        };

        if (currentText) {
            const formatted = this.formatLyricStatus(currentText, artist, title);
            this.botService.updateCustomStatus(formatted, true);
        } else {
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
