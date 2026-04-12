import { Client } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { UserProfile, RotatorConfig, AppSettings } from '../../shared/types';
import { ProfileRotator } from './profile-rotator';
import { VoiceStalker } from './voice-stalker';
import { app, BrowserWindow } from 'electron';
import { statsService } from '../services/stats-service';
const ProxyAgent = require('proxy-agent');
const UserAgent = require('user-agents');

export class BotService extends EventEmitter {
    public client: Client;
    private isSpamming: boolean = false;
    private isPurging: boolean = false;
    private isDMingAll: boolean = false;
    private isSanitizing: boolean = false;
    public voiceStalker: VoiceStalker;
    private spotifyService: import('./spotify-service').SpotifyService;
    public profileRotator: ProfileRotator;
    private autoResponder: import('./auto-responder').AutoResponder;
    private messageFarmer: import('./message-farmer').MessageFarmer;
    private currentPriorityStatus: string | null = null;
    private lastStatusUpdateAt: number = 0;
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
        this.autoResponder = new (require('./auto-responder').AutoResponder)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.messageFarmer = new (require('./message-farmer').MessageFarmer)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.spotifyService = new (require('./spotify-service').SpotifyService)(this.client, this);
        this.profileRotator = new ProfileRotator(
            this.client, 
            app.getPath('userData'),
            (msg: string, type: any) => this.log(msg, type)
        );

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

    public log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
        console.log(chalk.blue(`[LOG] ${msg}`));
        this.emit('bot-log', { msg, type, time: new Date().toLocaleTimeString() });
    }

    async purgeMessages(channelId: string, amount: number, purgeAll: boolean = false, delay: number = 1000) {
        try {
            let channel = await this.client.channels.fetch(channelId).catch(() => null);
            
            // If channel fetch fails, it might be a Friend/User ID
            if (!channel) {
                const user = await this.client.users.fetch(channelId).catch(() => null);
                if (user) {
                    this.log(`Création/Ouverture du DM pour ${user.tag}...`, 'info');
                    channel = await user.createDM().catch(() => null);
                }
            }

            if (!channel || !channel.isText()) {
                this.log('Salon introuvable ou non textuel (DM protégé ?).', 'error');
                return;
            }

            this.isPurging = true;
            const isAll = amount >= 1000;
            this.log(`Démarrage de la purge (${isAll ? 'ALL' : amount} messages, mode: ${purgeAll ? 'Global' : 'Perso'}, délai: ${delay}ms)...`, 'info');

            let fetched;
            let deleted = 0;
            
            do {
                if (!this.isPurging) break;
                const limit = isAll ? 100 : Math.min(amount - deleted, 100);
                if (limit <= 0) break;

                fetched = await channel.messages.fetch({ limit }).catch(() => null);
                if (!fetched || fetched.size === 0) break;

                const toDelete = fetched.filter(m => purgeAll ? true : m.author.id === this.client.user?.id);
                if (toDelete.size === 0 && !isAll) break;

                for (const msg of toDelete.values()) {
                    if (!this.isPurging) break;
                    try {
                        await msg.delete();
                        deleted++;
                        if (deleted % 10 === 0) this.log(`Suppression : ${deleted} messages...`, 'info');
                    } catch (e: any) {
                        if (e.status === 429) {
                            this.log('Rate-limit atteint, pause de 2s...', 'error');
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                    await new Promise(r => setTimeout(r, Math.max(delay, 50)));
                    if (!isAll && deleted >= amount) break;
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
                    const diffTime = expiryDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    this.nitroExpiryDate = `Active (expires in ${diffDays} days)`;
                } else {
                    this.nitroExpiryDate = 'Active';
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
            this.client = new Client();
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
        if (this.client) {
            const oldClient = this.client;
            oldClient.removeAllListeners(); 
            oldClient.destroy();
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
            const nitro = (this.client.user.premiumType as any) !== 0;
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

    public updateCustomStatus(text: string, isPriority: boolean = false) {
        if (!this.client.user) return;
        const now = Date.now();
        if (!isPriority && this.currentPriorityStatus) return;
        
        if (isPriority) this.currentPriorityStatus = text;
        else this.currentPriorityStatus = null;

        let rawStatus = this.sanitizeContent(text);
        rawStatus = rawStatus.length > 125 ? rawStatus.substring(0, 125) + '...' : rawStatus;
        
        const currentPresence = this.client.user.presence;
        const currentBubble = currentPresence?.activities.find((a: any) => a.type === 'CUSTOM' || (a.type as any) === 4)?.state;

        if (currentBubble === rawStatus && now - this.lastStatusUpdateAt < 30000) return;
        if (rawStatus !== '' && now - this.lastStatusUpdateAt < 900) return;

        this.lastStatusUpdateAt = now;
        try {
            (this.client as any).settings.setCustomStatus({ text: rawStatus });
        } catch (e) {
            console.error('[BotService] Error updating status:', e);
        }
    }

    public updateEngineSettings(settings: AppSettings) {
        this.settings = settings;
        this.log('Synchronisation des paramètres moteurs...', 'info');

        if (this.spotifyService) {
            const isSpotifyOn = !!settings.spotifyLyricsEnabled;
            if (isSpotifyOn) this.spotifyService.start();
            else this.spotifyService.stop();
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
                    servers.push({
                        id: guild.id,
                        name: guild.name,
                        guildTag: guildTag,
                        icon: guild.iconURL({ dynamic: true, size: 64 }) || '',
                        channels: guildChannels
                    });
                }
            });

            // 2. Gather All Possible DM Targets (Map to deduplicate by Recipient ID)
            // We use recipientId as key to merge "Friendship" and "DM Channel" info
            const dmTargets = new Map<string, any>();

            // a. Process Relationships (Friends)
            const relationships = (this.client.relationships as any).cache;
            relationships.filter((r: any) => r.type === 1 || r === 1).forEach((rel: any) => {
                const user = rel.user;
                const name = user ? (user.globalName || user.username || rel.id) : `Utilisateur (${rel.id})`;
                dmTargets.set(rel.id, {
                    id: rel.id, // User ID as fallback
                    targetUserId: rel.id,
                    name: `[AMI] ${name}`,
                    icon: user ? user.displayAvatarURL() : '',
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
            const friends = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1);
            return Array.from(friends.values()).map((rel: any) => {
                const user = rel.user;
                const pseudo = user ? (user.globalName || user.username || rel.id) : `Utilisateur (${rel.id})`;
                return { id: rel.id, username: pseudo, avatar: user ? user.displayAvatarURL() : '' };
            });
        } catch (e) { return []; }
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
                        this.log(`Départ${silent ? ' discret' : ''} de : ${groupName}...`, 'info');
                        if (silent) await (this.client as any).api.channels(id).delete({ query: { silent: true } });
                        else await (channel as any).delete();
                        count++;
                        await new Promise(r => setTimeout(r, 800));
                    }
                } catch (e: any) { this.log(`Erreur groupe ${id} : ${e.message}`, 'error'); }
            }
            this.log(`${count} groupes quittés.`, 'success');
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
            this.log(`Suppression de ${targetIds.length} amis...`, 'info');
            let count = 0;
            for (const id of targetIds) {
                if (!this.isSanitizing) break;
                try {
                    const rels: Record<string, any> = (this.client as any).api.users['@me'].relationships;
                    await rels[id].delete({ DiscordContext: { location: 'ContextMenu' } });
                    count++;
                    await new Promise(r => setTimeout(r, 800));
                } catch (e: any) { this.log(`Erreur ami ${id} : ${e.message}`, 'error'); }
            }
            this.log(`${count} amis supprimés.`, 'success');
            return { success: true, count };
        } catch (err: any) {
            this.log(`Erreur amis : ${err.message}`, 'error');
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
                    await new Promise(r => setTimeout(r, 800)); // Human delay
                } catch (e: any) { this.log(`Erreur DM ${channel.id} : ${e.message}`, 'error'); }
            }
            this.log(`${count} conversations fermées.`, 'success');
            return { success: true, count };
        } catch (err: any) {
            this.log(`Erreur fermeture DMs : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async dmAll(message: string) {
        try {
            this.isDMingAll = true;
            const friends = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1);
            const groups = this.client.channels.cache.filter(c => c.type === 'GROUP_DM');
            this.log(`Démarrage DM ALL (${friends.size} amis, ${groups.size} groupes)`, 'info');
            let success = 0;
            let counter = 0;
            for (const id of friends.keys()) {
                if (!this.isDMingAll || !this.client.user) break;
                try {
                    const user = await this.client.users.fetch(id as string);
                    await user.send(message.replace(/{user}/g, `<@${id}>`));
                    success++;
                    this.log(`[${success}] Envoyé à ${user.username}`, 'info');
                } catch (e: any) {
                    if (e.status === 429 || /captcha/i.test(e.message)) {
                        this.log('Rate-limit / Captcha ! Attente **20s**...', 'error');
                        await new Promise(r => setTimeout(r, 20000));
                        if (!this.isDMingAll) break;
                        try {
                           const userRes = await this.client.users.fetch(id as string);
                           await userRes.send(message.replace(/{user}/g, `<@${id}>`));
                           success++;
                        } catch(re) {}
                    }
                }
                counter++;
                await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
                if (this.isDMingAll && counter > 0 && counter % 150 === 0) {
                    this.log('Pause anti-captcha prolongée (20s)...', 'info');
                    await new Promise(r => setTimeout(r, 20000));
                }
            }
            counter = 0;
            if (this.isDMingAll) this.log('Début des DMs de groupes...', 'info');
            for (const channel of groups.values()) {
                if (!this.isDMingAll || !this.client.user) break;
                try {
                    const recipients = (channel as any).recipients;
                    const groupName = (channel as any).name || (recipients?.size > 0 ? Array.from(recipients.values()).filter((r: any) => r.id !== this.client.user?.id).map((r: any) => r.username).join(', ') : 'Groupe DM');
                    await (channel as any).send(message.replace(/{user}/g, groupName));
                    success++;
                    this.log(`[${success}] Envoyé au groupe ${groupName}`, 'info');
                } catch (e: any) {
                    if (e.status === 429) { await new Promise(r => setTimeout(r, 20000)); }
                }
                counter++;
                await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
                if (this.isDMingAll && counter > 0 && counter % 30 === 0) await new Promise(r => setTimeout(r, 20000));
            }
            this.isDMingAll = false;
            return { success: true, count: success };
        } catch (err: any) { this.isDMingAll = false; return { success: false, error: err.message }; }
    }

    async stopDMAll() { this.isDMingAll = false; }
    
    async startSpam({ channelIds, texts, delay, jitter = false, maxMessages = 0, proxies = [] }: any) {
        try {
            this.isSpamming = true;
            this.messageCounter = 0;
            this.proxyList = proxies;
            this.log(`🚀 NUKE ENGAGED : ${channelIds.length} cibles`, 'success');
            while (this.isSpamming) {
                if (this.isStealthMode) { await new Promise(r => setTimeout(r, 5000)); continue; }
                for (const channelId of channelIds) {
                    if (!this.isSpamming) break;
                    if (maxMessages > 0 && this.messageCounter >= maxMessages) { this.isSpamming = false; break; }
                    try {
                        let channel = await this.client.channels.fetch(channelId).catch(() => null);
                        
                        // Fallback for Friends as targets (UserId)
                        if (!channel) {
                            const user = await this.client.users.fetch(channelId).catch(() => null);
                            if (user) {
                                channel = await user.createDM().catch(() => null);
                            }
                        }

                        if (!channel || !channel.isText()) continue;
                        const text = texts[Math.floor(Math.random() * texts.length)];
                        await (channel as any).send(text);
                        this.messageCounter++;
                        this.emit('bot-log', { msg: `[SUCCESS] ${this.messageCounter}`, type: 'success' });
                    } catch (e: any) {
                        if (e.status === 429) {
                            this.isStealthMode = true;
                            setTimeout(() => this.isStealthMode = false, 300000);
                            break;
                        }
                    }
                    await new Promise(r => setTimeout(r, jitter ? delay + Math.random() * 200 : delay));
                }
                if (channelIds.length === 0) break;
            }
            this.isSpamming = false;
            return { success: true, count: this.messageCounter };
        } catch (err: any) { this.isSpamming = false; return { success: false, error: err.message }; }
    }

    async stopSpam() { this.isSpamming = false; return { success: true }; }
    async toggleSpotifyLyrics(enabled: boolean, cookie?: string) {
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
}
