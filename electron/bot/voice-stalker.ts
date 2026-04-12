import { Client } from 'discord.js-selfbot-v13';
import { FarmerConfig } from '../../shared/types';

export type FarmerStatus = 'connected' | 'idle' | 'hopping';

export class VoiceStalker {
    private client: Client;
    private status: FarmerStatus = 'idle';
    private currentGuildId: string | null = null;
    private currentChannelId: string | null = null;
    private startTime: number | null = null;
    private config: FarmerConfig | null = null;
    private hopperTimer: NodeJS.Timeout | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
        this.setupListeners();
    }

    public updateConfig(config: FarmerConfig) {
        this.config = config;
        if (config.vocalHopper.enabled && config.enabled) {
            this.startHopper();
        } else if (config.enabled && config.vocalHopper.channelIds.length > 0) {
            // Standard single channel join if hopper is off but farmer is on
            if (this.status === 'idle') {
                this.joinAFK(config.vocalHopper.channelIds[0]);
            }
        } else if (!config.enabled) {
            this.leaveAFK();
            this.stopHopper();
        }
    }

    private setupListeners() {
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            if (this.status === 'idle' || !this.currentChannelId) return;

            if (newState.member?.id === this.client.user?.id) {
                if (!newState.channelId) {
                    this.logCallback(`[AFK] Déconnexion détectée. Reconnexion dans 5s...`, 'error');
                    setTimeout(() => {
                        if (this.status !== 'idle' && this.currentChannelId) {
                            this.joinAFK(this.currentChannelId);
                        }
                    }, 5000);
                }
            }
        });
    }

    private startHopper() {
        if (this.hopperTimer) clearTimeout(this.hopperTimer);
        this.status = 'hopping';
        this.runHopper();
    }

    private stopHopper() {
        if (this.hopperTimer) {
            clearTimeout(this.hopperTimer);
            this.hopperTimer = null;
        }
        if (this.status === 'hopping') this.status = 'idle';
    }

    private async runHopper() {
        if (this.status !== 'hopping' || !this.config) return;

        const ids = this.config.vocalHopper.channelIds;
        if (ids.length > 0) {
            const nextId = ids[Math.floor(Math.random() * ids.length)];
            await this.joinAFK(nextId);
            this.logCallback(`[HOPPER] Rotation vers le salon vocal : ${nextId}`, 'info');
        }

        const intervalMs = this.config.vocalHopper.interval * 60 * 1000;
        const jitter = this.config.vocalHopper.jitter ? (Math.random() * 60000 * 2) - 60000 : 0; // +/- 1 min
        
        this.hopperTimer = setTimeout(() => this.runHopper(), Math.max(10000, intervalMs + jitter));
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }

    public getStatus() {
        return {
            status: this.status,
            channelId: this.currentChannelId,
            startTime: this.startTime,
            uptime: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    public async joinAFK(channelId: string) {
        if (!this.client?.user) return { success: false, message: 'Client non connecté' };

        try {
            let targetGuildId = null;
            let channelName = channelId;

            for (const guild of this.client.guilds.cache.values()) {
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    targetGuildId = guild.id;
                    channelName = (channel as any).name || channelId;
                    break;
                }
            }

            if (!targetGuildId) return { success: false, message: 'Salon introuvable' };

            const shard = (this.client as any).ws?.shards?.first();
            if (!shard || !shard.connection) return { success: false, message: 'WS indisponible' };

            shard.connection.send(JSON.stringify({
                op: 4,
                d: {
                    guild_id: targetGuildId,
                    channel_id: channelId,
                    self_mute: true,
                    self_deaf: true
                }
            }));

            this.currentGuildId = targetGuildId;
            this.currentChannelId = channelId;
            if (this.status === 'idle') this.status = 'connected';
            if (!this.startTime) this.startTime = Date.now();

            return { success: true, channelName };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    public async leaveAFK() {
        if (!this.client?.user || !this.currentGuildId) {
            this.status = 'idle';
            this.startTime = null;
            return { success: false, message: 'Non connecté' };
        }

        try {
            const shard = (this.client as any).ws?.shards?.first();
            if (shard && shard.connection) {
                shard.connection.send(JSON.stringify({
                    op: 4,
                    d: { guild_id: this.currentGuildId, channel_id: null, self_mute: true, self_deaf: true }
                }));
            }

            this.currentGuildId = null;
            this.currentChannelId = null;
            this.status = 'idle';
            this.startTime = null;
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    public scan() { return; }
    public start() { return; }
    public async setTarget(id: string) { return this.joinAFK(id); }
    public async clearTarget() { return this.leaveAFK(); }
}
