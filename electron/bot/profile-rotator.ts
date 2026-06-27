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
        pausedUsernameUntil?: number,
        currentHouse?: string
    }) => void;
    private statePath: string;
    private state: RotatorState = { counter: 0, totalRotations: 0 };
    private nextTickTime: number = 0;
    private currentHouseIndex: number = 0;

    private privateModeGetter: () => boolean;

    constructor(
        client: Client, 
        userDataPath: string, 
        logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void,
        privateModeGetter: () => boolean
    ) {
        this.client = client;
        this.logCallback = logCallback;
        this.privateModeGetter = privateModeGetter;
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
        fs.promises.writeFile(this.statePath, JSON.stringify(this.state), 'utf-8')
            .catch(e => {
                console.error('[ROTATOR] Erreur sauvegarde state:', e);
            });
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

        if (!this.config.stats.lastStatsReset || this.config.stats.lastStatsReset < startOfDay) {
            this.config.stats.messagesToday = 0;
            this.config.stats.lastStatsReset = now;
        }

        this.config.stats.messagesToday++;
        this.config.stats.totalMessages++;
    }

    private formatImage(url: string | undefined): string | undefined {
        if (!url) return undefined;
        if (url.startsWith('mp:')) return url;
        if (url.startsWith('http')) {
            return `mp:external/${Buffer.from(url).toString('base64')}/https/${url.replace(/^https?:\/\//, '')}`;
        }
        return url; 
    }

    public start(config: RotatorConfig) {
        this.stop();
        this.config = config;
        this.isRunning = true;
        this.logCallback(`[ROTATOR PRO] Démarrage (Intervalle: ${config.interval}s)`, 'info');
        
        this.startPulse();
        this.run();
    }

    public updateConfig(newConfig: RotatorConfig) {
        if (!this.config) {
            this.config = newConfig;
        } else {
            const intervalChanged = newConfig.interval !== this.config.interval;
            
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

    private sanitize(text: string): string {
        if (!text) return '';
        if (this.privateModeGetter && this.privateModeGetter()) {
            return text.replace(/opsec\s*pro/gi, '');
        }
        return text;
    }

    private resolveVariables(text: string): string {
        if (!text) return '';
        const now = new Date();
        let resolved = text.replace(/{time}/g, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        resolved = resolved.replace(/{date}/g, now.toLocaleDateString());
        resolved = resolved.replace(/{counter}/g, this.state.counter.toString());
        const emojis = ['⚡', '🛡️', '🛰️', '💎', '🔥', '🌀', '🌊', '🌈', '✨', '🍀'];
        resolved = resolved.replace(/{random}/g, () => emojis[Math.floor(Math.random() * emojis.length)]);
        if (this.config) {
            resolved = resolved.replace(/{messages_today}/g, this.config.stats.messagesToday.toString());
            resolved = resolved.replace(/{total_messages}/g, this.config.stats.totalMessages.toString());
        }
        return this.sanitize(resolved);
    }

    private async run() {
        if (!this.isRunning || !this.config) return;

        try {
            await this.applyCycle();
        } catch (e: any) {
            this.logCallback(`[ROTATOR PRO ERROR] ${e.message}`, 'error');
        }

        let jitter = 0;
        if (this.config.interval >= 10) {
            jitter = (Math.random() * 10 - 5) * 1000;
        } else if (this.config.interval > 0) {
            jitter = (Math.random() * 0.1 - 0.05) * (this.config.interval * 1000);
        }
        const delay = Math.max(50, (this.config.interval * 1000) + jitter);
        
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
            const statusText = cfg.statuses[cfg.currentStatusIndex % cfg.statuses.length];
            const resolved = this.resolveVariables(statusText);
            try {
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
            const bioText = cfg.bios[cfg.currentBioIndex % cfg.bios.length];
            if (bioText && bioText.trim() !== '') {
                const resolved = this.resolveVariables(bioText);
                try {
                    await (this.client as any).api.users['@me'].profile.patch({ 
                        data: { bio: resolved } 
                    });
                    this.logCallback(`[IDENTITY] Bio mise a jour`, 'info');
                    changedSomething = true;
                } catch (e: any) {
                    this.logCallback(`[IDENTITY ERROR] Echec Bio: ${e.message}`, 'error');
                }
            }
            cfg.currentBioIndex = (cfg.currentBioIndex + 1) % cfg.bios.length;
        }

        // 3. Update Global Name (Pseudo) - COOLDOWN Strict
        if (cfg.enabledSections.username && cfg.usernames.length > 0) {
            const now = Date.now();
            if (cfg.pausedUsernameUntil && now < cfg.pausedUsernameUntil) {
                // Cooldown actif
            } else {
                const nameText = cfg.usernames[cfg.currentUsernameIndex % cfg.usernames.length];
                const resolved = this.resolveVariables(nameText);
                try {
                    await (this.client as any).api.users['@me'].patch({
                        data: { global_name: resolved }
                    });
                    this.logCallback(`[IDENTITY] Pseudo → ${resolved}`, 'info');
                    changedSomething = true;
                    cfg.pausedUsernameUntil = now + (30 * 60 * 1000); // 30 min cooldown
                } catch (e: any) {
                    this.logCallback(`[IDENTITY ERROR] Échec Pseudo (Rate-Limit probable): ${e.message}`, 'error');
                    if (e.status === 429) cfg.pausedUsernameUntil = now + (60 * 60 * 1000);
                }
                cfg.currentUsernameIndex = (cfg.currentUsernameIndex + 1) % cfg.usernames.length;
            }
        }

        // 4. (Removed HypeSquad Rotation - now manual)

        // 5. Update Clan Tag (Discord CLANS)
        if (cfg.enabledSections.clanTag && cfg.clanTags && cfg.clanTags.length > 0) {
            const guildId = cfg.clanTags[cfg.currentClanTagIndex % cfg.clanTags.length];
            try {
                // Method A: Dedicated Clan Endpoint (PUT /users/@me/clan)
                await (this.client as any).api.users['@me'].clan.put({
                    data: {
                        identity_guild_id: guildId,
                        identity_enabled: true
                    }
                });
                this.logCallback(`[IDENTITY] Clan Tag -> Change vers ${guildId}`, 'success');
                changedSomething = true;
            } catch (e: any) {
                try {
                    // Method B: Newer Clan Endpoint (POST /users/@me/clan/identity)
                    await (this.client as any).api.users['@me'].clan.identity.post({
                        data: {
                            identity_guild_id: guildId,
                            identity_enabled: true
                        }
                    });
                    this.logCallback(`[IDENTITY] Clan Tag (V2) -> Change vers ${guildId}`, 'success');
                    changedSomething = true;
                } catch (e2: any) {
                    // Fallback to Method C: User Settings (Old Primary Guild Tag)
                    try {
                        await (this.client as any).api.users['@me'].settings.patch({ 
                            data: { primary_guild_id: guildId } 
                        });
                        this.logCallback(`[IDENTITY] Clan Tag (Legacy) -> Change vers ${guildId}`, 'success');
                        changedSomething = true;
                    } catch (err: any) {
                        this.logCallback(`[IDENTITY ERROR] Echec Clan Tag : ${err.message || e.message}`, 'error');
                    }
                }
            }
            cfg.currentClanTagIndex = (cfg.currentClanTagIndex + 1) % cfg.clanTags.length;
        }

        // 6. Update Custom RPC
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
                if (rpc.showTimestamp) presence.timestamps = { start: Date.now() };
                const appId = rpc.applicationId || "0";
                
                const existingCustom = this.client.user.presence?.activities.find((a: any) => 
                    a.type === 'CUSTOM' || a.name === 'Custom Status' || a.id === 'custom'
                );

                const activities: any[] = [{
                    name: presence.name,
                    type: presence.type,
                    details: presence.details,
                    state: presence.state,
                    assets: {
                        largeImage: presence.assets.large_image,
                        largeText: presence.assets.large_text,
                        smallImage: presence.assets.small_image,
                        smallText: presence.assets.small_text
                    },
                    timestamps: presence.timestamps,
                    applicationId: appId !== "0" ? appId : undefined
                }];

                if (existingCustom) {
                    activities.push(existingCustom);
                }

                (this.client.user as any).setPresence({ activities });
                changedSomething = true;
            } catch (e) {}
            cfg.currentActivityIndex = (cfg.currentActivityIndex + 1) % cfg.customRPCs.length;
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
            this.logCallback("[ROTATOR PRO] Cycle de force initié par l'utilisateur", 'warning');
            this.applyCycle();
        }
    }
}
