import { Client, TextChannel } from 'discord.js-selfbot-v13';
import { FarmerConfig } from '../../shared/types';

export class MessageFarmer {
    private client: Client;
    private config: FarmerConfig | null = null;
    public isRunning: boolean = false;
    private timer: NodeJS.Timeout | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error', messageId?: string) => void;
    private resolvedChannels: Map<string, any> = new Map();
    private failedChannels: Set<string> = new Set();
    private startTime: number | null = null;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public updateConfig(config: FarmerConfig) {
        this.config = config;
        if (config.enabled && config.messageFarmer.enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    public start() {
        if (this.isRunning) this.stop();
        if (!this.config?.messageFarmer.enabled) return;

        this.resolvedChannels.clear();
        this.failedChannels.clear();

        this.isRunning = true;
        this.startTime = Date.now();
        this.logCallback(`[XP FARMER] Lancement du moteur textuel...`, 'success');
        this.run();
    }

    public stop() {
        this.isRunning = false;
        this.startTime = null;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.resolvedChannels.clear();
        this.failedChannels.clear();
    }

    public getStatus() {
        return {
            status: this.isRunning ? 'connected' : 'idle',
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            startTime: this.startTime
        };
    }

    private async run() {
        if (!this.isRunning || !this.config || !this.client.user) return;

        const { channelIds, phrases, delay } = this.config.messageFarmer;
        if (channelIds.length > 0 && phrases.length > 0) {
            for (const channelId of channelIds) {
                if (!this.isRunning) break;
                try {
                    // 1. Check local cache first, then client cache, then fallback to API
                    let channel = this.resolvedChannels.get(channelId);
                    if (!channel) {
                        channel = this.client.channels.cache.get(channelId);
                        if (!channel) {
                            // If it failed previously, skip network fetch to avoid API spamming
                            if (this.failedChannels.has(channelId)) {
                                continue;
                            }
                            channel = await this.client.channels.fetch(channelId).catch(() => null);
                            if (!channel) {
                                this.failedChannels.add(channelId);
                            }
                        }
                        if (channel) {
                            this.resolvedChannels.set(channelId, channel);
                        }
                    }

                    if (channel && channel.isText()) {
                        const text = phrases[Math.floor(Math.random() * phrases.length)];
                        const sentMsg = await (channel as any).send(text);
                        const guildId = channel.guild?.id || '@me';
                        const jumpUrl = sentMsg?.id ? `https://discord.com/channels/${guildId}/${channel.id}/${sentMsg.id}` : undefined;
                        this.logCallback(`[XP FARMER] Message envoyé dans #${(channel as any).name || channelId}`, 'success', jumpUrl);
                    }
                } catch (e: any) {
                    this.logCallback(`[XP FARMER ERROR] Échec #${channelId} : ${e.message}`, 'error');
                }
                // Short jitter delay between channels
                await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
            }
        }

        // Delay until next cycle (base delay + substantial jitter)
        const jitter = Math.random() * 20000; // up to 20s jitter
        const nextRun = (delay * 1000) + jitter;
        this.timer = setTimeout(() => this.run(), nextRun);
    }

    public setClient(newClient: Client) {
        this.client = newClient;
        this.resolvedChannels.clear();
        this.failedChannels.clear();
    }
}
