import { Client, ActivityType } from 'discord.js-selfbot-v13';
import { RotatorConfig } from '../../shared/types';
import fs from 'fs';
import path from 'path';

interface RotatorState {
    counter: number;
    totalRotations: number;
}

export class ProfileRotator {
    private client: Client;
    private config: RotatorConfig | null = null;
    private isRunning: boolean = false;
    private timer: NodeJS.Timeout | null = null;
    private pulseTimer: NodeJS.Timeout | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    private pulseCallback?: (data: { 
        nextTick: number, 
        totalRotations: number, 
        lastRotationTime?: number, 
        pausedUsernameUntil?: number 
    }) => void;
    private statePath: string;
    private state: RotatorState = { counter: 0, totalRotations: 0 };
    private nextTickTime: number = 0;

    constructor(client: Client, userDataPath: string, logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.client = client;
        this.logCallback = logCallback;
        this.statePath = path.join(userDataPath, 'rotator_state.json');
        this.loadState();
    }

    private loadState() {
        try {
            if (fs.existsSync(this.statePath)) {
                const data = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
                this.state = { 
                    counter: data.counter || 0, 
                    totalRotations: data.totalRotations || 0 
                };
            }
        } catch (e) {
            console.error('[ROTATOR] Erreur chargement state:', e);
        }
    }

    private saveState() {
        try {
            fs.writeFileSync(this.statePath, JSON.stringify(this.state), 'utf-8');
        } catch (e) {
            console.error('[ROTATOR] Erreur sauvegarde state:', e);
        }
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }

    public setPulseCallback(callback: (data: any) => void) {
        this.pulseCallback = callback;
    }

    public incrementMessageStats() {
        if (!this.config) return;
        
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);

        // Reset quotidien des stats si nécessaire
        if (!this.config.stats.lastStatsReset || this.config.stats.lastStatsReset < startOfDay) {
            this.config.stats.messagesToday = 0;
            this.config.stats.lastStatsReset = now;
        }

        this.config.stats.messagesToday++;
        this.config.stats.totalMessages++;
        
        // Save stats to config (debounced ideally, but here direct for simplicity)
    }

    private formatImage(url: string | undefined): string | undefined {
        if (!url) return undefined;
        if (url.startsWith('mp:')) return url;
        if (url.startsWith('http')) {
            // Format Media Proxy Discord (mp:external/...)
            return `mp:external/${Buffer.from(url).toString('base64')}/https/${url.replace(/^https?:\/\//, '')}`;
        }
        return url; // Asset key
    }

    public start(config: RotatorConfig) {
        this.stop();
        this.config = config;
        this.isRunning = true;
        this.logCallback(`[ROTATOR PRO] Démarrage (Intervalle: ${config.interval}s)`, 'info');
        
        // Start Pulse Timer (1s)
        this.startPulse();
        this.run();
    }

    public updateConfig(newConfig: RotatorConfig) {
        if (!this.config) {
            this.config = newConfig;
        } else {
            const intervalChanged = newConfig.interval !== this.config.interval;
            
            // Hotswap : Maintien des indices actuels
            this.config = {
                ...newConfig,
                currentStatusIndex: this.config.currentStatusIndex,
                currentBioIndex: this.config.currentBioIndex,
                currentUsernameIndex: this.config.currentUsernameIndex,
                currentActivityIndex: this.config.currentActivityIndex,
                currentClanTagIndex: this.config.currentClanTagIndex,
                pausedUsernameUntil: this.config.pausedUsernameUntil,
                lastRotationTime: this.config.lastRotationTime,
                stats: this.config.stats
            };

            // Si l'intervalle a changé et que le système tourne, on reset le timer
            if (intervalChanged && this.isRunning) {
                this.logCallback(`[ROTATOR PRO] Intervalle mis à jour → ${newConfig.interval}s`, 'info');
                if (this.timer) clearTimeout(this.timer);
                this.run();
            }
        }
    }

    public stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.pulseTimer) {
            clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }
    }

    private startPulse() {
        if (this.pulseTimer) clearInterval(this.pulseTimer);
        this.pulseTimer = setInterval(() => {
            if (this.pulseCallback && this.config) {
                this.pulseCallback({
                    nextTick: this.nextTickTime,
                    totalRotations: this.state.totalRotations,
                    lastRotationTime: this.config.lastRotationTime,
                    pausedUsernameUntil: this.config.pausedUsernameUntil
                });
            }
        }, 1000);
    }

    private resolveVariables(text: string): string {
        if (!text) return '';
        const now = new Date();
        
        // {time} -> HH:MM
        let resolved = text.replace(/{time}/g, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // {date} -> DD/MM/YYYY
        resolved = resolved.replace(/{date}/g, now.toLocaleDateString());
        
        // {counter}
        resolved = resolved.replace(/{counter}/g, this.state.counter.toString());
        
        // {random} -> Emoji aléatoire
        const emojis = ['⚡', '🛡️', '🛰️', '💎', '🔥', '🌀', '🌊', '🌈', '✨', '🍀'];
        resolved = resolved.replace(/{random}/g, () => emojis[Math.floor(Math.random() * emojis.length)]);

        // Statistics Variables (rpcStats style)
        if (this.config) {
            resolved = resolved.replace(/{messages_today}/g, this.config.stats.messagesToday.toString());
            resolved = resolved.replace(/{total_messages}/g, this.config.stats.totalMessages.toString());
        }
        
        return resolved;
    }

    private parseActivity(text: string): { name: string, type: number } {
        const lower = text.toLowerCase();
        let name = text;
        let type = 0; // PLAYING

        if (lower.startsWith('playing ')) {
            name = text.substring(8);
            type = 0;
        } else if (lower.startsWith('watching ')) {
            name = text.substring(9);
            type = 3;
        } else if (lower.startsWith('listening to ')) {
            name = text.substring(13);
            type = 2;
        } else if (lower.startsWith('competing in ')) {
            name = text.substring(13);
            type = 5;
        }

        return { name, type };
    }

    private async run() {
        if (!this.isRunning || !this.config) return;

        try {
            await this.applyCycle();
        } catch (e: any) {
            this.logCallback(`[ROTATOR PRO ERROR] ${e.message}`, 'error');
        }

        // Jitter humain +/- 5s
        const jitter = (Math.random() * 10 - 5) * 1000;
        const delay = Math.max(2000, (this.config.interval * 1000) + jitter);
        
        this.nextTickTime = Date.now() + delay;
        this.timer = setTimeout(() => this.run(), delay);
    }

    private async applyCycle() {
        if (!this.client.user || !this.config) return;
        
        this.logCallback("[ROTATOR] Déclenchement du cycle...", "info");
        let changedSomething = false;
        const cfg = this.config;

        // 1. Update Custom Status
        if (cfg.enabledSections.status && cfg.statuses.length > 0) {
            const statusText = cfg.statuses[cfg.currentStatusIndex];
            const resolved = this.resolveVariables(statusText);
            try {
                // Utilisation du module settings correct
                await (this.client as any).settings.setCustomStatus({ text: resolved });
                this.logCallback(`[IDENTITY] Statut → ${resolved}`, 'info');
                changedSomething = true;
            } catch (e: any) {
                this.logCallback(`[IDENTITY ERROR] Échec Statut: ${e.message}`, 'error');
            }
            cfg.currentStatusIndex = (cfg.currentStatusIndex + 1) % cfg.statuses.length;
        }

        // 2. Update Bio
        if (cfg.enabledSections.bio && cfg.bios.length > 0) {
            const bioText = cfg.bios[cfg.currentBioIndex];
            if (bioText && bioText.trim() !== '') {
                const resolved = this.resolveVariables(bioText);
                try {
                    await (this.client as any).settings.setBio(resolved);
                    this.logCallback(`[IDENTITY] Bio mise à jour`, 'info');
                    changedSomething = true;
                } catch (e: any) {
                    this.logCallback(`[IDENTITY ERROR] Échec Bio: ${e.message}`, 'error');
                }
            }
            cfg.currentBioIndex = (cfg.currentBioIndex + 1) % cfg.bios.length;
        }

        // 3. Update Global Name (Pseudo) - avec COOLDOWN 30min
        if (cfg.enabledSections.username && cfg.usernames.length > 0) {
            const now = Date.now();
            if (cfg.pausedUsernameUntil && now < cfg.pausedUsernameUntil) {
                // Skip username rotation (cooldown)
            } else {
                const nameText = cfg.usernames[cfg.currentUsernameIndex];
                const resolved = this.resolveVariables(nameText);
                try {
                    await (this.client as any).settings.setGlobalName(resolved);
                    this.logCallback(`[IDENTITY] Pseudo → ${resolved}`, 'info');
                    changedSomething = true;
                    // Cooldown forcé de 30 min après chaque succès pour le pseudo
                    cfg.pausedUsernameUntil = now + (30 * 60 * 1000);
                } catch (e: any) {
                    this.logCallback(`[IDENTITY ERROR] Échec Pseudo: ${e.message}`, 'error');
                    if (e.status === 429) {
                        cfg.pausedUsernameUntil = now + (60 * 60 * 1000);
                    }
                }
                cfg.currentUsernameIndex = (cfg.currentUsernameIndex + 1) % cfg.usernames.length;
            }
        }

        // 4. Update Custom RPC (Equicord Style)
        if (cfg.enabledSections.activity && cfg.customRPCs && cfg.customRPCs.length > 0) {
            const rpc = cfg.customRPCs[cfg.currentActivityIndex % cfg.customRPCs.length];
            
            try {
                const presence: any = {
                    name: this.resolveVariables(rpc.name),
                    type: rpc.type as any,
                    details: this.resolveVariables(rpc.details || ''),
                    state: this.resolveVariables(rpc.state || ''),
                    assets: {
                        large_image: this.formatImage(rpc.largeImage),
                        large_text: this.resolveVariables(rpc.largeText || ''),
                        small_image: this.formatImage(rpc.smallImage),
                        small_text: this.resolveVariables(rpc.smallText || '')
                    }
                };

                // Timestamps (Elapsed time)
                if (rpc.showTimestamp) {
                    presence.timestamps = { start: Date.now() }; // In selfbots, 'start' alone creates the elapsed counter
                }

                // Application ID Support (Stealth 0 or Custom)
                const appId = rpc.applicationId || "0";
                
                // Inject via Internal API (Selfbot specific for advanced RPC)
                await (this.client as any).api.users['@me'].settings.patch({
                    data: {
                        custom_status: undefined, // Don't overwrite basic status
                    }
                });

                this.client.user.setActivity(presence.name, {
                    type: presence.type,
                    details: presence.details,
                    state: presence.state,
                    assets: presence.assets,
                    timestamps: presence.timestamps,
                    applicationId: appId !== "0" ? appId : undefined
                } as any);

                changedSomething = true;
            } catch (e) {}
            cfg.currentActivityIndex = (cfg.currentActivityIndex + 1) % cfg.customRPCs.length;
        }

        // 5. Update Clan Tag (Primary Guild) - avec COOLDOWN 30min (Même que Pseudo)
        if (cfg.enabledSections.clanTag && cfg.clanTags && cfg.clanTags.length > 0) {
            const now = Date.now();
            // On réutilise le même cooldown que pour le pseudo par sécurité (Discord est strict sur l'identité)
            if (cfg.pausedUsernameUntil && now < cfg.pausedUsernameUntil) {
                // Skip clan tag rotation during shared identity cooldown
            } else {
                const guildId = cfg.clanTags[cfg.currentClanTagIndex];
                try {
                    await (this.client as any).settings.setPrimaryGuild(guildId);
                    this.logCallback(`[IDENTITY] Clan Tag → Changé (Guild: ${guildId})`, 'info');
                    changedSomething = true;
                    // On définit le cooldown partagé si ce n'est pas déjà fait
                    if (!cfg.pausedUsernameUntil) cfg.pausedUsernameUntil = now + (30 * 60 * 1000);
                } catch (e: any) {
                    this.logCallback(`[IDENTITY ERROR] Échec Clan Tag: ${e.message}`, 'error');
                    if (e.status === 429) {
                        cfg.pausedUsernameUntil = now + (60 * 60 * 1000);
                    }
                }
                cfg.currentClanTagIndex = (cfg.currentClanTagIndex + 1) % cfg.clanTags.length;
            }
        }

        if (changedSomething) {
            this.state.counter++;
            this.state.totalRotations++;
            cfg.lastRotationTime = Date.now();
            this.saveState();
        }
    }

    public forceUpdate() {
        if (this.isRunning) {
            this.applyCycle();
        }
    }
}
