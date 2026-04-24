import { Client, TextChannel } from 'discord.js-selfbot-v13';
import { FarmerConfig } from '../../shared/types';

export class MessageFarmer {
    private client: Client;
    private config: FarmerConfig | null = null;
    public isRunning: boolean = false;
    private timer: NodeJS.Timeout | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public updateConfig(config: FarmerConfig) {
        this.config = config;
        if (config.messageFarmer.enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    public start() {
        if (this.isRunning) this.stop();
        if (!this.config?.messageFarmer.enabled) return;

        this.isRunning = true;
        this.logCallback(`[XP FARMER] Lancement du moteur textuel...`, 'success');
        this.run();
    }

    public stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private async run() {
        if (!this.isRunning || !this.config || !this.client.user) return;

        const { channelIds, phrases, delay } = this.config.messageFarmer;
        if (channelIds.length > 0 && phrases.length > 0) {
            for (const channelId of channelIds) {
                if (!this.isRunning) break;
                try {
                    const channel = await this.client.channels.fetch(channelId).catch(() => null);
                    if (channel && channel.isText()) {
                        const text = phrases[Math.floor(Math.random() * phrases.length)];
                        await (channel as any).send(text);
                        this.logCallback(`[XP FARMER] Message envoyé dans #${(channel as any).name || channelId}`, 'info');
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
    }
}
