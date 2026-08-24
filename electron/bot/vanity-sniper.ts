import { Client, Guild } from 'discord.js-selfbot-v13';

export interface VanitySniperConfig {
    targetGuildId: string;
    vanityCodes: string[];
    delayMs?: number;
    botTokens?: string[];
    webhookUrl?: string;
    gatewayListen?: boolean;
}

export interface VanityStatus {
    running: boolean;
    targetGuildId: string | null;
    targetGuildName?: string | null;
    targetCodes: string[];
    activeCode: string | null;
    checks: number;
    rateLimits: number;
    lastCheckedAt?: number;
    claimedCodes: string[];
    botTokensCount: number;
}

export class VanitySniper {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    public isRunning: boolean = false;
    private config: VanitySniperConfig | null = null;
    private checkTimer: NodeJS.Timeout | null = null;
    private checkCount: number = 0;
    private rateLimitCount: number = 0;
    private activeCodeIndex: number = 0;
    private botTokenIndex: number = 0;
    private claimedCodes: string[] = [];
    private boundGuildUpdate: any = null;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }

    public getStatus(): VanityStatus {
        let guildName = null;
        if (this.config?.targetGuildId && this.client?.guilds?.cache) {
            guildName = this.client.guilds.cache.get(this.config.targetGuildId)?.name || null;
        }

        return {
            running: this.isRunning,
            targetGuildId: this.config?.targetGuildId || null,
            targetGuildName: guildName,
            targetCodes: this.config?.vanityCodes || [],
            activeCode: this.config?.vanityCodes?.[this.activeCodeIndex] || null,
            checks: this.checkCount,
            rateLimits: this.rateLimitCount,
            claimedCodes: this.claimedCodes,
            botTokensCount: this.config?.botTokens?.length || 0
        };
    }

    /**
     * Checks if a guild is eligible for vanity URL claiming
     */
    public checkGuildEligibility(guildId: string): { eligible: boolean; name?: string; reason?: string } {
        if (!this.client?.user) return { eligible: false, reason: 'Client Discord non connecté.' };
        
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            return { eligible: false, reason: "Le compte n'a pas rejoint ce serveur ou l'ID est invalide." };
        }

        const isOwner = guild.ownerId === this.client.user.id;
        const member = guild.members.cache.get(this.client.user.id);
        const hasManageGuild = isOwner || (member && member.permissions.has('MANAGE_GUILD'));

        if (!hasManageGuild) {
            return { eligible: false, name: guild.name, reason: "Vous n'avez pas la permission 'Gérer le serveur' sur ce serveur." };
        }

        const hasVanityFeature = guild.features.includes('VANITY_URL');
        if (!hasVanityFeature && guild.premiumTier !== 'TIER_3') {
            return { 
                eligible: true, 
                name: guild.name, 
                reason: "⚠️ Note : Ce serveur n'est pas encore Niveau 3 Boost. Le claim ne fonctionnera que si le serveur atteint le Niveau 3." 
            };
        }

        return { eligible: true, name: guild.name };
    }

    public async start(config: VanitySniperConfig) {
        if (!this.client?.user) return { success: false, error: 'Client non connecté' };
        if (this.isRunning) return { success: false, error: 'Sniper déjà en cours d\'exécution' };

        const cleanCodes = (config.vanityCodes || [])
            .map(c => c.replace(/^https?:\/\/discord\.(gg|com\/invite)\//i, '').trim().toLowerCase())
            .filter(Boolean);

        if (cleanCodes.length === 0) {
            return { success: false, error: 'Aucun code vanity valide fourni.' };
        }

        const targetGuildId = config.targetGuildId.trim();
        if (!targetGuildId) {
            return { success: false, error: 'ID du serveur cible requis.' };
        }

        const botTokens = (config.botTokens || [])
            .map(t => t.trim())
            .filter(t => t.length > 20);

        this.config = {
            targetGuildId,
            vanityCodes: cleanCodes,
            delayMs: Math.max(100, config.delayMs || 500),
            botTokens,
            webhookUrl: config.webhookUrl?.trim(),
            gatewayListen: config.gatewayListen ?? true
        };

        this.isRunning = true;
        this.checkCount = 0;
        this.rateLimitCount = 0;
        this.activeCodeIndex = 0;
        this.botTokenIndex = 0;

        const targetNames = cleanCodes.slice(0, 3).join(', ') + (cleanCodes.length > 3 ? ` (+${cleanCodes.length - 3} autres)` : '');
        this.logCallback(`[Vanity Pro] 🎯 Surveillance lancée sur [${targetNames}] pour le serveur ${targetGuildId} (intervalle: ${this.config.delayMs}ms, ${botTokens.length} bot tokens)...`, 'info');

        // Hook Gateway Event for 0ms reaction if enabled
        if (this.config.gatewayListen) {
            this.setupGatewayListener();
        }

        this.runLoop();

        return { success: true };
    }

    public stop() {
        this.isRunning = false;
        if (this.checkTimer) {
            clearTimeout(this.checkTimer);
            this.checkTimer = null;
        }

        if (this.boundGuildUpdate) {
            this.client.off('guildUpdate', this.boundGuildUpdate);
            this.boundGuildUpdate = null;
        }

        this.logCallback('[Vanity Pro] 🛑 Surveillance arrêtée.', 'warning');
        return { success: true };
    }

    private setupGatewayListener() {
        if (this.boundGuildUpdate) {
            this.client.off('guildUpdate', this.boundGuildUpdate);
        }

        this.boundGuildUpdate = async (oldGuild: Guild, newGuild: Guild) => {
            if (!this.isRunning || !this.config) return;

            // If a guild in the cache lost or changed its vanity URL
            if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
                const freedCode = oldGuild.vanityURLCode.toLowerCase();
                if (this.config.vanityCodes.includes(freedCode)) {
                    this.logCallback(`[Vanity Gateway ⚡] Événement GUILD_UPDATE intercepté : Le code '${freedCode}' vient d'être libéré ! Claim instantané 0ms...`, 'success');
                    await this.attemptClaim(freedCode);
                }
            }
        };

        this.client.on('guildUpdate', this.boundGuildUpdate);
    }

    private async runLoop() {
        if (!this.isRunning || !this.config || !this.client?.user) return;

        const codes = this.config.vanityCodes;
        if (codes.length === 0) return;

        const targetCode = codes[this.activeCodeIndex % codes.length];
        this.activeCodeIndex = (this.activeCodeIndex + 1) % codes.length;

        try {
            this.checkCount++;

            // Select authorization header (Bot token or User Agent)
            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
            };

            if (this.config.botTokens && this.config.botTokens.length > 0) {
                const token = this.config.botTokens[this.botTokenIndex % this.config.botTokens.length];
                this.botTokenIndex = (this.botTokenIndex + 1) % this.config.botTokens.length;
                headers['Authorization'] = token.startsWith('Bot ') ? token : `Bot ${token}`;
            }

            const startTime = Date.now();
            const checkRes = await fetch(`https://discord.com/api/v9/invites/${targetCode}`, { headers });
            const speedMs = Date.now() - startTime;

            if (checkRes.status === 404) {
                this.logCallback(`[Vanity Pro] ⚡ Code '${targetCode}' LIBÉRÉ (404 Not Found en ${speedMs}ms) ! Claim en cours...`, 'success');
                await this.attemptClaim(targetCode);
            } else if (checkRes.status === 429) {
                this.rateLimitCount++;
                const data: any = await checkRes.json().catch(() => ({}));
                const retryAfter = Math.min(10000, ((data.retry_after || 2) * 1000));
                this.logCallback(`[Vanity Pro] ⚠️ Rate limit détecté sur '${targetCode}', pause de ${(retryAfter / 1000).toFixed(1)}s...`, 'warning');
                await new Promise(r => setTimeout(r, retryAfter));
            }

            if (this.checkCount % 100 === 0) {
                this.logCallback(`[Vanity Pro] Toujours actif : ${this.checkCount} vérifications (Code: '${targetCode}', Vitesse: ${speedMs}ms)...`, 'info');
            }
        } catch (e: any) {
            // Ignored network hiccups
        }

        if (this.isRunning && this.config) {
            const jitter = Math.random() * 30;
            const delay = this.config.delayMs || 500;
            this.checkTimer = setTimeout(() => this.runLoop(), delay + jitter);
        }
    }

    private async attemptClaim(code: string) {
        if (!this.config?.targetGuildId || !this.client?.user) return;

        const startTime = Date.now();
        try {
            const claimRes = await (this.client as any).api.guilds(this.config.targetGuildId)['vanity-url'].patch({
                data: { code }
            });

            const latency = Date.now() - startTime;

            if (claimRes?.code === code || claimRes?.vanity_url_code === code) {
                this.logCallback(`🎉 VICTOIRE : Vanity URL 'discord.gg/${code}' RÉCUPÉRÉ avec succès en ${latency}ms !`, 'success');
                this.claimedCodes.push(code);

                // Send Webhook Alert if configured
                if (this.config.webhookUrl) {
                    this.sendWebhookAlert(code, latency).catch(() => {});
                }

                // Remove from active target list if multiple
                this.config.vanityCodes = this.config.vanityCodes.filter(c => c !== code);
                if (this.config.vanityCodes.length === 0) {
                    this.stop();
                }
            } else {
                this.logCallback(`[Vanity Pro] Réponse inattendue lors du claim de '${code}' : ${JSON.stringify(claimRes)}`, 'warning');
            }
        } catch (err: any) {
            const latency = Date.now() - startTime;
            this.logCallback(`[Vanity Pro] ❌ Échec claim pour '${code}' (${latency}ms) : ${err.message}`, 'error');
        }
    }

    private async sendWebhookAlert(code: string, latencyMs: number) {
        if (!this.config?.webhookUrl) return;

        const guild = this.client.guilds.cache.get(this.config.targetGuildId);
        const guildName = guild?.name || this.config.targetGuildId;

        const embed = {
            title: '🎯 Vanity URL Sniped Successfully!',
            description: `Le vanity URL **discord.gg/${code}** a été snipé et assigné avec succès !`,
            color: 0x00ffcc,
            fields: [
                { name: '🔗 Vanity URL', value: `\`discord.gg/${code}\``, inline: true },
                { name: '🏰 Serveur', value: `**${guildName}**`, inline: true },
                { name: '⚡ Vitesse de Claim', value: `\`${latencyMs}ms\``, inline: true },
                { name: '👑 Compte', value: `**${this.client.user?.username}**`, inline: true },
                { name: '🔢 Vérifications', value: `\`${this.checkCount}\``, inline: true }
            ],
            footer: { text: 'Opsec PRO — Vanity Sniper Suite' },
            timestamp: new Date().toISOString()
        };

        await fetch(this.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Opsec PRO Vanity Radar',
                embeds: [embed]
            })
        });
    }
}
