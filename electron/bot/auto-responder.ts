import { Client, Message } from 'discord.js-selfbot-v13';
import { ResponderConfig } from '../../shared/types';

export class AutoResponder {
    private client: Client;
    private config: ResponderConfig | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private boundListener: ((message: Message) => Promise<void>) | null = null;
    private botService: any; // Using any to avoid circular dep if it happens

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void, botService?: any) {
        this.client = client;
        this.logCallback = logCallback;
        this.botService = botService;
        this.setupListener();
    }

    public updateConfig(config: ResponderConfig) {
        if (!config) return;
        this.config = config;
        if (config.enabled) {
            this.logCallback(`[AUTO-RESPONDER] Moteur synchronisé (${config.rules.length} règles)`, 'info');
        }
    }

    private setupListener() {
        if (this.boundListener) {
            this.client.off('messageCreate', this.boundListener);
        }

        this.boundListener = async (message: Message) => {
            if (!this.config || !this.config.enabled || !this.client.user) return;
            if (message.author.id === this.client.user.id) return;

            // Check if DM only
            const isDM = message.channel.type === 'DM' || message.channel.type === 'GROUP_DM';
            if (this.config.dmOnly && !isDM) return;

            // AFK Mode Only: Check if Farmer or VoiceStalker is active
            if (this.config.afkOnly && this.botService) {
                const isFarmerActive = this.botService.messageFarmer?.isRunning;
                const isVoiceActive = this.botService.voiceStalker?.isActive; 
                
                if (!isFarmerActive && !isVoiceActive) return;
            }

            const content = message.content.toLowerCase();
            
            for (const rule of this.config.rules) {
                const trigger = rule.trigger.toLowerCase();
                if (content.includes(trigger)) {
                    const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
                    try {
                        const jitter = 1000 + Math.random() * 3000;
                        await new Promise(r => setTimeout(r, jitter)); // Human jitter
                        
                        // Check if we can still send it (client status might have changed during jitter)
                        if (!this.client.user) return;
                        
                        await message.reply(reply);
                        this.logCallback(`[RESPONDER] Réponse auto à ${message.author.username} : "${reply}"`, 'success');
                    } catch (e: any) {
                        this.logCallback(`[RESPONDER ERROR] Échec réponse : ${e.message}`, 'error');
                    }
                    break; 
                }
            }
        };

        this.client.on('messageCreate', this.boundListener);
    }

    public setClient(newClient: Client) {
        if (this.boundListener) {
            this.client.off('messageCreate', this.boundListener);
        }
        this.client = newClient;
        this.setupListener();
    }

    public stop() {
        if (this.boundListener) {
            this.client.off('messageCreate', this.boundListener);
            this.boundListener = null;
        }
    }
}
