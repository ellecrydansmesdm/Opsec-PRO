import { Client, Message } from 'discord.js-selfbot-v13';

export interface LastWordConfig {
    channelId: string;
    phrases: string[];
    replyMode: boolean;
    bigTextMode: boolean;
    sniperMode: boolean;
    sniperId?: string;
    delay: number;
    jitter: boolean;
    maxResponses: number; // 0 = unlimited
    autoStopAfterIdleMs: number; // 0 = disabled
    useMultiTokens: boolean;
}

export class LastWordService {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private emitCallback: (event: string, data: any) => void;
    private getSpamClient?: (acc: any) => Promise<Client>;
    private getAccounts?: () => any[];

    public isRunning: boolean = false;
    private activeConfig: LastWordConfig | null = null;
    private responseCount: number = 0;
    private lastOpponentMessageTime: number = 0;
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private currentPhraseIndex: number = 0;
    private currentAccountIndex: number = 0;
    private boundMessageHandler: ((message: Message) => void) | null = null;
    private isResponding: boolean = false;

    constructor(
        client: Client,
        logCallback: (msg: string, type: 'info' | 'success' | 'error') => void,
        emitCallback: (event: string, data: any) => void,
        getSpamClient?: (acc: any) => Promise<Client>,
        getAccounts?: () => any[]
    ) {
        this.client = client;
        this.logCallback = logCallback;
        this.emitCallback = emitCallback;
        this.getSpamClient = getSpamClient;
        this.getAccounts = getAccounts;
    }

    public setClient(client: Client) {
        this.client = client;
    }

    public getStatus() {
        return {
            running: this.isRunning,
            responseCount: this.responseCount,
            targetChannelId: this.activeConfig?.channelId || null,
            lastOpponentMessageTime: this.lastOpponentMessageTime
        };
    }

    public async start(config: LastWordConfig) {
        if (this.isRunning) {
            return { success: false, error: 'Last Word est déjà actif' };
        }

        if (!config.channelId) {
            return { success: false, error: 'Veuillez spécifier un salon, MP ou groupe cible' };
        }

        if (!config.phrases || config.phrases.length === 0) {
            return { success: false, error: 'Veuillez configurer au moins une phrase de réplique' };
        }

        this.isRunning = true;
        this.activeConfig = config;
        this.responseCount = 0;
        this.currentPhraseIndex = 0;
        this.currentAccountIndex = 0;
        this.lastOpponentMessageTime = Date.now();
        this.isResponding = false;

        this.logCallback(`[LAST WORD] ⚔️ Mode Cardio activé sur la cible : ${config.channelId}`, 'success');

        // Setup message listener
        this.boundMessageHandler = this.handleIncomingMessage.bind(this);
        this.client.on('messageCreate', this.boundMessageHandler);

        // Idle timer if auto-stop is configured
        if (config.autoStopAfterIdleMs > 0) {
            this.idleCheckInterval = setInterval(() => {
                if (!this.isRunning) return;
                const elapsed = Date.now() - this.lastOpponentMessageTime;
                if (elapsed >= config.autoStopAfterIdleMs && this.responseCount > 0) {
                    this.logCallback(`[LAST WORD] 🏆 L'adversaire a abandonné (inactif depuis ${Math.round(elapsed / 1000)}s) ! Duel gagné !`, 'success');
                    this.emitCallback('lastword-duel-won', { count: this.responseCount });
                    this.stop();
                }
            }, 3000);
        }

        this.emitCallback('lastword-status', this.getStatus());
        return { success: true };
    }

    public stop() {
        if (!this.isRunning) return { success: true };

        this.isRunning = false;
        if (this.boundMessageHandler) {
            this.client.off('messageCreate', this.boundMessageHandler);
            this.boundMessageHandler = null;
        }

        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }

        this.logCallback(`[LAST WORD] ⏹️ Session Cardio terminée (${this.responseCount} répliques envoyées)`, 'info');
        this.emitCallback('lastword-status', this.getStatus());
        this.activeConfig = null;
        return { success: true };
    }

    private async handleIncomingMessage(message: Message) {
        if (!this.isRunning || !this.activeConfig) return;
        
        // Match channel ID reliably across Guild and DM channels
        const msgChannelId = message.channelId || message.channel?.id;
        if (msgChannelId !== this.activeConfig.channelId) return;

        // Anti-self: ignore messages from our own client
        if (message.author.id === this.client.user?.id) return;

        // Anti-vault: ignore messages from any of our multi-account tokens
        const allAccounts = this.getAccounts ? this.getAccounts() : [];
        const isOwnAccount = allAccounts.some(acc => acc.id === message.author.id);
        if (isOwnAccount) return;

        // If sniperMode is enabled, optionally check if author matches sniperId
        if (this.activeConfig.sniperMode && this.activeConfig.sniperId) {
            const cleanTargetId = this.activeConfig.sniperId.trim().replace(/[<@!#>]/g, '');
            if (cleanTargetId && message.author.id !== cleanTargetId) {
                return;
            }
        }

        // Prevent overlapping responses
        if (this.isResponding) return;
        this.isResponding = true;

        this.lastOpponentMessageTime = Date.now();

        try {
            // Pick next phrase
            const phraseTemplate = this.activeConfig.phrases[this.currentPhraseIndex % this.activeConfig.phrases.length];
            this.currentPhraseIndex++;

            let finalContent = phraseTemplate;

            // 1. Sniper mention formatting
            if (this.activeConfig.sniperMode && this.activeConfig.sniperId) {
                const cleanSniperId = this.activeConfig.sniperId.trim().replace(/[<@!#>]/g, '');
                if (cleanSniperId && !finalContent.includes(`<@${cleanSniperId}>`)) {
                    finalContent = `<@${cleanSniperId}> ${finalContent}`;
                }
            }

            // 2. Big Text Mode (MUST be placed at the very start of the line for Discord H1 header)
            if (this.activeConfig.bigTextMode) {
                finalContent = `# ${finalContent}`;
            }

            // Calculate delay with jitter
            let targetDelay = this.activeConfig.delay || 150;
            if (this.activeConfig.jitter) {
                const jitterOffset = Math.floor(Math.random() * 120) - 40;
                targetDelay = Math.max(30, targetDelay + jitterOffset);
            }

            if (targetDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, targetDelay));
            }

            if (!this.isRunning) return;

            // Pick sender client (single or multi-token rotation)
            let senderClient = this.client;
            if (this.activeConfig.useMultiTokens && this.getSpamClient && allAccounts.length > 0) {
                const acc = allAccounts[this.currentAccountIndex % allAccounts.length];
                this.currentAccountIndex++;
                try {
                    senderClient = await this.getSpamClient(acc);
                } catch {
                    senderClient = this.client;
                }
            }

            // Send message: fast path using message.channel or targetChannel
            let sentSuccessfully = false;

            if (senderClient === this.client && message.channel && typeof (message.channel as any).send === 'function') {
                if (this.activeConfig.replyMode && typeof (message as any).reply === 'function') {
                    try {
                        await (message as any).reply({
                            content: finalContent,
                            allowedMentions: { repliedUser: true }
                        });
                        sentSuccessfully = true;
                    } catch (_) {}
                }
                if (!sentSuccessfully) {
                    await (message.channel as any).send(finalContent);
                    sentSuccessfully = true;
                }
            } else {
                const targetChannel = senderClient.channels.cache.get(this.activeConfig.channelId) || 
                                     await senderClient.channels.fetch(this.activeConfig.channelId).catch(() => null);
                if (targetChannel && typeof (targetChannel as any).send === 'function') {
                    await (targetChannel as any).send(finalContent);
                    sentSuccessfully = true;
                }
            }

            if (!sentSuccessfully) {
                this.logCallback(`[LAST WORD] ❌ Impossible d'accéder au salon cible`, 'error');
                return;
            }

            this.responseCount++;
            this.logCallback(`[LAST WORD] ⚡ Réplique #${this.responseCount} envoyée à ${message.author.username || message.author.id}`, 'info');
            this.emitCallback('lastword-reply', {
                count: this.responseCount,
                author: message.author.username,
                content: finalContent,
                time: new Date().toLocaleTimeString()
            });

            // Check max responses limit
            if (this.activeConfig.maxResponses > 0 && this.responseCount >= this.activeConfig.maxResponses) {
                this.logCallback(`[LAST WORD] 🎯 Limite de ${this.activeConfig.maxResponses} répliques atteinte. Arrêt.`, 'success');
                this.stop();
            }
        } catch (err: any) {
            this.logCallback(`[LAST WORD] ⚠️ Erreur lors de l'envoi : ${err.message || err}`, 'error');
        } finally {
            this.isResponding = false;
        }
    }
}
