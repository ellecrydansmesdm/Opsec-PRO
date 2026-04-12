import { Client, Message } from 'discord.js-selfbot-v13';
import { ResponderConfig } from '../../shared/types';

export class AutoResponder {
    private client: Client;
    private config: ResponderConfig | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
        this.setupListener();
    }

    public updateConfig(config: ResponderConfig) {
        this.config = config;
        if (config.enabled) {
            this.logCallback(`[AUTO-RESPONDER] Moteur activé (${config.rules.length} règles)`, 'success');
        }
    }

    private setupListener() {
        this.client.on('messageCreate', async (message: Message) => {
            if (!this.config?.enabled || !this.client.user) return;
            if (message.author.id === this.client.user.id) return;

            // Check if DM only
            if (this.config.dmOnly && message.channel.type !== 'DM' && message.channel.type !== 'GROUP_DM') return;

            // Check if AFK synchronization (requires external check, e.g. from BotService or Bot state)
            // For now, simple keyword matching
            const content = message.content.toLowerCase();
            
            for (const rule of this.config.rules) {
                const trigger = rule.trigger.toLowerCase();
                if (content.includes(trigger)) {
                    const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
                    try {
                        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000)); // Human jitter
                        await message.reply(reply);
                        this.logCallback(`[RESPONDER] Réponse auto à ${message.author.username} : "${reply}"`, 'success');
                    } catch (e: any) {
                        this.logCallback(`[RESPONDER ERROR] Échec réponse : ${e.message}`, 'error');
                    }
                    break; // Only one rule per message
                }
            }
        });
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }
}
