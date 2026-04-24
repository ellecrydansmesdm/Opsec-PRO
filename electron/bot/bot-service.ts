import { Client } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { UserProfile, RotatorConfig, AppSettings } from '../../shared/types';
import { ProfileRotator } from './profile-rotator';
import { VoiceStalker } from './voice-stalker';
import { app, BrowserWindow } from 'electron';
import { statsService } from '../services/stats-service';
import { ghostTracker } from '../services/ghost-tracker';
const ProxyAgent = require('proxy-agent');
const UserAgent = require('user-agents');
import { profileCache } from '../services/profile-cache';
import { AutomationService } from './automation-service';
import { ReactionService } from './reaction-service';

export class BotService extends EventEmitter {
    public client: Client;
    private isSpamming: boolean = false;
    private isPurging: boolean = false;
    private isDMingAll: boolean = false;
    private isSanitizing: boolean = false;
    private isGroupRenaming: boolean = false;
    public voiceStalker: VoiceStalker;
    private spotifyService: import('./spotify-service').SpotifyService;
    public profileRotator: ProfileRotator;
    private autoResponder: import('./auto-responder').AutoResponder;
    private messageFarmer: import('./message-farmer').MessageFarmer;
    public protectionService: import('./protection-service').ProtectionService;
    private appDetector: import('./app-detector').AppDetector;
    private appDetectionTimer: NodeJS.Timeout | null = null;
    private currentDetectedApp: string | null = null;
    private isPomeloBatching: boolean = false;
    private currentPriorityStatus: string | null = null;
    private lastStatusUpdateAt: number = 0;
    public automationService: AutomationService;
    public reactionService: ReactionService;
    private proxyList: string[] = [];
    private currentProxyIndex: number = 0;
    private messageCounter: number = 0;
    private isStealthMode: boolean = false;
    private connectionStartTime: number = 0;
    private nitroExpiryDate: string | null = null;
    private settings: AppSettings | null = null;

    constructor() {
        super();
        
        // OPSEC: Random User-Agent for the Session
        const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
        
        this.client = new Client({
            http: {
                headers: {
                    'User-Agent': ua
                }
            }
        });

        this.voiceStalker = new VoiceStalker(this.client, (msg, type) => this.log(msg, type));
        this.autoResponder = new (require('./auto-responder').AutoResponder)(this.client, (msg: any, type: any) => this.log(msg, type), this);
        this.messageFarmer = new (require('./message-farmer').MessageFarmer)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.spotifyService = new (require('./spotify-service').SpotifyService)(this.client, this);
        this.profileRotator = new ProfileRotator(
            this.client, 
            app.getPath('userData'),
            (msg: string, type: any) => this.log(msg, type)
        );
        this.protectionService = new (require('./protection-service').ProtectionService)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.appDetector = new (require('./app-detector').AppDetector)();
        this.automationService = new AutomationService(this.client, (msg, type) => this.log(msg, type));
        this.reactionService = new ReactionService((msg, type) => this.log(msg, type));
        this.reactionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
        
        this.profileRotator.setPulseCallback((data) => {
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('rotator-pulse', data);
            });
        });
        this.setupEvents();
    }

    private setupEvents() {
        this.client.on('ready', () => {
            this.connectionStartTime = Date.now();
            this.log(`Connecté en tant que ${this.client.user?.tag}`, 'success');
            this.fetchNitroExpiry();
        });
        
        this.client.once('ready', () => {
            console.log(`[BOT] Session prête.`);
        });

        this.client.on('error', (err) => {
            this.log(`Erreur Discord : ${err.message}`, 'error');
        });

        this.client.on('messageCreate', async (message) => {
            if (!this.client.user) return;
            if (message.author.id !== this.client.user.id) return;

            // Tracking Stats pour le Custom RPC
            if (this.profileRotator) {
                this.profileRotator.incrementMessageStats();
            }

            const args = message.content.split(' ');
            const command = args[0].toLowerCase();

            if (command === '+clear') {
                statsService.increment(this.client.user.id);
                const amount = parseInt(args[1]) || 10;
                await this.purgeMessages(message.channel.id, amount);
            }
            else if (command === '+afkvc') {
                statsService.increment(this.client.user.id);
                const channelId = args[1];
                
                if (!channelId || !/^\d{17,19}$/.test(channelId)) {
                    await message.edit('❌ ID salon vocal invalide ou manquant').catch(() => {});
                    setTimeout(() => message.delete().catch(() => {}), 1000);
                    return;
                }

                try {
                    const result = await this.voiceStalker.joinAFK(channelId);
                    if (result.success) {
                        if (!this.settings?.silentMode) {
                            await message.edit(`🔒 Mode AFK activé dans : [${result.channelName}] | Farming en cours...`).catch(() => {});
                        } else {
                            await message.delete().catch(() => {});
                        }
                    } else {
                        await message.edit(`⚠️ Erreur : ${result.message}`).catch(() => {});
                        setTimeout(() => message.delete().catch(() => {}), 2000);
                    }
                } catch (err: any) {
                    await message.edit(`🚫 Échec du farming : ${err.message}`).catch(() => {});
                    setTimeout(() => message.delete().catch(() => {}), 2000);
                }
            }
            else if (command === '+leavevc') {
                statsService.increment(this.client.user.id);
                await this.voiceStalker.leaveAFK();
                if (!this.settings?.silentMode) {
                    await message.edit('✅ Déconnecté du vocal | Farming terminé').catch(() => {});
                    setTimeout(() => message.delete().catch(() => {}), 1000);
                } else {
                    await message.delete().catch(() => {});
                }
            }
        });
    }

    public async checkCapMonsterKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.capmonster.cloud/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.log(`[CapMonster] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
        console.log(chalk.blue(`[LOG] ${msg}`));
        this.emit('bot-log', { msg, type, time: new Date().toLocaleTimeString() });
    }

    private async solveCaptcha(captcha: any, UA: string): Promise<string> {
        const key = this.settings?.automationConfig?.capMonsterKey;
        if (!key || key.trim() === '') {
            this.log('Captcha détecté. Tentative sans clé CapMonster (Risque d\'échec)...', 'info');
            return ''; // Try anyway without a key (Discord will likely reject)
        }

        this.log('[CapMonster] Résolution du captcha hCaptcha en cours...', 'info');
        try {
            const createRes = await fetch('https://api.capmonster.cloud/createTask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientKey: key,
                    task: {
                        type: "HCaptchaTaskProxyless",
                        websiteURL: "https://discord.com",
                        websiteKey: captcha.captcha_sitekey,
                        isInvisible: true,
                        data: captcha.captcha_rqdata,
                        userAgent: UA
                    }
                })
            }).then(res => res.json()) as any;

            if (createRes.errorId !== 0) {
                this.log(`[CapMonster] Erreur de création : ${createRes.errorCode}`, 'error');
                throw new Error(`CapMonster Error: ${createRes.errorCode}`);
            }

            const taskId = createRes.taskId;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const resultRes = await fetch('https://api.capmonster.cloud/getTaskResult', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientKey: key,
                        taskId: taskId
                    })
                }).then(res => res.json()) as any;

                if (resultRes.status === 'ready') {
                    this.log('[CapMonster] Captcha résolu avec succès !', 'success');
                    return resultRes.solution.gRecaptchaResponse;
                }
                
                if (resultRes.errorId !== 0) {
                    this.log(`[CapMonster] Erreur de résolution : ${resultRes.errorCode}`, 'error');
                    throw new Error(`CapMonster Error: ${resultRes.errorCode}`);
                }
            }
            throw new Error('CapMonster Timeout');
        } catch (err: any) {
            this.log(`[CapMonster] Échec fatal : ${err.message}`, 'error');
            throw err;
        }
    }

    async purgeMessages(channelId: string, amount: number, purgeAll: boolean = false, delay: number = 1000) {
        try {
            let channel: any = await this.client.channels.fetch(channelId).catch(() => null);
            
            // If channel fetch fails, it might be a Friend/User ID
            if (!channel) {
                // Try to find if we already have a DM with this user in cache
                channel = this.client.channels.cache.find((c: any) => c.type === 'DM' && c.recipient?.id === channelId);
                
                if (!channel) {
                    const user = await this.client.users.fetch(channelId).catch(() => null);
                    if (user) {
                        this.log(`Ouverture du DM pour ${user.username} (ID: ${channelId})...`, 'info');
                        channel = await user.createDM().catch(() => null);
                    }
                }
            }

            if (!channel || (typeof channel.isText === 'function' && !channel.isText()) && channel.type !== 'DM' && channel.type !== 'GROUP_DM') {
                this.log('Salon introuvable, inaccessible ou non textuel.', 'error');
                return;
            }

            this.isPurging = true;
            const isAll = amount >= 1000;
            this.log(`Démarrage de la purge (${isAll ? 'ALL' : amount} messages, mode: ${purgeAll ? 'Global' : 'Perso'}, délai: ${delay}ms)...`, 'info');

            let fetched;
            let deleted = 0;
            let lastMessageId: string | undefined = undefined;
            
            do {
                if (!this.isPurging) break;
                const limit = isAll ? 100 : Math.min(amount - deleted, 100);
                if (limit <= 0) break;

                const fetchOpts: any = { limit };
                if (lastMessageId) fetchOpts.before = lastMessageId;

                fetched = await channel.messages.fetch(fetchOpts).catch(() => null) as any;
                if (!fetched || fetched.size === 0) break;

                // Move pagination cursor backwards through time
                lastMessageId = fetched.last()?.id;

                const toDelete = fetched.filter((m: any) => purgeAll ? true : m.author.id === this.client.user?.id);
                // Do NOT break if toDelete is empty, we must keep searching backwards in the channel history!

                // Asynchronous Batch Processing for Maximum Speed
                const promises = [];
                let sentRequests = 0;

                for (const msg of toDelete.values()) {
                    if (!this.isPurging) break;
                    
                    promises.push(
                        (async () => {
                            try {
                                await msg.delete();
                                deleted++;
                                if (deleted % 50 === 0) this.log(`[Progression] Purge confirmée : ${deleted} messages (Mode Rapide)...`, 'info');
                            } catch (e: any) {
                                if (e.status === 429) {
                                    this.log('Taux limite Discord atteint (ralentissement automatique)...', 'error');
                                }
                            }
                        })()
                    );
                    
                    sentRequests++;
                    
                    // Strict spacing between requests based on user setting
                    if (delay > 0) {
                        await new Promise(r => setTimeout(r, delay));
                    }
                    
                    if (!isAll && (deleted + sentRequests) >= amount) break;
                }
                
                // Await completion of this chunk before fetching the next page
                // This prevents fetching messages that are already queued for deletion
                if (promises.length > 0) {
                    await Promise.all(promises);
                }
                
                if (!isAll && deleted >= amount) break;
            } while (isAll && fetched && fetched.size > 0 && this.isPurging);

            const finalMsg = !this.isPurging ? 'Purge interrompue.' : `Purge terminée : ${deleted} messages supprimés.`;
            this.log(finalMsg, this.isPurging ? 'success' : 'info');
            this.isPurging = false;
        } catch (err: any) {
            this.isPurging = false;
            this.log(`Échec critique de la purge : ${err.message}`, 'error');
        }
    }

    async stopPurge() {
        this.isPurging = false;
    }

    private async fetchNitroExpiry() {
        if (!this.client.user) return;
        try {
            // Selfbot API call for billing (Internal Discord API)
            const subscriptions = await (this.client as any).api.users['@me']['billing']['subscriptions'].get();
            if (subscriptions && Array.isArray(subscriptions) && subscriptions.length > 0) {
                const sub = subscriptions.find((s: any) => s.status === 1 || s.status === 4); // Active or Billing Retry
                if (sub) {
                    const expiryDate = new Date(sub.valid_to);
                    const now = new Date();
                    
                    if (isNaN(expiryDate.getTime())) {
                        this.nitroExpiryDate = "Active";
                    } else {
                        const diffTime = expiryDate.getTime() - now.getTime();
                        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) this.nitroExpiryDate = "Active (Renewing)";
                        else this.nitroExpiryDate = `Active (expires in ${diffDays} days)`;
                    }
                } else {
                    this.nitroExpiryDate = 'Inactive';
                }
            } else {
                // Handle cases where subscriptions list might be empty (Gifted Nitro or legacy)
                this.nitroExpiryDate = this.client.user.premiumType !== 0 ? 'Active' : 'Inactive';
            }
        } catch (e) {
            console.error('[OPSEC] Erreur fetchNitroExpiry:', e);
            this.nitroExpiryDate = this.client.user.premiumType !== 0 ? 'Active' : 'Inactive';
        }
    }

    async login(token: string) {
        try {
            this.cleanupAsync(); 
            
            const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
            this.client = new Client({
                captchaSolver: (captcha: any, UA: string) => this.solveCaptcha(captcha, UA),
                http: {
                    headers: {
                        'User-Agent': ua
                    }
                }
            });

            this.voiceStalker.setClient(this.client);
            this.autoResponder.setClient(this.client);
            this.messageFarmer.setClient(this.client);
            this.spotifyService = new (require('./spotify-service').SpotifyService)(this.client, this);
            this.profileRotator = new ProfileRotator(
                this.client, 
                app.getPath('userData'),
                (msg: string, type: any) => this.log(msg, type)
            );
            
            this.setupEvents(); 
            this.protectionService.setMainClient(this.client);
            this.protectionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
            this.automationService.setClient(this.client);
            this.reactionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
            await this.client.login(token);
            if (!this.client.readyAt) {
                await new Promise((resolve) => this.client.once('ready', resolve));
            }
            
            this.log(`Connecté en tant que ${this.client.user?.tag} sur Opsec Pro`, 'success');
            return { success: true, user: this.getProfile() };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }

    private cleanupAsync() {
        if (this.profileRotator) this.profileRotator.stop();
        if (this.spotifyService) this.spotifyService.stop();
        if (this.autoResponder) this.autoResponder.stop();
        if (this.client) {
            const oldClient = this.client;
            oldClient.removeAllListeners(); 
            oldClient.destroy();
        }
        if (this.appDetectionTimer) {
            clearInterval(this.appDetectionTimer);
            this.appDetectionTimer = null;
        }
    }

    destroy() {
        this.cleanupAsync();
    }

    getProfile(): UserProfile | null {
        if (!this.client.user) return null;
        try {
            const flags = this.client.user.flags?.toArray() || [];
            const badges = flags.map(f => f.toLowerCase().replace(/_/g, ' '));
            
            // Nitro detection: Ensure premiumType is strictly checked
            const premiumType = (this.client.user as any).premiumType;
            const nitro = premiumType !== undefined && premiumType !== 0 && premiumType !== null;
            if (nitro) badges.push('nitro');

            const presence = this.client.user.presence;
            const activities = presence.activities.map(a => ({
                name: a.name,
                type: Number(a.type),
                details: a.details,
                state: a.state
            })) as any;

            const platform = presence.clientStatus ? Object.keys(presence.clientStatus)[0] : 'offline';

            return {
                id: this.client.user.id,
                username: this.client.user.username || 'Utilisateur',
                displayName: (this.client.user as any).globalName || this.client.user.username,
                tag: this.client.user.tag || '',
                avatarURL: this.client.user.displayAvatarURL({ dynamic: true, size: 256 }),
                bannerURL: (this.client.user as any).bannerURL?.({ dynamic: true, size: 600 }) || undefined,
                nitro,
                nitroExpiry: this.nitroExpiryDate || (nitro ? 'Active' : 'Inactive'),
                badges,
                activities,
                platform,
                uptime: this.connectionStartTime,
                guildsCount: this.client.guilds?.cache?.size || 0,
                friendsCount: (this.client.relationships as any).cache.filter((t: any) => t.type === 1 || t === 1).size || 0,
            };
        } catch (e) {
            console.error('[OPSEC] Erreur getProfile:', e);
            return null;
        }
    }

    private sanitizeContent(text: string): string {
        if (!this.settings?.privateMode) return text;
        return text.replace(/opsec\s*pro/gi, '');
    }

    async setProfile(data: { bio?: string, pronouns?: string }) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        try {
            const sanitizedData = { ...data };
            if (sanitizedData.bio) sanitizedData.bio = this.sanitizeContent(sanitizedData.bio);
            await (this.client as any).api.users['@me'].profile.patch({ data: sanitizedData });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    async setActivity(data: { name: string, type: number, state?: string, details?: string }) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        try {
            const name = this.sanitizeContent(data.name);
            const state = data.state ? this.sanitizeContent(data.state) : undefined;
            const details = data.details ? this.sanitizeContent(data.details) : undefined;
            
            (this.client.user as any).setActivity(name, {
                type: data.type,
                state: state,
                details: details
            });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private lastPriorityUpdateAt: number = 0;
    private lastStatusText: string = "";

    public updateCustomStatus(text: string, isPriority: boolean = false) {
        if (!this.client.user || !this.client.token) return;
        
        const now = Date.now();
        const rawStatus = this.sanitizeContent(text).substring(0, 127);
        
        // --- SMART THROTTLING ---
        // Priority (Lyrics): No delay (Real-time)
        // Standard: 2000ms
        const throttleLimit = isPriority ? 0 : 2000;
        const timeSinceLast = now - (isPriority ? this.lastPriorityUpdateAt : this.lastStatusUpdateAt);
        
        if (timeSinceLast < throttleLimit) return;
        
        // Skip redundant updates (but ALWAYS allow clearing the status)
        if (rawStatus !== '' && rawStatus === this.lastStatusText && timeSinceLast < 10000) return;

        // Update timestamps
        if (isPriority) this.lastPriorityUpdateAt = now;
        else this.lastStatusUpdateAt = now;
        this.lastStatusText = rawStatus;

        try {
            if (rawStatus === '') {
                // Double cleanup: settings + presence
                (this.client as any).settings.setCustomStatus(null).catch(() => {});
                
                const activities = this.client.user.presence.activities.filter((a: any) => 
                    a.type !== 'CUSTOM' && a.id !== 'custom'
                );
                (this.client.user as any).setPresence({ activities });
            } else {
                const activities = this.client.user.presence.activities.filter((a: any) => 
                    a.type !== 'CUSTOM' && a.id !== 'custom'
                );
                
                activities.push({
                    type: 'CUSTOM',
                    name: 'Custom Status',
                    state: rawStatus
                } as any);

                (this.client.user as any).setPresence({ activities });

                if (isPriority) {
                    this.log(`[Spotify] Push Lyrics: "${rawStatus}"`, 'info');
                }
            }
        } catch (e) {}
    }

    public updateEngineSettings(settings: AppSettings) {
        this.settings = settings;

        if (this.spotifyService) {
            const isSpotifyOn = !!settings.spotifyLyricsEnabled;
            if (isSpotifyOn) this.spotifyService.start();
            else this.spotifyService.stop();
        }

        if (settings.allowActiveAppDetection) {
            this.startAppDetection();
        } else {
            this.stopAppDetection();
        }

        if (this.client?.user && this.profileRotator) {
            const currentAccount = settings.accounts?.find(a => a.id === this.client.user?.id);
            if (currentAccount && currentAccount.rotator) {
                this.profileRotator.updateConfig(currentAccount.rotator);
            }
        }

        if (settings.farmerConfig) {
            this.voiceStalker.updateConfig(settings.farmerConfig);
            this.messageFarmer.updateConfig(settings.farmerConfig);
        }

        if (settings.responderConfig) {
            this.autoResponder.updateConfig(settings.responderConfig);
        }

        if (settings.automationConfig) {
            this.automationService.updateConfig(settings.automationConfig);
        }
    }

    async getChannelsList() {
        if (!this.client.user) return { servers: [], dms: [] };
        try {
            // Force relationship cache sync if it seems incomplete
            if ((this.client.relationships as any).cache.size === 0) {
                console.log('[BOT] Cache relations vide, tentative de synchronisation forcée...');
                await (this.client as any).relationships.fetch().catch((e: any) => console.error('[BOT] Échec sync relations:', e.message));
            }

            const servers: any[] = [];
            
            // 1. Gather Servers & Channels
            this.client.guilds.cache.forEach(guild => {
                const me = guild.members.me;
                const guildTag = me?.nickname || '';
                const guildChannels = guild.channels.cache
                    .filter(c => (c.isText() || (c.type as any) === 'GUILD_VOICE') && !c.isThread())
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        type: (c.type as any) === 'GUILD_VOICE' ? 'voice' : 'server'
                    }));
                if (guildChannels.length > 0) {
                    const tierMap: Record<string, number> = { 'NONE': 0, 'TIER_1': 1, 'TIER_2': 2, 'TIER_3': 3 };
                    servers.push({
                        id: guild.id,
                        name: guild.name,
                        guildTag: guildTag,
                        icon: guild.iconURL({ dynamic: true, size: 64 }) || '',
                        channels: guildChannels,
                        premiumTier: typeof guild.premiumTier === 'string' ? (tierMap[guild.premiumTier] || 0) : guild.premiumTier,
                        features: guild.features
                    });
                }
            });

            // 2. Gather All Possible DM Targets (Map to deduplicate by Recipient ID)
            // We use recipientId as key to merge "Friendship" and "DM Channel" info
            const dmTargets = new Map<string, any>();

            // a. Process Relationships (Friends)
            (this.client.relationships as any).cache
                .filter((r: any) => r.type === 1 || r === 1)
                .forEach((rel: any, id: string) => {
                    const user = rel.user || this.client.users.cache.get(id);
                    const cached = profileCache.get(id);
                    let name = id;

                    if (user) {
                        const global = user.globalName;
                        const username = user.username;
                        name = global ? `${global} (@${username})` : username;
                        profileCache.set(id, name, user.displayAvatarURL());
                    } else if (cached) {
                        name = cached.name;
                    } else {
                        name = `Utilisateur (${id})`;
                    }
                    
                    dmTargets.set(id, {
                        id: id,
                        targetUserId: id,
                        name: name,
                        icon: user ? user.displayAvatarURL() : (cached?.avatar || ''),
                        type: 'dm',
                        isFriend: true,
                        lastMessageId: '0'
                    });
                });

            // b. Process Active DM Channels (Overwrites/Enriches the Map)
            this.client.channels.cache
                .filter(c => (c.type === 'DM' || c.type === 'GROUP_DM'))
                .forEach(c => {
                    if (c.type === 'DM') {
                        const recipient = (c as any).recipient;
                        const recipientId = recipient?.id || (c as any).recipientId;
                        if (recipientId) {
                            const name = recipient ? (recipient.globalName || recipient.username || recipient.id) : 'Compte Inconnu';
                            dmTargets.set(recipientId, {
                                id: c.id, // CHANNEL ID prioritized here
                                targetUserId: recipientId,
                                name: name, // No [AMI] prefix for active DMs
                                icon: recipient ? recipient.displayAvatarURL() : '',
                                type: 'dm',
                                lastMessageId: (c as any).lastMessageId || '0'
                            });
                        }
                    } else {
                        // Group DMs
                        const recipients = (c as any).recipients;
                        let name = (c as any).name;
                        if (!name && recipients) {
                            name = Array.from(recipients.values())
                                .filter((r: any) => r.id !== this.client.user?.id)
                                .map((r: any) => r.globalName || r.username || r.id)
                                .join(', ');
                        }
                        dmTargets.set(c.id, {
                            id: c.id,
                            name: name || 'Groupe DM',
                            type: 'dm',
                            isGroup: true,
                            lastMessageId: (c as any).lastMessageId || '0'
                        });
                    }
                });

            const dms = Array.from(dmTargets.values())
                .sort((a, b) => (b.lastMessageId || '0').localeCompare(a.lastMessageId || '0'));

            console.log(`[BOT] list-fetch: ${servers.length} servers, ${dms.length} dm-targets`);
            return { servers, dms };
        } catch (err: any) {
            this.log(`Erreur récupération salons : ${err.message}`, 'error');
            return { servers: [], dms: [] };
        }
    }

    async getFriendsList() {
        if (!this.client.user) return [];
        try {
            // 1. Force relationship sync at least once with safety timeout
            if ((this.client.relationships as any).cache.size === 0) {
                await Promise.race([
                    (this.client.relationships as any).fetch(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sync relationships')), 3000))
                ]).catch((e) => this.log(`[Bot] Synchro relations: ${e.message}`, 'info'));
            }

            const relationships = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1);
            
            // 2. Resolve missing users using Cache + Selective Fetch
            const missingIds = Array.from(relationships.keys()).filter((id: any) => {
                const snowflake = id as string;
                return !this.client.users.cache.has(snowflake) && !profileCache.get(snowflake);
            });
            
            if (missingIds.length > 0) {
                this.log(`Synchronisation ultra-rapide (${missingIds.length} profils restants)...`, 'info');
                
                // Fetch ONLY the first 20 missing synchronous (ultrafast UI response)
                const toResolveNow = missingIds.slice(0, 20);
                await Promise.all(toResolveNow.map(id => this.client.users.fetch(id as string).catch(() => null)));

                // Trigger background sync for the RESTE (Aggressive mode: 2 every 500ms)
                if (missingIds.length > 20) {
                   this.backgroundResolveUsers(missingIds.slice(20));
                }
            }

            return relationships.map((rel: any, id: string) => {
                const user = rel.user || this.client.users.cache.get(id);
                const cached = profileCache.get(id);
                let pseudo = id;
                let avatar = '';

                if (user) {
                    const global = user.globalName;
                    const username = user.username;
                    pseudo = (global && global !== username) ? `${global} (@${username})` : (username || id);
                    avatar = user.displayAvatarURL();
                    // Update cache silently
                    profileCache.set(id, pseudo, avatar);
                } else if (cached) {
                    pseudo = cached.name;
                    avatar = cached.avatar;
                } else {
                    pseudo = `Utilisateur (${id})`;
                }

                return { id: String(id), username: String(pseudo), avatar };
            });
        } catch (e) { return []; }
    }

    private async backgroundResolveUsers(ids: any[]) {
        // High-Speed Background Sync (2 every 500ms)
        const batchSize = 2;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            await Promise.all(batch.map(async (id) => {
                try {
                    if (!this.client.users.cache.has(id)) {
                        const user = await this.client.users.fetch(id);
                        if (user) {
                            const pseudo = (user.globalName && user.globalName !== user.username) 
                                ? `${user.globalName} (@${user.username})` 
                                : user.username;
                            profileCache.set(id, pseudo, user.displayAvatarURL());
                        }
                    }
                } catch (e) {}
            }));
            
            // Periodically save the cache to disk
            if (i % 20 === 0) profileCache.save();
            await new Promise(r => setTimeout(r, 600));
        }
        profileCache.save(); // Final save
    }

    async getGroupsList() {
        if (!this.client.user) return [];
        try {
            const groups = this.client.channels.cache.filter(c => c.type === 'GROUP_DM');
            return groups.map(c => {
                const recipients = (c as any).recipients;
                let name = (c as any).name;
                if (!name && recipients) {
                    name = Array.from(recipients.values())
                        .filter((r: any) => r.id !== this.client.user?.id)
                        .map((r: any) => r.globalName || r.username || r.id)
                        .join(', ');
                }
                if (!name || name.length === 0) name = 'Groupe DM';
                return { id: c.id, name, avatar: '' };
            });
        } catch (e) { return []; }
    }

    async leaveGroups(ids: string[], silent: boolean = false) {
        try {
            this.isSanitizing = true;
            const targetIds: any[] = ids.length > 0 ? ids : Array.from(this.client.channels.cache.filter(c => c.type === 'GROUP_DM').keys());
            this.log(`Départ${silent ? ' (discret)' : ''} de ${targetIds.length} groupes...`, 'info');
            let count = 0;
            for (const id of targetIds) {
                if (!this.isSanitizing) break;
                try {
                    let channel: any = this.client.channels.cache.get(id);
                    if (!channel) channel = await this.client.channels.fetch(id).catch(() => undefined);
                    if (channel && channel.type === 'GROUP_DM') {
                        const groupName = (channel as any).name || 'Groupe sans nom';
                        if (count % 10 === 0) this.log(`[Progression] Départ${silent ? ' discret' : ''} de : ${groupName}... (Total: ${count})`, 'info');
                        if (silent) await (this.client as any).api.channels(id).delete({ query: { silent: true } });
                        else await (channel as any).delete();
                        count++;
                        await new Promise(r => setTimeout(r, 800));
                    }
                } catch (e: any) { this.log(`Erreur groupe ${id} : ${e.message}`, 'error'); }
            }
            const finalMsg = !this.isSanitizing ? 'Départ des groupes interrompu.' : `${count} groupes quittés.`;
            this.log(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.log(`Erreur groupes : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async deleteFriends(ids: string[]) {
        try {
            this.isSanitizing = true;
            const targetIds: any[] = ids.length > 0 ? ids : Array.from((this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1).keys());
            this.log(`Nettoyage des relations : ${targetIds.length} cibles trouvées`, 'info');
            
            let success = 0;
            let failed = 0;

            for (const id of targetIds) {
                if (!this.isSanitizing) break;
                try {
                    const user = this.client.users.cache.get(id) || await this.client.users.fetch(id).catch(() => null);
                    const name = user ? user.tag : id;
                    
                    const rels: Record<string, any> = (this.client as any).api.users['@me'].relationships;
                    await rels[id].delete({ DiscordContext: { location: 'ContextMenu' } });
                    
                    success++;
                    if (success % 20 === 0) this.log(`[Progression] Amis retirés : ${success}... (Dernier: ${name})`, 'info');
                    await new Promise(r => setTimeout(r, 800));
                } catch (e: any) { 
                    failed++;
                    this.log(`[ERROR] Impossible de retirer ${id} : ${e.message}`, 'error'); 
                }
            }
            
            this.log(`Nettoyage terminé. Succès : ${success} | Échecs : ${failed}`, success > 0 ? 'success' : 'info');
            return { success: true, count: success, failed };
        } catch (err: any) {
            this.log(`Échec critique du nettoyage : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async stopSanitizer() { this.isSanitizing = false; }

    async closeAllDMs() {
        try {
            this.isSanitizing = true;
            const dmChannels = this.client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM');
            this.log(`Fermeture de ${dmChannels.size} conversations privées...`, 'info');
            let count = 0;
            for (const channel of dmChannels.values()) {
                if (!this.isSanitizing) break;
                try {
                    await (channel as any).delete();
                    count++;
                    if (count % 20 === 0) this.log(`[Progression] Fermeture des DM : ${count}...`, 'info');
                    await new Promise(r => setTimeout(r, 800)); // Human delay
                } catch (e: any) { this.log(`Erreur DM ${channel.id} : ${e.message}`, 'error'); }
            }
            const finalMsg = !this.isSanitizing ? 'Fermeture des conversations interrompue.' : `${count} conversations fermées.`;
            this.log(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.log(`Erreur fermeture DMs : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async getServersList() {
        if (!this.client.user) return [];
        try {
            return this.client.guilds.cache.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL({ dynamic: true, size: 64 }) || ''
            }));
        } catch (e) { return []; }
    }

    async leaveServers(ids: string[]) {
        try {
            this.isSanitizing = true;
            const targetIds = ids.length > 0 ? ids : Array.from(this.client.guilds.cache.keys());
            this.log(`Départ de ${targetIds.length} serveurs...`, 'info');
            let count = 0;
            for (const id of targetIds) {
                if (!this.isSanitizing) break;
                try {
                    const guild = this.client.guilds.cache.get(id);
                    if (guild) {
                        if (count % 5 === 0) this.log(`[Progression] Départ de : ${guild.name}... (Total: ${count})`, 'info');
                        await guild.leave();
                        count++;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } catch (e: any) { this.log(`Erreur serveur ${id} : ${e.message}`, 'error'); }
            }
            const finalMsg = !this.isSanitizing ? 'Départ des serveurs interrompu.' : `${count} serveurs quittés.`;
            this.log(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.log(`Erreur serveurs : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async dmAll(message: string) {
        try {
            this.isDMingAll = true;
            const friends = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1);
            const groups = this.client.channels.cache.filter(c => c.type === 'GROUP_DM');
            
            const totalTargets = friends.size + groups.size;
            
            this.log(`Démarrage DM ALL (${friends.size} amis, ${groups.size} groupes | Total: ${totalTargets})`, 'info');
            
            let success = 0;
            let failed = 0;
            let currentProgress = 0;
            let antiCaptchaCounter = 0;

            // 1. DMs aux Amis
            for (const id of friends.keys()) {
                if (!this.isDMingAll || !this.client.user) break;
                currentProgress++;
                antiCaptchaCounter++;
                let userName = String(id);
                
                try {
                    const user = await this.client.users.fetch(id as string);
                    userName = user.username;
                    await user.send(message.replace(/{user}/g, `<@${id}>`));
                    success++;
                    this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé à ${userName}`, 'success');
                } catch (e: any) {
                    if (e.status === 429 || /captcha/i.test(e.message)) {
                        this.log(`[DM ${currentProgress}/${totalTargets}] ⚠️ Rate-limit / Captcha ciblant ${userName} ! Attente **20s**...`, 'error');
                        await new Promise(r => setTimeout(r, 20000));
                        if (!this.isDMingAll) break;
                        try {
                           const userRes = await this.client.users.fetch(id as string);
                           await userRes.send(message.replace(/{user}/g, `<@${id}>`));
                           success++;
                           this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé à ${userName} (après pause)`, 'success');
                        } catch(re: any) {
                           failed++;
                           this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${userName} : ${re.message}`, 'error');
                        }
                    } else {
                        failed++;
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${userName} : ${e.message}`, 'error');
                    }
                }
                
                await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
                
                if (this.isDMingAll && antiCaptchaCounter > 0 && antiCaptchaCounter % 150 === 0) {
                    this.log(`[ANTI-CAPTCHA] Pause de sécurité (20s) après ${antiCaptchaCounter} requêtes...`, 'info');
                    await new Promise(r => setTimeout(r, 20000));
                }
            }
            
            if (this.isDMingAll && groups.size > 0) this.log('Début des envois aux Groupes DM...', 'info');
            
            // 2. DMs aux Groupes
            for (const channel of groups.values()) {
                if (!this.isDMingAll || !this.client.user) break;
                currentProgress++;
                antiCaptchaCounter++;
                let groupName = 'Groupe Inconnu';
                
                try {
                    const recipients = (channel as any).recipients;
                    groupName = (channel as any).name || (recipients?.size > 0 ? Array.from(recipients.values()).filter((r: any) => r.id !== this.client.user?.id).map((r: any) => r.username).join(', ') : 'Groupe DM');
                    
                    await (channel as any).send(message.replace(/{user}/g, groupName));
                    success++;
                    this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé au groupe ${groupName}`, 'success');
                } catch (e: any) {
                    if (e.status === 429) { 
                        this.log(`[DM ${currentProgress}/${totalTargets}] ⚠️ Rate-limit de groupe ! Attente **20s**...`, 'error');
                        await new Promise(r => setTimeout(r, 20000));
                        failed++; // Note: we don't retry group DMs here to avoid infinite loops, just mark failed
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec (Rate-limit) pour ${groupName}`, 'error');
                    } else {
                        failed++;
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${groupName} : ${e.message}`, 'error');
                    }
                }
                
                await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
                if (this.isDMingAll && antiCaptchaCounter > 0 && antiCaptchaCounter % 30 === 0) {
                    await new Promise(r => setTimeout(r, 20000));
                }
            }
            
            const processed = success + failed;
            const finalMsg = !this.isDMingAll 
                 ? `DM ALL interrompu. Progression : ${success} réussis, ${failed} échoués sur ${processed} tentés.` 
                 : `DM ALL terminé : ${success} réussis sur un total de ${totalTargets} cibles. (${failed} échecs)`;
            
            this.log(finalMsg, this.isDMingAll ? 'success' : 'info');
            this.isDMingAll = false;
            return { success: true, count: success };
        } catch (err: any) { this.isDMingAll = false; return { success: false, error: err.message }; }
    }

    async stopDMAll() { this.isDMingAll = false; }
    
    async startSpam({ channelIds, texts, delay: requestedDelay, jitter = false, maxMessages = 0, proxies = [] }: any) {
        try {
            this.isSpamming = true;
            this.messageCounter = 0;
            this.proxyList = proxies;
            const delay = Number(requestedDelay) || 1000;

            this.log(`🚀 NUKE ENGAGED : ${channelIds.length} cibles | Intervalle : ${delay}ms`, 'success');
            
            while (this.isSpamming) {
                if (this.isStealthMode) { await new Promise(r => setTimeout(r, 5000)); continue; }
                
                for (const channelId of channelIds) {
                    if (!this.isSpamming) break;
                    if (maxMessages > 0 && this.messageCounter >= maxMessages) { this.isSpamming = false; break; }
                    
                    const startTime = Date.now();
                    try {
                        let channel = await this.client.channels.fetch(channelId).catch(() => null);
                        
                        // Fallback for Friends as targets (UserId)
                        if (!channel) {
                            const user = await this.client.users.fetch(channelId).catch(() => null);
                            if (user) {
                                channel = await user.createDM().catch(() => null);
                            }
                        }

                        if (channel && channel.isText()) {
                            const text = texts[Math.floor(Math.random() * texts.length)];
                            await (channel as any).send(text);
                            this.messageCounter++;
                            if (this.messageCounter % 20 === 0) this.log(`[Progression] Spam global : ${this.messageCounter} messages envoyés...`, 'info');
                        }
                    } catch (e: any) {
                        if (e.status === 429) {
                            this.log('Anti-Spam Discord détecté. Pause de sécurité (8s)...', 'error');
                            this.isStealthMode = true;
                            setTimeout(() => this.isStealthMode = false, 8000);
                            break;
                        }
                    }

                    // Precise sleep: Subtract elapsed time from the intended delay
                    const elapsed = Date.now() - startTime;
                    const finalDelay = Math.max(0, (jitter ? delay + (Math.random() * 50) : delay) - elapsed);
                    await new Promise(r => setTimeout(r, finalDelay));
                }
                if (channelIds.length === 0) break;
            }
            const finalMsg = !this.isSpamming ? 'Spam interrompu.' : `Spam terminé : ${this.messageCounter} messages envoyés.`;
            this.log(finalMsg, this.isSpamming ? 'success' : 'info');
            this.isSpamming = false;
            return { success: true, count: this.messageCounter };
        } catch (err: any) { this.isSpamming = false; return { success: false, error: err.message }; }
    }

    async stopSpam() { this.isSpamming = false; return { success: true }; }
    async toggleSpotifyLyrics(enabled: boolean, cookie?: string) {
        this.log(enabled ? "Activation de la synchronisation Spotify Lyrics..." : "Désactivation de la synchronisation Spotify Lyrics.", enabled ? 'success' : 'info');
        if (cookie) this.spotifyService.setConfig(cookie);
        if (enabled) this.spotifyService.start();
        else this.spotifyService.stop();
        return { success: true };
    }
    async toggleRotator(config: RotatorConfig) {
        if (config.enabled) this.profileRotator.start(config);
        else this.profileRotator.stop();
        return { success: true };
    }
    async forceRotatorUpdate() { this.profileRotator.forceUpdate(); return { success: true }; }

    async checkPomelo(username: string) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        try {
            // 1. Availability check via internal Discord endpoint
            const res = await (this.client as any).api.users['@me']['pomelo-attempt'].post({
                data: { username }
            });
            
            if (res.taken) {
                // 2. Ghost detection: If taken, check if a user actually exists with this name
                // We attempt to "resolve" the handle by trying to start a friend request (without finishing)
                try {
                    await (this.client as any).api.users['@me'].relationships.post({
                        data: { username }
                    });
                    // If it somehow succeeds, it's taken - remove from ghost tracker if it was there
                    ghostTracker.remove(username);
                    return { success: true, data: { available: false, status: 'taken' } };
                } catch (err: any) {
                    const errorCode = err.code || (err.rawError && err.rawError.code);
                    const status = err.status || (err.rawError && err.rawError.status);
                    const message = err.message || (err.rawError && err.rawError.message);
                    
                    this.log(`[POMELO] Result for ${username}: Code ${errorCode}, Status ${status}, Msg: ${message}`, 'info');

                    // Detect Captcha (Robust Check)
                    const isCaptcha = 
                        message?.toUpperCase().includes('CAPTCHA') || 
                        Number(errorCode) === 500 || 
                        errorCode === 'CAPTCHA_SOLVER_NOT_IMPLEMENTED' ||
                        status === 429;
                    
                    if (isCaptcha) {
                        this.log(`[POMELO] Detected CAPTCHA/Block for ${username}`, 'error');
                        return { success: true, data: { available: false, status: 'captcha' } };
                    }

                    // 40033 / 40001 = Cannot add yourself (means it's your reserved name)
                    // status 404 = Not found
                    if (Number(errorCode) === 40033 || Number(errorCode) === 40001 || status === 404) {
                        const firstSeen = ghostTracker.track(username);
                        return { success: true, data: { available: false, status: 'ghost', firstSeen } };
                    }
                    
                    // Default to taken if we can't confirm ghost or captcha
                    this.log(`[POMELO] Treating as TAKEN for ${username} (Unrecognized error)`, 'info');
                    ghostTracker.remove(username);
                    return { success: true, data: { available: false, status: 'taken' } };
                }
            }
            
            // 3. Ownership detection: If available, check if it's our own current name
            if (username.toLowerCase() === this.client.user.username.toLowerCase()) {
                return { success: true, data: { available: true, status: 'owned' } };
            }
            
            // If available and not ours, remove from ghost tracker
            ghostTracker.remove(username);
            return { success: true, data: { available: true, status: 'available' } };
        } catch (err: any) {
            console.error('[POMELO] API Error:', err);
            if (err.status === 429) return { success: false, error: 'Rate-limited', retryAfter: err.retryAfter };
            return { success: false, error: err.message || 'Erreur API inconnue' };
        }
    }

    async claimPomelo(username: string, password?: string) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        if (!password) return { success: false, error: 'Mot de passe requis pour le claim' };
        
        try {
            this.log(`🔥 Tentative de CLAIM du pseudo : ${username}...`, 'info');
            const res = await (this.client as any).api.users['@me'].patch({
                data: {
                    username,
                    password
                }
            });
            
            if (res.username === username) {
                this.log(`🎉 SUCCÈS : Pseudo ${username} récupéré !`, 'success');
                return { success: true, username: res.username };
            }
            return { success: false, error: 'Le pseudo n\'a pas pu être changé' };
        } catch (err: any) {
            this.log(`❌ Échec du claim (${username}) : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async batchCheckPomelo(usernames: string[], { delay = 1000, autoClaim = false, password = '' }) {
        if (this.isPomeloBatching) return { success: false, error: 'Un check est déjà en cours' };
        this.isPomeloBatching = true;
        
        this.log(`🎯 Démarrage Batch Check (${usernames.length} pseudos)`, 'info');
        
        let found = 0;
        for (const username of usernames) {
            if (!this.isPomeloBatching) break;
            
            const result = await this.checkPomelo(username);
            if (result.success && result.data) {
                if (result.data.available) {
                    this.log(`🟢 DISPONIBLE : ${username}`, 'success');
                    this.emit('pomelo-update', { username, status: 'available' });
                    found++;
                    
                    if (autoClaim && password) {
                        const claimRes = await this.claimPomelo(username, password);
                        if (claimRes.success) {
                            this.isPomeloBatching = false;
                            return { success: true, data: { found, claimed: username } };
                        }
                    }
                } else {
                    const status = result.data.status;
                    const firstSeen = result.data.firstSeen;
                    this.log(`${status === 'ghost' ? '🟠 GHOST' : '🔴 PRIS'} : ${username}`, 'info');
                    this.emit('pomelo-update', { username, status, firstSeen });
                }
            } else {
                this.log(`⚠️ Erreur check ${username} : ${result.error}`, 'error');
                if (result.error === 'Rate-limited') {
                    const waitTime = (result.retryAfter || 5) * 1000;
                    this.log(`⏳ Rate-limit ! Attente de ${waitTime/1000}s...`, 'info');
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
            
            await new Promise(r => setTimeout(r, delay));
        }
        
        this.isPomeloBatching = false;
        this.log(`✅ Batch Check terminé. ${found} pseudos trouvés.`, 'info');
        return { success: true, found };
    }

    async stopPomeloBatch() {
        this.isPomeloBatching = false;
        return { success: true };
    }

    private startAppDetection() {
        if (this.appDetectionTimer) return;
        this.log('Moteur de détection d\'applications en ligne', 'info');
        this.appDetectionTimer = setInterval(async () => {
            if (!this.client.user || !this.settings?.allowActiveAppDetection) return;
            
            // Priority: Don't overwrite Farmer status if active
            if (this.voiceStalker.getStatus().status === 'hopping') return;

            const apps = await this.appDetector.getActiveApps();
            if (apps.length > 0) {
                const topApp = apps[0]; // Take the first matched one
                if (this.currentDetectedApp !== topApp.name) {
                    this.currentDetectedApp = topApp.name;
                    this.log(`Application détectée : ${topApp.name}`, 'info');
                    
                    this.client.user.setActivity(topApp.name, {
                        type: topApp.type === 'game' ? 0 : topApp.type === 'media' ? 2 : 3,
                        applicationId: topApp.applicationId
                    } as any);
                }
            } else if (this.currentDetectedApp) {
                this.currentDetectedApp = null;
                // Reset to default or rotator (next cycle will fix it)
            }
        }, 45000); // Check every 45s
    }

    private stopAppDetection() {
        if (this.appDetectionTimer) {
            clearInterval(this.appDetectionTimer);
            this.appDetectionTimer = null;
            this.currentDetectedApp = null;
        }
    }

    async startGroupRename(channelId: string, names: string[], delay: number = 2000) {
        if (this.isGroupRenaming) return { success: false, error: 'Un renommage est déjà en cours' };
        if (!names || names.length === 0) return { success: false, error: 'Liste de noms vide' };

        try {
            let channel: any = this.client.channels.cache.get(channelId);
            if (!channel) channel = await this.client.channels.fetch(channelId).catch(() => null);
            
            if (!channel || channel.type !== 'GROUP_DM') {
                return { success: false, error: 'Groupe introuvable' };
            }

            this.isGroupRenaming = true;
            this.log(`🚀 Démarrage du Spammer de Nom sur "${channel.name || 'Groupe'}" (${names.length} noms)...`, 'info');

            let index = 0;
            while (this.isGroupRenaming) {
                try {
                    const nextName = names[index % names.length];
                    await channel.setName(nextName);
                    index++;
                    
                    if (index % 5 === 0) this.log(`[Group] ${index} changements effectués...`, 'info');
                    
                    await new Promise(r => setTimeout(r, Math.max(delay, 100)));
                } catch (e: any) {
                    if (e.status === 429) {
                        const retryAfter = (e.retryAfter || 5) * 1000;
                        this.log(`[Group] Rate-limit atteint. Pause de ${retryAfter/1000}s...`, 'error');
                        await new Promise(r => setTimeout(r, retryAfter));
                    } else {
                        this.log(`[Group] Erreur : ${e.message}`, 'error');
                        this.isGroupRenaming = false;
                        break;
                    }
                }
            }
            return { success: true };
        } catch (err: any) {
            this.isGroupRenaming = false;
            return { success: false, error: err.message };
        }
    }

    async stopGroupRename() {
        this.isGroupRenaming = false;
        this.log('🛑 Spammer de Nom arrêté.', 'info');
    }

    async setHypeSquad(houseId: number) {
        if (!this.client.user) return { success: false, error: 'Bot non connecte' };
        try {
            // houseId: 0: null, 1: HOUSE_BRAVERY, 2: HOUSE_BRILLIANCE, 3: HOUSE_BALANCE
            if (houseId === 0) {
                // Method: Dedicated DELETE to remove HypeSquad badge
                await (this.client as any).api.hypesquad.online.delete();
                this.log('Badge HypeSquad retire avec succes.', 'success');
            } else {
                const houses = ['', 'Bravery', 'Brilliance', 'Balance'];
                // Method: Dedicated POST for house selection (often bypasses some profile patch blocks)
                await (this.client as any).api.hypesquad.online.post({
                    data: { house_id: houseId }
                });
                this.log(`Badge HypeSquad mis a jour : ${houses[houseId]}`, 'success');
            }
            return { success: true };
        } catch (err: any) {
            this.log(`Echec HypeSquad : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async cloneGroup(groupId: string) {
        if (!this.client.user) return { success: false, error: 'Non connecte' };
        try {
            this.log(`Clone du groupe ${groupId} en cours...`, 'info');
            const sourceChan = await this.client.channels.fetch(groupId).catch(() => null) as any;
            if (!sourceChan || sourceChan.type !== 'GROUP_DM') return { success: false, error: 'Groupe source introuvable' };

            const friendIds = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1).map((_: any, id: string) => id);
            const recipientsToClone = Array.from(sourceChan.recipients.keys())
                .filter((id: any) => id !== this.client.user?.id && friendIds.includes(id));

            if (recipientsToClone.length === 0) return { success: false, error: 'Aucun ami trouvé dans ce groupe pour le clonage' };

            this.log(`Creation du nouveau groupe avec ${recipientsToClone.length} amis...`, 'info');
            const newGroup = await (this.client as any).channels.createGroupDM(recipientsToClone);
            
            if (sourceChan.name) {
                await newGroup.edit({ name: sourceChan.name });
            }

            this.log(`Groupe clone avec succes ! ID: ${newGroup.id}`, 'success');
            return { success: true, newGroupId: newGroup.id };
        } catch (err: any) {
            this.log(`Echec du clonage : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async massAddRecipients(groupId: string, userIds: string[], delayMs: number = 2000) {
        if (!this.client.user) return { success: false, error: 'Non connecte' };
        try {
            this.log(`Demarrage du Mass Add (${userIds.length} cibles)...`, 'info');
            const channel = await this.client.channels.fetch(groupId).catch(() => null) as any;
            if (!channel || channel.type !== 'GROUP_DM') return { success: false, error: 'Groupe introuvable' };

            let count = 0;
            for (const userId of userIds) {
                try {
                    await channel.addUser(userId);
                    count++;
                    this.log(`[Mass Add] Ajoute: ${userId} (${count}/${userIds.length})`, 'info');
                    if (userIds.indexOf(userId) < userIds.length - 1) {
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                } catch (e: any) {
                    this.log(`[Mass Add] Erreur pour ${userId} : ${e.message}`, 'error');
                }
            }
            this.log(`Mass Add termine : ${count} ajoutes.`, 'success');
            return { success: true, count };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
