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

            // AFK Mode Only: Check if Farmer is active
            if (this.config.afkOnly && this.botService) {
                const isFarmerActive = this.botService?.isFarmerActive?.() ?? this.botService?.messageFarmer?.isRunning;
                if (!isFarmerActive) return;
            }

            const rawContent = message.content;
            const contentLower = rawContent.toLowerCase();
            
            for (const rule of this.config.rules) {
                let isMatch = false;
                const mode = rule.matchingMode || 'contains';
                const trigger = rule.trigger;
                
                if (mode === 'exact') {
                    isMatch = contentLower === trigger.toLowerCase();
                } else if (mode === 'regex') {
                    try {
                        const regex = new RegExp(trigger, 'i');
                        isMatch = regex.test(rawContent);
                    } catch (e) {
                        isMatch = false; // Invalid regex
                    }
                } else {
                    // Default 'contains'
                    isMatch = contentLower.includes(trigger.toLowerCase());
                }

                if (isMatch) {
                    const action = rule.action || 'reply';
                    const customDelay = rule.delay !== undefined ? rule.delay * 1000 : (1000 + Math.random() * 3000);
                    
                    try {
                        if (customDelay > 0) {
                            await new Promise(r => setTimeout(r, customDelay));
                        }
                        
                        if (!this.client.user) return;

                        const infoMessages: string[] = [];

                        // 1. Reply Action
                        if (action === 'reply' || action === 'both') {
                            if (rule.replies && rule.replies.length > 0) {
                                const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
                                const replyWithPing = rule.replyWithPing !== false;
                                
                                await message.reply({
                                    content: reply,
                                    allowedMentions: { repliedUser: replyWithPing }
                                });
                                infoMessages.push(`répondu "${reply}"`);
                            }
                        }

                        // 2. React Action
                        if (action === 'react' || action === 'both') {
                            if (rule.emoji) {
                                await message.react(rule.emoji.trim());
                                infoMessages.push(`réagi avec ${rule.emoji}`);
                            }
                        }

                        if (infoMessages.length > 0) {
                            this.logCallback(`[RESPONDER] Déclencheur "${trigger}" apparié (${mode}) pour ${message.author.username} : ${infoMessages.join(' et ')}`, 'success');
                        }
                    } catch (e: any) {
                        this.logCallback(`[RESPONDER ERROR] Échec exécution règle "${trigger}" : ${e.message}`, 'error');
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
