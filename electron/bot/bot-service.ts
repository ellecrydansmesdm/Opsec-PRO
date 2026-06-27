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
import { SanitizerService } from './sanitizer-service';
import { GroupService } from './group-service';
import { PomeloService } from './pomelo-service';

export class BotService extends EventEmitter {
    public client: Client;
    private isSpamming: boolean = false;
    private activeSpamConfig: any = null;
    private isPurging: boolean = false;
    private isDMingAll: boolean = false;
    private spotifyService: import('./spotify-service').SpotifyService;
    public profileRotator: ProfileRotator;
    private autoResponder: import('./auto-responder').AutoResponder;
    public messageFarmer: import('./message-farmer').MessageFarmer;
    public voiceStalker: VoiceStalker;
    private farmerInstances: Map<string, { messageFarmer: import('./message-farmer').MessageFarmer; voiceStalker: VoiceStalker }> = new Map();
    private farmerClients: Map<string, Client> = new Map();
    public protectionService: import('./protection-service').ProtectionService;
    private appDetector: import('./app-detector').AppDetector;
    private appDetectionTimer: NodeJS.Timeout | null = null;
    private currentDetectedApp: string | null = null;
    private isAutoJoining: boolean = false;
    private spamClients: Map<string, Client> = new Map();
    private currentPriorityStatus: string | null = null;
    private lastStatusUpdateAt: number = 0;
    public automationService: AutomationService;
    public reactionService: ReactionService;
    private sanitizerService: SanitizerService;
    public groupService: GroupService;
    private pomeloService: PomeloService;
    private proxyList: string[] = [];
    private currentProxyIndex: number = 0;
    private messageCounter: number = 0;
    private isStealthMode: boolean = false;
    private connectionStartTime: number = 0;
    private nitroExpiryDate: string | null = null;
    private settings: AppSettings | null = null;
    private discordProfile: any = null;

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

        this.autoResponder = new (require('./auto-responder').AutoResponder)(this.client, (msg: any, type: any) => this.log(msg, type), this);
        this.messageFarmer = new (require('./message-farmer').MessageFarmer)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.voiceStalker = new VoiceStalker(this.client, (msg, type) => this.log(msg, type));
        this.spotifyService = new (require('./spotify-service').SpotifyService)(this.client, this);
        this.profileRotator = new ProfileRotator(
            this.client, 
            app.getPath('userData'),
            (msg: string, type: any) => this.log(msg, type),
            () => !!this.settings?.privateMode
        );
        this.protectionService = new (require('./protection-service').ProtectionService)(this.client, (msg: any, type: any) => this.log(msg, type));
        this.appDetector = new (require('./app-detector').AppDetector)();
        this.automationService = new AutomationService(this.client, (msg, type) => this.log(msg, type));
        this.reactionService = new ReactionService((msg, type) => this.log(msg, type));
        this.reactionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
        this.sanitizerService = new SanitizerService(this.client, (msg, type) => this.log(msg, type));
        this.groupService = new GroupService(this.client, (msg, type) => this.log(msg, type));
        this.pomeloService = new PomeloService(this.client, (msg, type) => this.log(msg, type), (ev, data) => {
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send(ev, data);
            });
        });
        
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

    public async checkTwoCaptchaKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch(`https://2captcha.com/res.php?key=${key}&action=getbalance&json=1`).then(r => r.json()) as any;
            if (res.status === 1) {
                this.log(`[2Captcha] Clé valide. Solde : ${res.request}$`, 'success');
                return { success: true, balance: parseFloat(res.request) };
            } else {
                return { success: false, error: res.request || 'Clé invalide' };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkAntiCaptchaKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.anti-captcha.com/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.log(`[Anti-Captcha] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.errorDescription || `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkCapsolverKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.capsolver.com/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.log(`[Capsolver] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.errorDescription || `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkNoCaptchaAIKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch(`https://manage.nocaptchaai.com/api/user/balance?key=${key}`).then(r => r.json()) as any;
            if (res.balance !== undefined) {
                this.log(`[NoCaptchaAI] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.error || 'Clé invalide' };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public getDiagnostics() {
        const diagnostics: any = {
            captchaSolverActive: false,
            captchaSolverType: 'Aucun',
            proxyActive: false,
            proxyCount: 0,
            pomeloWarn: false,
            userIsBot: false
        };

        if (this.settings?.automationConfig) {
            const cfg = this.settings.automationConfig;
            if (cfg.capsolverKey) {
                diagnostics.captchaSolverActive = true;
                diagnostics.captchaSolverType = 'Capsolver';
            } else if (cfg.capMonsterKey) {
                diagnostics.captchaSolverActive = true;
                diagnostics.captchaSolverType = 'CapMonster';
            } else if (cfg.twoCaptchaKey) {
                diagnostics.captchaSolverActive = true;
                diagnostics.captchaSolverType = '2Captcha';
            } else if (cfg.antiCaptchaKey) {
                diagnostics.captchaSolverActive = true;
                diagnostics.captchaSolverType = 'Anti-Captcha';
            } else if (cfg.noCaptchaAIKey) {
                diagnostics.captchaSolverActive = true;
                diagnostics.captchaSolverType = 'NoCaptchaAI';
            }

            if (cfg.proxyEnabled && cfg.proxyList && cfg.proxyList.length > 0) {
                diagnostics.proxyActive = true;
                diagnostics.proxyCount = cfg.proxyList.length;
            }
        }

        diagnostics.pomeloWarn = true; // UX alert is always on to educate user
        diagnostics.userIsBot = this.client?.user?.bot || false;

        return { success: true, data: diagnostics };
    }

    public log(msg: string, type: 'info' | 'success' | 'error' = 'info', messageId?: string) {
        console.log(chalk.blue(`[LOG] ${msg}`));
        this.emit('bot-log', { msg, type, time: new Date().toLocaleTimeString(), messageId });
    }

    private getCaptchaSolverConfig(): { provider: string; key: string } | null {
        const cfg = this.settings?.automationConfig;
        if (!cfg) return null;
        if (cfg.capsolverKey?.trim()) return { provider: 'capsolver', key: cfg.capsolverKey.trim() };
        if (cfg.capMonsterKey?.trim()) return { provider: 'capmonster', key: cfg.capMonsterKey.trim() };
        if (cfg.twoCaptchaKey?.trim()) return { provider: '2captcha', key: cfg.twoCaptchaKey.trim() };
        if (cfg.antiCaptchaKey?.trim()) return { provider: 'anticaptcha', key: cfg.antiCaptchaKey.trim() };
        if (cfg.noCaptchaAIKey?.trim()) return { provider: 'nocaptchaai', key: cfg.noCaptchaAIKey.trim() };
        return null;
    }

    public hasCaptchaSolver(): boolean {
        return this.getCaptchaSolverConfig() !== null;
    }

    private async solveWithCapMonster(key: string, captcha: any, UA: string): Promise<string> {
        this.log('[CapMonster] Résolution du captcha hCaptcha en cours...', 'info');
        const createRes = await fetch('https://api.capmonster.cloud/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: key,
                task: {
                    type: 'HCaptchaTaskProxyless',
                    websiteURL: 'https://discord.com',
                    websiteKey: captcha.captcha_sitekey,
                    isInvisible: true,
                    data: captcha.captcha_rqdata,
                    userAgent: UA,
                },
            }),
        }).then(res => res.json()) as any;

        if (createRes.errorId !== 0) throw new Error(`CapMonster Error: ${createRes.errorCode}`);

        const taskId = createRes.taskId;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const resultRes = await fetch('https://api.capmonster.cloud/getTaskResult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key, taskId }),
            }).then(res => res.json()) as any;

            if (resultRes.status === 'ready') {
                this.log('[CapMonster] Captcha résolu avec succès !', 'success');
                return resultRes.solution.gRecaptchaResponse;
            }
            if (resultRes.errorId !== 0) throw new Error(`CapMonster Error: ${resultRes.errorCode}`);
        }
        throw new Error('CapMonster Timeout');
    }

    private async solveWithCapsolver(key: string, captcha: any, UA: string): Promise<string> {
        this.log('[Capsolver] Résolution du captcha hCaptcha en cours...', 'info');
        const createRes = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: key,
                task: {
                    type: 'HCaptchaTaskProxyLess',
                    websiteURL: 'https://discord.com',
                    websiteKey: captcha.captcha_sitekey,
                    isInvisible: true,
                    userAgent: UA,
                    enterprisePayload: captcha.captcha_rqdata ? { rqdata: captcha.captcha_rqdata } : undefined,
                },
            }),
        }).then(res => res.json()) as any;

        if (createRes.errorId !== 0) throw new Error(`Capsolver Error: ${createRes.errorDescription || createRes.errorCode}`);

        const taskId = createRes.taskId;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key, taskId }),
            }).then(res => res.json()) as any;

            if (resultRes.status === 'ready') {
                this.log('[Capsolver] Captcha résolu avec succès !', 'success');
                return resultRes.solution.gRecaptchaResponse;
            }
            if (resultRes.errorId !== 0) throw new Error(`Capsolver Error: ${resultRes.errorDescription || resultRes.errorCode}`);
        }
        throw new Error('Capsolver Timeout');
    }

    private async solveCaptcha(captcha: any, UA: string): Promise<string> {
        const solver = this.getCaptchaSolverConfig();
        if (!solver) {
            this.log('Captcha détecté — configurez une clé API dans Network Hub (Resolvers).', 'error');
            return '';
        }

        try {
            if (solver.provider === 'capsolver') return await this.solveWithCapsolver(solver.key, captcha, UA);
            if (solver.provider === 'capmonster') return await this.solveWithCapMonster(solver.key, captcha, UA);
            this.log(`[Captcha] Solveur ${solver.provider} non branché — utilisez Capsolver ou CapMonster.`, 'error');
            return '';
        } catch (err: any) {
            this.log(`[Captcha] Échec fatal : ${err.message}`, 'error');
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

            this.autoResponder.setClient(this.client);
            this.messageFarmer.setClient(this.client);
            this.voiceStalker.setClient(this.client);
            this.spotifyService = new (require('./spotify-service').SpotifyService)(this.client, this);

            this.profileRotator = new ProfileRotator(
                this.client, 
                app.getPath('userData'),
                (msg: string, type: any) => this.log(msg, type),
                () => !!this.settings?.privateMode
            );
            this.profileRotator.setPulseCallback((data) => {
                BrowserWindow.getAllWindows().forEach(win => {
                    win.webContents.send('rotator-pulse', data);
                });
            });
            
            this.setupEvents(); 
            this.protectionService.setMainClient(this.client);
            this.protectionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
            this.automationService.setClient(this.client);
            this.reactionService.setSolver((captcha, UA) => this.solveCaptcha(captcha, UA));
            this.sanitizerService.setClient(this.client);
            this.groupService.setClient(this.client);
            this.pomeloService.setClient(this.client);
            await this.client.login(token);
            if (!this.client.readyAt) {
                await new Promise((resolve) => this.client.once('ready', resolve));
            }
            
            this.log(`Connecté en tant que ${this.client.user?.tag} sur Opsec Pro`, 'success');

            try {
                // Auto-fetch profile from Discord API to get premium_since and premium_guild_since
                if (this.client.user) {
                    const profile = await (this.client as any).api.users(this.client.user.id).profile.get();
                    if (profile) {
                        this.discordProfile = profile;
                        const { getSettings, saveSettings } = require('../utils/settings');
                        const currentSettings = getSettings();
                        let changed = false;
                        if (profile.premium_since !== currentSettings.nitroStartDate) {
                            currentSettings.nitroStartDate = profile.premium_since || null;
                            changed = true;
                        }
                        if (profile.premium_guild_since !== currentSettings.boostStartDate) {
                            currentSettings.boostStartDate = profile.premium_guild_since || null;
                            changed = true;
                        }
                        if (changed) {
                            saveSettings(currentSettings);
                        }
                    }
                }
            } catch (errProfile) {
                console.error('[OPSEC] Failed to fetch user profile for badges:', errProfile);
            }

            return { success: true, user: this.getProfile() };
        } catch (err: any) {
            try {
                this.client.destroy();
            } catch (_) {}
            return { success: false, message: err.message };
        }
    }

    private cleanupAsync() {
        if (this.profileRotator) this.profileRotator.stop();
        if (this.spotifyService) this.spotifyService.destroy();
        if (this.autoResponder) this.autoResponder.stop();
        if (this.messageFarmer) this.messageFarmer.stop();
        if (this.voiceStalker) {
            this.voiceStalker.updateConfig({
                enabled: false,
                selectedAccountIds: [],
                vocalHopper: { enabled: false, channelIds: [], interval: 10, jitter: true },
                messageFarmer: { enabled: false, channelIds: [], phrases: [], delay: 60 },
                stealthMode: true,
            });
        }
        for (const inst of this.farmerInstances.values()) {
            inst.messageFarmer.stop();
        }
        this.farmerInstances.clear();
        for (const client of this.farmerClients.values()) {
            try { client.destroy(); } catch (_) {}
        }
        this.farmerClients.clear();
        if (this.protectionService) this.protectionService.stopSentinel().catch(() => {});
        if (this.automationService) this.automationService.stop();
        if (this.sanitizerService) this.sanitizerService.stop();
        if (this.groupService) this.groupService.stop();
        if (this.pomeloService) this.pomeloService.stop();
        if (this.reactionService) this.reactionService.destroy();
        
        this.isAutoJoining = false;
        this.isSpamming = false;
        this.isPurging = false;
        this.isDMingAll = false;

        for (const c of this.spamClients.values()) {
            try {
                c.removeAllListeners();
                c.destroy();
            } catch (e) {}
        }
        this.spamClients.clear();

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
            if (this.discordProfile?.premium_guild_since) {
                badges.push('boost');
            }

            // Try to find the self member in any cached guild to get the live presence
            let presence: any = this.client.user.presence;
            for (const guild of this.client.guilds.cache.values()) {
                const selfMember = guild.members.cache.get(this.client.user.id);
                if (selfMember?.presence && selfMember.presence.status !== 'offline') {
                    presence = selfMember.presence;
                    break;
                }
            }

            const activities = presence?.activities?.map((a: any) => ({
                name: a.name,
                type: Number(a.type),
                details: a.details || undefined,
                state: a.state || undefined
            })) || [];

            const platform = presence?.clientStatus ? Object.keys(presence.clientStatus)[0] : 'offline';
            const status = presence?.status || 'online';

            return {
                id: this.client.user.id,
                username: this.client.user.username || 'Utilisateur',
                displayName: (this.client.user as any).globalName || this.client.user.username,
                tag: this.client.user.tag || '',
                avatarURL: this.client.user.displayAvatarURL({ dynamic: true, size: 256 }),
                bannerURL: (this.client.user as any).bannerURL?.({ dynamic: true, size: 600 }) || undefined,
                bannerColor: this.discordProfile?.user_profile?.banner_color || this.discordProfile?.user?.banner_color || undefined,
                accentColor: this.discordProfile?.user_profile?.accent_color || this.discordProfile?.user?.accent_color || undefined,
                bio: this.discordProfile?.user_profile?.bio || this.discordProfile?.user?.bio || undefined,
                nitro,
                nitroExpiry: this.nitroExpiryDate || (nitro ? 'Active' : 'Inactive'),
                badges,
                activities,
                platform,
                status,
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
                    a.type !== 'CUSTOM' && a.id !== 'custom' && a.name !== 'Spotify' && !(a.id && a.id.startsWith('spotify:'))
                );
                (this.client.user as any).setPresence({ activities });
            } else {
                const activities = this.client.user.presence.activities.filter((a: any) => 
                    a.type !== 'CUSTOM' && a.id !== 'custom' && a.name !== 'Spotify' && !(a.id && a.id.startsWith('spotify:'))
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
            if (currentAccount && currentAccount.rotator?.enabled) {
                this.profileRotator.start(currentAccount.rotator);
            } else {
                this.profileRotator.stop();
            }
        }

        if (this.autoResponder && settings.responderConfig) {
            this.autoResponder.updateConfig(settings.responderConfig);
        }

        if (settings.automationConfig) {
            this.automationService.updateConfig(settings.automationConfig);
        }

        if (settings.farmerConfig) {
            this.syncFarmerSettings(settings.farmerConfig).catch((e) => {
                this.log(`[Farmer] Erreur sync: ${e.message}`, 'error');
            });
        }
    }

    public isFarmerActive(): boolean {
        if (this.messageFarmer?.isRunning || this.voiceStalker?.isActive) return true;
        for (const inst of this.farmerInstances.values()) {
            if (inst.messageFarmer?.isRunning || inst.voiceStalker?.isActive) return true;
        }
        return false;
    }

    public getFarmerStatus() {
        let status: 'idle' | 'hopping' | 'connected' = 'idle';
        let uptime = 0;

        const instances = [
            { mf: this.messageFarmer, vs: this.voiceStalker },
            ...Array.from(this.farmerInstances.values()).map((inst) => ({ mf: inst.messageFarmer, vs: inst.voiceStalker })),
        ];

        for (const { mf, vs } of instances) {
            const vsStatus = vs?.getStatus();
            const mfStatus = mf?.getStatus();
            if (vsStatus?.status === 'hopping') {
                status = 'hopping';
                uptime = Math.max(uptime, vsStatus.uptime || 0);
            } else if (vsStatus?.status === 'connected') {
                if (status !== 'hopping') status = 'connected';
                uptime = Math.max(uptime, vsStatus.uptime || 0);
            } else if (mfStatus?.status === 'connected') {
                if (status !== 'hopping') status = 'connected';
                uptime = Math.max(uptime, mfStatus.uptime || 0);
            }
        }

        return { status, uptime };
    }

    private async getFarmerClient(acc: { id: string; token: string; username?: string }): Promise<Client | null> {
        if (this.client.user && acc.id === this.client.user.id) {
            return this.client;
        }

        let client = this.farmerClients.get(acc.id);
        if (client?.readyAt) return client;

        if (client) {
            try { client.destroy(); } catch (_) {}
        }

        const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
        client = new Client({
            captchaSolver: (captcha: any, UA: string) => this.solveCaptcha(captcha, UA),
            http: { headers: { 'User-Agent': ua } },
        });

        client.on('error', (err) => {
            this.log(`[Farmer ${acc.username || acc.id}] ${err.message}`, 'error');
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                try { client!.destroy(); } catch (_) {}
                reject(new Error('Login Timeout (30s)'));
            }, 30000);

            client!.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });

            client!.login(acc.token).catch((e) => {
                clearTimeout(timeout);
                try { client!.destroy(); } catch (_) {}
                reject(e);
            });
        });

        this.farmerClients.set(acc.id, client);
        return client;
    }

    private async syncFarmerSettings(rawConfig: import('../../shared/types').FarmerConfig) {
        const config: import('../../shared/types').FarmerConfig = {
            ...rawConfig,
            vocalHopper: rawConfig.vocalHopper ?? { enabled: false, channelIds: [], interval: 10, jitter: true },
            selectedAccountIds: rawConfig.selectedAccountIds ?? [],
        };
        const accountIds = config.selectedAccountIds?.length
            ? config.selectedAccountIds
            : (this.client.user ? [this.client.user.id] : []);

        if (!config.enabled) {
            this.messageFarmer.stop();
            this.voiceStalker.updateConfig({ ...config, enabled: false });
            for (const inst of this.farmerInstances.values()) {
                inst.messageFarmer.stop();
                inst.voiceStalker.updateConfig({ ...config, enabled: false });
            }
            for (const client of this.farmerClients.values()) {
                try { client.destroy(); } catch (_) {}
            }
            this.farmerClients.clear();
            this.farmerInstances.clear();
            return;
        }

        const accounts = (this.settings?.accounts || []).filter((a) => accountIds.includes(a.id));
        const targets = accounts.length > 0
            ? accounts
            : (this.client.user ? [{ id: this.client.user.id, token: '', username: this.client.user.username }] : []);

        if (targets.length === 0) return;

        const activeIds = new Set<string>();

        for (const acc of targets) {
            activeIds.add(acc.id);
            try {
                const client = acc.token ? await this.getFarmerClient(acc) : this.client;
                if (!client?.user) continue;

                const tag = acc.username || client.user.username;

                if (this.client.user && acc.id === this.client.user.id) {
                    this.messageFarmer.setClient(client);
                    this.voiceStalker.setClient(client);
                    this.messageFarmer.updateConfig(config);
                    this.voiceStalker.updateConfig(config);
                    continue;
                }

                let inst = this.farmerInstances.get(acc.id);
                if (!inst) {
                    const MessageFarmer = require('./message-farmer').MessageFarmer;
                    inst = {
                        messageFarmer: new MessageFarmer(client, (msg: string, type: 'info' | 'success' | 'error') => this.log(`[${tag}] ${msg}`, type)),
                        voiceStalker: new VoiceStalker(client, (msg, type) => this.log(`[${tag}] ${msg}`, type)),
                    };
                    this.farmerInstances.set(acc.id, inst);
                } else {
                    inst.messageFarmer.setClient(client);
                    inst.voiceStalker.setClient(client);
                }

                inst.messageFarmer.updateConfig(config);
                inst.voiceStalker.updateConfig(config);
            } catch (e: any) {
                this.log(`[Farmer] Échec connexion ${acc.username || acc.id}: ${e.message}`, 'error');
            }
        }

        for (const [id, inst] of Array.from(this.farmerInstances.entries())) {
            if (!activeIds.has(id)) {
                inst.messageFarmer.stop();
                inst.voiceStalker.updateConfig({ ...config, enabled: false });
                this.farmerInstances.delete(id);
                const fc = this.farmerClients.get(id);
                if (fc) {
                    try { fc.destroy(); } catch (_) {}
                    this.farmerClients.delete(id);
                }
            }
        }
    }

    private async fetchClientChannelsInternal(client: Client) {
        if (!client.user) return { servers: [], dms: [] };
        // Force relationship cache sync if it seems incomplete
        if ((client.relationships as any).cache.size === 0) {
            console.log('[BOT] Cache relations vide, tentative de synchronisation forcée...');
            await (client as any).relationships.fetch().catch((e: any) => console.error('[BOT] Échec sync relations:', e.message));
        }

        const servers: any[] = [];
        
        // 1. Gather Servers & Channels
        client.guilds.cache.forEach(guild => {
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
        (client.relationships as any).cache
            .filter((r: any) => r.type === 1 || r === 1)
            .forEach((rel: any, id: string) => {
                const user = rel.user || client.users.cache.get(id);
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
        client.channels.cache
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
                            .filter((r: any) => r.id !== client.user?.id)
                            .map((r: any) => r.globalName || r.username || r.id)
                            .join(', ');
                    }
                    dmTargets.set(c.id, {
                        id: c.id,
                        targetUserId: c.id, // For Group DMs, targetUserId is the channel ID itself
                        name: name || 'Groupe DM',
                        type: 'dm',
                        isGroup: true,
                        lastMessageId: (c as any).lastMessageId || '0'
                    });
                }
            });

        const dms = Array.from(dmTargets.values())
            .sort((a, b) => (b.lastMessageId || '0').localeCompare(a.lastMessageId || '0'));

        return { servers, dms };
    }

    async getChannelsList(accountIds?: string[]) {
        if (!this.client.user) return { servers: [], dms: [] };
        try {
            if (accountIds && accountIds.length > 0) {
                const clients: Client[] = [];
                for (const id of accountIds) {
                    if (id === 'main' || (this.client.user && id === this.client.user.id)) {
                        clients.push(this.client);
                        continue;
                    }
                    const acc = this.settings?.accounts?.find(a => a.id === id);
                    if (acc) {
                        try {
                            const client = await this.getSpamClient(acc);
                            if (client && client.readyAt) {
                                clients.push(client);
                            }
                        } catch (e: any) {
                            console.error(`[BOT] Failed to get client ${id} for channel intersection:`, e.message);
                        }
                    }
                }
                
                if (clients.length === 0) {
                    return { servers: [], dms: [] };
                }
                
                // Retrieve all channels for each client
                const clientDataList: { servers: any[], dms: any[] }[] = [];
                for (const client of clients) {
                    try {
                        const data = await this.fetchClientChannelsInternal(client);
                        clientDataList.push(data);
                    } catch (e: any) {
                        console.error(`[BOT] Error fetching client channels for intersection:`, e.message);
                    }
                }
                
                if (clientDataList.length === 0) {
                    return { servers: [], dms: [] };
                }
                
                // Intersect servers
                const commonServerIds = new Set<string>();
                clientDataList[0].servers.forEach(s => commonServerIds.add(s.id));
                for (let i = 1; i < clientDataList.length; i++) {
                    const clientServerIds = new Set(clientDataList[i].servers.map(s => s.id));
                    for (const id of commonServerIds) {
                        if (!clientServerIds.has(id)) {
                            commonServerIds.delete(id);
                        }
                    }
                }
                
                const intersectedServers: any[] = [];
                for (const serverId of commonServerIds) {
                    const baseServer = clientDataList[0].servers.find(s => s.id === serverId)!;
                    
                    const commonChannelIds = new Set<string>();
                    (baseServer.channels || []).forEach((c: any) => commonChannelIds.add(c.id));
                    
                    for (let i = 1; i < clientDataList.length; i++) {
                        const otherServer = clientDataList[i].servers.find(s => s.id === serverId);
                        const otherChannels = otherServer ? (otherServer.channels || []) : [];
                        const otherChannelIds = new Set(otherChannels.map((c: any) => c.id));
                        for (const id of commonChannelIds) {
                            if (!otherChannelIds.has(id)) {
                                commonChannelIds.delete(id);
                            }
                        }
                    }
                    
                    const intersectedChannels = baseServer.channels.filter((c: any) => commonChannelIds.has(c.id));
                    if (intersectedChannels.length > 0) {
                        intersectedServers.push({
                            ...baseServer,
                            channels: intersectedChannels
                        });
                    }
                }
                
                // Intersect DMs
                const commonTargetUserIds = new Set<string>();
                clientDataList[0].dms.forEach(dm => {
                    if (dm.targetUserId) {
                        commonTargetUserIds.add(dm.targetUserId);
                    }
                });
                
                for (let i = 1; i < clientDataList.length; i++) {
                    const clientTargetIds = new Set(clientDataList[i].dms.map(dm => dm.targetUserId).filter(Boolean));
                    for (const id of commonTargetUserIds) {
                        if (!clientTargetIds.has(id)) {
                            commonTargetUserIds.delete(id);
                        }
                    }
                }
                
                const intersectedDms: any[] = [];
                for (const targetId of commonTargetUserIds) {
                    const baseDm = clientDataList[0].dms.find(dm => dm.targetUserId === targetId)!;
                    
                    let maxLastMsgId = baseDm.lastMessageId || '0';
                    for (let i = 1; i < clientDataList.length; i++) {
                        const otherDm = clientDataList[i].dms.find(dm => dm.targetUserId === targetId);
                        if (otherDm && otherDm.lastMessageId && otherDm.lastMessageId.localeCompare(maxLastMsgId) > 0) {
                            maxLastMsgId = otherDm.lastMessageId;
                        }
                    }
                    
                    intersectedDms.push({
                        ...baseDm,
                        lastMessageId: maxLastMsgId
                    });
                }
                
                intersectedDms.sort((a, b) => (b.lastMessageId || '0').localeCompare(a.lastMessageId || '0'));
                
                console.log(`[BOT] list-fetch (intersected for ${accountIds.length} tokens): ${intersectedServers.length} servers, ${intersectedDms.length} dms`);
                return { servers: intersectedServers, dms: intersectedDms };
            }
            
            return await this.fetchClientChannelsInternal(this.client);
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
            // Force fetch active channels from Discord API to update cache
            await (this.client.channels as any).fetch().catch(() => {});
            
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

    async leaveGroups(ids: string[], silent: boolean = false) {
        return this.sanitizerService.leaveGroups(ids, silent);
    }

    async deleteFriends(ids: string[]) {
        return this.sanitizerService.deleteFriends(ids);
    }

    async stopSanitizer() {
        this.sanitizerService.stop();
    }

    async closeAllDMs() {
        return this.sanitizerService.closeAllDMs();
    }

    async leaveServers(ids: string[]) {
        return this.sanitizerService.leaveServers(ids);
    }

    async dmAll(options: any) {
        try {
            let message = '';
            let target = 'all';
            let delay = 3000;
            let pauseInterval = 10;
            let pauseDuration = 10000;
            
            if (typeof options === 'string') {
                message = options;
            } else if (options && typeof options === 'object') {
                message = options.message || '';
                target = options.target || 'all';
                delay = Number(options.delay) || 3000;
                pauseInterval = Number(options.pauseInterval) || 10;
                pauseDuration = Number(options.pauseDuration) || 10000;
            }

            this.isDMingAll = true;

            // Force relationship cache sync if targeting friends/all
            if (target !== 'groups') {
                if ((this.client.relationships as any).cache.size === 0) {
                    this.log('Synchronisation des relations en cours...', 'info');
                    await Promise.race([
                        (this.client.relationships as any).fetch(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sync relationships')), 5000))
                    ]).catch((e) => this.log(`[Bot] Synchro relations: ${e.message}`, 'info'));
                }
            }

            const friends = target !== 'groups'
                ? (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1)
                : new Map();
            const groups = target !== 'friends'
                ? this.client.channels.cache.filter(c => c.type === 'GROUP_DM')
                : new Map();
            
            const totalTargets = friends.size + groups.size;
            
            this.log(`Démarrage DM ALL (${friends.size} amis, ${groups.size} groupes | Total: ${totalTargets} | Vitesse: ${delay}ms)`, 'info');
            
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
                    const sentMsg = await user.send(message.replace(/{user}/g, `<@${id}>`));
                    success++;
                    const jumpUrl = `https://discord.com/channels/@me/${sentMsg.channel.id}/${sentMsg.id}`;
                    this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé à ${userName}`, 'success', jumpUrl);
                } catch (e: any) {
                    if (e.status === 429 || /captcha/i.test(e.message)) {
                        this.log(`[DM ${currentProgress}/${totalTargets}] ⚠️ Rate-limit / Captcha ciblant ${userName} ! Attente **${pauseDuration/1000}s**...`, 'error');
                        await new Promise(r => setTimeout(r, pauseDuration));
                        if (!this.isDMingAll) break;
                        try {
                           const userRes = await this.client.users.fetch(id as string);
                           const sentMsg = await userRes.send(message.replace(/{user}/g, `<@${id}>`));
                           success++;
                           const jumpUrl = `https://discord.com/channels/@me/${sentMsg.channel.id}/${sentMsg.id}`;
                           this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé à ${userName} (après pause)`, 'success', jumpUrl);
                        } catch(re: any) {
                           failed++;
                           this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${userName} : ${re.message}`, 'error');
                        }
                    } else {
                        failed++;
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${userName} : ${e.message}`, 'error');
                    }
                }
                
                await new Promise(r => setTimeout(r, delay + Math.random() * 300));
                
                if (this.isDMingAll && antiCaptchaCounter > 0 && antiCaptchaCounter % pauseInterval === 0) {
                    this.log(`[ANTI-CAPTCHA] Pause de sécurité (${pauseDuration/1000}s) après ${antiCaptchaCounter} requêtes...`, 'info');
                    await new Promise(r => setTimeout(r, pauseDuration));
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
                    
                    const sentMsg = await (channel as any).send(message.replace(/{user}/g, groupName));
                    success++;
                    const jumpUrl = `https://discord.com/channels/@me/${channel.id}/${sentMsg.id}`;
                    this.log(`[DM ${currentProgress}/${totalTargets}] ✅ Envoyé au groupe ${groupName}`, 'success', jumpUrl);
                } catch (e: any) {
                    if (e.status === 429) { 
                        this.log(`[DM ${currentProgress}/${totalTargets}] ⚠️ Rate-limit de groupe ! Attente **${pauseDuration/1000}s**...`, 'error');
                        await new Promise(r => setTimeout(r, pauseDuration));
                        failed++; // Note: we don't retry group DMs here to avoid infinite loops, just mark failed
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec (Rate-limit) pour ${groupName}`, 'error');
                    } else {
                        failed++;
                        this.log(`[DM ${currentProgress}/${totalTargets}] ❌ Échec pour ${groupName} : ${e.message}`, 'error');
                    }
                }
                
                await new Promise(r => setTimeout(r, delay + Math.random() * 300));
                if (this.isDMingAll && antiCaptchaCounter > 0 && antiCaptchaCounter % pauseInterval === 0) {
                    this.log(`[ANTI-CAPTCHA] Pause de sécurité (${pauseDuration/1000}s) après ${antiCaptchaCounter} requêtes...`, 'info');
                    await new Promise(r => setTimeout(r, pauseDuration));
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
    
    private async getSpamClient(acc: any, proxy?: string): Promise<Client> {
        if (acc.id === 'main' || (this.client.user && acc.id === this.client.user.id)) {
            return this.client;
        }
        let client = this.spamClients.get(acc.id);
        const needsRecreate = client && (proxy !== undefined && (client as any).usedProxy !== proxy);
        if (!client || !client.readyAt || needsRecreate) {
            if (client) {
                try { client.destroy(); } catch (e) {}
            }
            const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
            const clientOptions: any = {
                captchaSolver: (captcha: any, UA: string) => this.solveCaptcha(captcha, UA),
                http: { headers: { 'User-Agent': ua } }
            };
            if (proxy) {
                clientOptions.http.agent = new ProxyAgent(proxy);
            }
            client = new Client(clientOptions);
            (client as any).usedProxy = proxy;
            
            // Gracefully handle internal client warnings/errors to prevent thread crashes
            client.on('error', (err) => {
                console.error(`[SpamClient ${acc.username || acc.id}] Client error:`, err);
                this.log(`[Compte ${acc.username || 'Secondaire'}] Erreur de connexion Discord : ${err.message}`, 'error');
            });
            client.on('rateLimit', (rateLimitInfo) => {
                console.warn(`[SpamClient ${acc.username || acc.id}] Rate limited:`, rateLimitInfo);
                this.log(`[Compte ${acc.username || 'Secondaire'}] Rate-limit détecté (attente ${rateLimitInfo.timeout}ms)`, 'error');
            });
            
            const loginPromise = new Promise(async (resolve, reject) => {
                const timeout = setTimeout(() => {
                    try { client!.destroy(); } catch (_) {}
                    reject(new Error('Login Timeout (30s)'));
                }, 30000);
                try {
                    client!.once('ready', () => {
                        clearTimeout(timeout);
                        resolve(true);
                    });
                    await client!.login(acc.token);
                } catch (e) {
                    clearTimeout(timeout);
                    try { client!.destroy(); } catch (_) {}
                    reject(e);
                }
            });

            await loginPromise;
            this.spamClients.set(acc.id, client);
        }
        return client;
    }

    async startSpam(data: any) {
        if (this.isSpamming) {
            return { success: false, error: 'Un spam est déjà en cours' };
        }

        const { channelIds, texts, delay: requestedDelay, jitter = false, maxMessages = 0, proxies = [], accounts = [], replyMode = false } = data;

        try {
            this.isSpamming = true;
            this.messageCounter = 0;
            this.proxyList = proxies;
            this.activeSpamConfig = data;
            const delay = Number(requestedDelay) || 0;

            const targets = accounts.length > 0 ? accounts : [{ id: 'main' }];

            this.log(`🔌 Connexion simultanée des comptes (${targets.length})...`, 'info');
            const activeTargets: any[] = [];

            await Promise.all(
                targets.map(async (acc: any, index: number) => {
                    try {
                        const proxy = proxies.length > 0 ? proxies[index % proxies.length] : undefined;
                        const client = await this.getSpamClient(acc, proxy);
                        if (client && client.readyAt) {
                            activeTargets.push(acc);
                            this.log(`[CONNEXION] Compte ${acc.username || acc.tag || 'Principal'} connecté et prêt.`, 'success');
                        } else {
                            this.log(`[CONNEXION] ❌ Échec : Le compte n'est pas prêt.`, 'error');
                        }
                    } catch (e: any) {
                        this.log(`[CONNEXION] ❌ Échec de connexion pour ${acc.username || acc.tag || acc.id} : ${e.message}`, 'error');
                    }
                })
            );

            if (!this.isSpamming) {
                this.activeSpamConfig = null;
                return { success: false, error: 'Spam annulé durant la connexion' };
            }

            if (activeTargets.length === 0) {
                this.log(`❌ Aucun compte fonctionnel n'a pu se connecter. Annulation du spam.`, 'error');
                this.isSpamming = false;
                this.activeSpamConfig = null;
                return { success: false, error: 'No active accounts connected' };
            }

            this.log(`🔍 Résolution des salons cibles en parallèle...`, 'info');
            const targetChannelsMap = new Map<string, any[]>();
            await Promise.all(
                activeTargets.map(async (acc) => {
                    try {
                        const client = await this.getSpamClient(acc);
                        const tokenChannels: any[] = [];
                        
                        await Promise.all(channelIds.map(async (channelId: string) => {
                            try {
                                let channel: any = client.channels.cache.get(channelId);
                                if (!channel) {
                                    channel = await client.channels.fetch(channelId).catch(() => undefined);
                                }
                                if (!channel) {
                                    const user: any = client.users.cache.get(channelId) || await client.users.fetch(channelId).catch(() => undefined);
                                    if (user) {
                                        channel = user.dmChannel || await user.createDM().catch(() => undefined);
                                    }
                                }
                                if (channel && typeof (channel as any).send === 'function') {
                                    tokenChannels.push(channel);
                                }
                            } catch (e) {}
                        }));
                        
                        if (tokenChannels.length > 0) {
                            targetChannelsMap.set(acc.id, tokenChannels);
                        } else {
                            this.log(`[WARN] Aucun salon cible valide trouvé pour ${acc.username || 'Principal'}`, 'info');
                        }
                    } catch (e: any) {
                        this.log(`[WARN] Erreur lors de la résolution pour ${acc.username || 'Principal'} : ${e.message}`, 'error');
                    }
                })
            );

            if (!this.isSpamming) {
                this.activeSpamConfig = null;
                return { success: false, error: 'Spam annulé durant la résolution des salons' };
            }

            const readyTargets = activeTargets.filter(acc => targetChannelsMap.has(acc.id));

            if (readyTargets.length === 0) {
                this.log(`❌ Aucun compte n'a pu résoudre de salon cible. Annulation du spam.`, 'error');
                this.isSpamming = false;
                this.activeSpamConfig = null;
                return { success: false, error: 'No active accounts resolved channels' };
            }

            this.log(`🚀 NUKE ENGAGED : ${channelIds.length} cibles | Intervalle : ${delay}ms | Comptes actifs : ${readyTargets.length}/${targets.length}`, 'success');
            
            // Run loop in background
            (async () => {
                const spamPromises = readyTargets.map((acc, tokenIndex) => {
                    const tokenChannels = targetChannelsMap.get(acc.id)!;
                    return this.runSingleTokenSpam(acc, tokenIndex, tokenChannels, texts, delay, jitter, maxMessages, replyMode);
                });

                // Await all parallel loops to complete
                await Promise.all(spamPromises);

                const finalMsg = !this.isSpamming ? 'Spam interrompu.' : `Spam terminé : ${this.messageCounter} messages envoyés.`;
                this.log(finalMsg, this.isSpamming ? 'success' : 'info');
                this.isSpamming = false;
                this.activeSpamConfig = null;
            })();

            return { success: true };
        } catch (err: any) { 
            this.isSpamming = false; 
            this.activeSpamConfig = null;
            return { success: false, error: err.message }; 
        }
    }

    private async sleepInterruptible(ms: number) {
        const start = Date.now();
        while (this.isSpamming && (Date.now() - start < ms)) {
            const remaining = ms - (Date.now() - start);
            await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 50)));
        }
    }

    private async runSingleTokenSpam(
        acc: any,
        tokenIndex: number,
        tokenChannels: any[],
        texts: string[],
        delay: number,
        jitter: boolean,
        maxMessages: number,
        replyMode: boolean
    ) {
        try {
            const client = await this.getSpamClient(acc);
            if (!client || !client.readyAt) {
                this.log(`[CONNEXION] ❌ Erreur critique : Le compte ${acc.username || 'Principal'} n'est pas prêt dans sa boucle.`, 'error');
                return;
            }

            // 2. Initialize text index
            // Each token starts at a distinct index to send different phrases from the list
            let textIndex = tokenIndex % texts.length;

            this.log(`[Spam] ⚡ Démarrage boucle indépendante pour ${acc.username || 'Principal'} (${tokenChannels.length} cibles)`, 'info');

            const activePromises: Set<Promise<any>> = new Set();
            // Allow up to 15 concurrent sends to bypass HTTP round-trip latency regardless of delay.
            const maxConcurrent = 15;
            let rateLimitPauseUntil = 0;

            while (this.isSpamming) {
                if (maxMessages > 0 && this.messageCounter >= maxMessages) {
                    break;
                }

                for (const channel of tokenChannels) {
                    if (!this.isSpamming) break;
                    if (maxMessages > 0 && this.messageCounter >= maxMessages) {
                        break;
                    }

                    // Check if we are currently rate-limited/paused
                    const now = Date.now();
                    if (now < rateLimitPauseUntil) {
                        await new Promise(r => setTimeout(r, rateLimitPauseUntil - now));
                    }

                    // Wait if we reached maximum concurrent pending sends
                    while (activePromises.size >= maxConcurrent && this.isSpamming) {
                        await Promise.race(activePromises).catch(() => {});
                    }
                    if (!this.isSpamming) break;

                    const startTime = Date.now();
                    const text = texts[textIndex];

                    let sendPromise;
                    if (replyMode) {
                        sendPromise = (async () => {
                            let replyToMessageId: string | undefined = undefined;
                            try {
                                const lastMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
                                if (lastMessages) {
                                    const targetMsg = Array.from(lastMessages.values())
                                        .sort((a: any, b: any) => b.createdTimestamp - a.createdTimestamp)
                                        .find((m: any) => m.author.id !== client.user?.id);
                                    if (targetMsg) replyToMessageId = (targetMsg as any).id;
                                }
                            } catch (e) {}

                            const payload: any = { content: text };
                            if (replyToMessageId) {
                                payload.reply = {
                                    messageReference: replyToMessageId,
                                    failIfNotExists: false
                                };
                            }
                            return channel.send(payload);
                        })();
                    } else {
                        sendPromise = channel.send(text);
                    }

                    const trackedPromise = sendPromise.then((sentMsg: any) => {
                        this.messageCounter++;
                        const guildId = channel.guild?.id || '@me';
                        const jumpUrl = sentMsg?.id ? `https://discord.com/channels/${guildId}/${channel.id}/${sentMsg.id}` : undefined;
                        this.log(`[SUCCESS] Message envoyé par ${acc.username || 'Compte principal'} dans ${channel.name || channel.id}`, 'success', jumpUrl);
                        
                        if (this.messageCounter % 20 === 0) {
                            this.log(`[Progression] Spam global : ${this.messageCounter} messages envoyés...`, 'info');
                        }
                    }).catch((e: any) => {
                        if (e.status === 429 || e.code === 429 || /rate limit|retry/i.test(e.message)) {
                            const retryAfter = (e.retryAfter || 8) * 1000;
                            this.log(`[Rate-Limit] ${acc.username || 'Compte principal'} restreint par Discord. Pause de ${retryAfter/1000}s...`, 'error');
                            rateLimitPauseUntil = Date.now() + retryAfter;
                        } else {
                            this.log(`Erreur envoi (${acc.username || 'Principal'}) : ${e.message}`, 'error');
                        }
                    });

                    activePromises.add(trackedPromise);
                    trackedPromise.finally(() => {
                        activePromises.delete(trackedPromise);
                    });

                    // Update index for the next message
                    if (jitter) {
                        textIndex = Math.floor(Math.random() * texts.length);
                    } else {
                        textIndex = (textIndex + 1) % texts.length;
                    }

                    // Calculate sleep time
                    if (delay > 0) {
                        const elapsed = Date.now() - startTime;
                        const targetDelay = jitter ? delay + (Math.random() * 50) : delay;
                        const finalDelay = Math.max(0, targetDelay - elapsed);

                        if (finalDelay > 1) {
                            await this.sleepInterruptible(finalDelay);
                        } else {
                            await new Promise(r => setImmediate(r));
                        }
                    } else {
                        await new Promise(r => setImmediate(r));
                    }
                }
                if (tokenChannels.length === 0) break;
            }

            // Wait for any remaining pending sends to finish before exiting
            while (activePromises.size > 0) {
                await Promise.race(activePromises).catch(() => {});
            }
        } catch (err: any) {
            this.log(`[Spam] Boucle critique interrompue pour ${acc.username || 'Principal'} : ${err.message}`, 'error');
        }
    }

    async stopSpam() { this.isSpamming = false; return { success: true }; }

    getSpamStatus() {
        return { running: this.isSpamming, count: this.messageCounter, config: this.activeSpamConfig };
    }

    getAutoJoinStatus() {
        return { running: this.isAutoJoining };
    }

    stopAutoJoin() {
        this.isAutoJoining = false;
        return { success: true };
    }

    private parseInviteCode(link: string): string | null {
        const trimmed = link.trim();
        const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i);
        if (match) return match[1];
        if (/^[a-zA-Z0-9-]+$/.test(trimmed)) return trimmed;
        return null;
    }

    private async joinGuildInvite(client: Client, code: string) {
        try {
            await (client as any).acceptInvite(code);
        } catch {
            await (client as any).api.invites(code).post({ data: {} });
        }
    }

    async autoJoinServers(inviteLink: string, delayMs = 3000) {
        if (this.isAutoJoining) return { success: false, error: 'Auto-join déjà en cours' };

        const code = this.parseInviteCode(inviteLink);
        if (!code) return { success: false, error: 'Lien d\'invitation invalide' };

        const accounts = this.settings?.accounts || [];
        const mainId = this.client?.user?.id;
        const targets: { id: string; username: string; token?: string; isMain?: boolean }[] = [];

        if (this.client?.user) {
            targets.push({ id: 'main', username: this.client.user.username, isMain: true });
        }
        for (const acc of accounts) {
            if (!acc.token || acc.id === mainId) continue;
            targets.push({ id: acc.id, username: acc.username, token: acc.token });
        }

        if (targets.length === 0) return { success: false, error: 'Aucun token enregistré' };

        const hasCaptchaKey = this.hasCaptchaSolver();
        this.isAutoJoining = true;
        this.log(`[AUTO-JOIN] 🚀 Join sur ${targets.length} compte(s) — invite: ${code}`, 'success');

        if (!hasCaptchaKey) {
            this.log('[AUTO-JOIN] ⚠️ Aucune clé Captcha — les comptes flaggés devront en configurer une dans Network Hub.', 'info');
        }

        const results: { username: string; status: 'joined' | 'already' | 'captcha' | 'error'; message?: string }[] = [];

        try {
            for (let i = 0; i < targets.length; i++) {
                if (!this.isAutoJoining) break;
                const target = targets[i];
                try {
                    const client = target.isMain ? this.client : await this.getSpamClient(target);
                    await this.joinGuildInvite(client, code);
                    results.push({ username: target.username, status: 'joined' });
                    this.log(`[AUTO-JOIN] ✅ ${target.username} a rejoint le serveur`, 'success');
                } catch (e: any) {
                    const msg = (e.message || String(e)).toLowerCase();
                    const raw = e.message || String(e);
                    const status = e.status || e.statusCode;
                    const retryAfter = e.retryAfter || (e.headers && e.headers['retry-after']) || (e.response && e.response.headers && e.response.headers['retry-after']);
                    
                    if (status === 429 || /rate limit|retry/i.test(msg)) {
                        const waitTime = retryAfter ? Number(retryAfter) : 5000;
                        this.log(`[AUTO-JOIN] ⚠️ Rate limit détecté pour ${target.username}. Attente de ${Math.ceil(waitTime / 1000)}s...`, 'error');
                        await new Promise(r => setTimeout(r, waitTime));
                        try {
                            const client = target.isMain ? this.client : await this.getSpamClient(target);
                            await this.joinGuildInvite(client, code);
                            results.push({ username: target.username, status: 'joined' });
                            this.log(`[AUTO-JOIN] ✅ ${target.username} a rejoint le serveur après attente`, 'success');
                        } catch (err2: any) {
                            const msg2 = (err2.message || String(err2)).toLowerCase();
                            if (/captcha|captcha_key|10008/i.test(msg2) || err2.captcha) {
                                const captchaMsg = hasCaptchaKey ? 'Captcha non résolu' : 'Clé Captcha requise';
                                results.push({ username: target.username, status: 'captcha', message: captchaMsg });
                            } else if (/already|10007|50013|known member/i.test(msg2)) {
                                results.push({ username: target.username, status: 'already', message: 'Déjà membre' });
                            } else {
                                results.push({ username: target.username, status: 'error', message: 'Rate limit persistant' });
                            }
                            this.log(`[AUTO-JOIN] ❌ ${target.username}: Échec après attente rate limit`, 'error');
                        }
                    } else if (/captcha|captcha_key|10008/i.test(msg) || e.captcha) {
                        const captchaMsg = hasCaptchaKey
                            ? 'Captcha non résolu — vérifiez votre solde solver'
                            : 'Clé Captcha requise (Network Hub → Resolvers)';
                        results.push({ username: target.username, status: 'captcha', message: captchaMsg });
                        this.log(`[AUTO-JOIN] 🔒 ${target.username}: ${captchaMsg}`, 'error');
                    } else if (/already|10007|50013|known member/i.test(msg)) {
                        results.push({ username: target.username, status: 'already', message: 'Déjà membre' });
                        this.log(`[AUTO-JOIN] ℹ️ ${target.username}: déjà sur le serveur`, 'info');
                    } else {
                        results.push({ username: target.username, status: 'error', message: raw.slice(0, 150) });
                        this.log(`[AUTO-JOIN] ❌ ${target.username}: ${raw}`, 'error');
                    }
                }

                if (i < targets.length - 1 && this.isAutoJoining) {
                    const wait = Math.max(500, delayMs + Math.floor(Math.random() * 1000));
                    await new Promise(r => setTimeout(r, wait));
                }
            }

            const joined = results.filter(r => r.status === 'joined').length;
            this.log(`[AUTO-JOIN] Terminé — ${joined}/${targets.length} join(s) réussi(s).`, joined > 0 ? 'success' : 'info');
            return { success: true, data: { results, total: targets.length, hasCaptchaKey } };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            this.isAutoJoining = false;
        }
    }

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

    async checkPomelo(username: string, botToken?: string) {
        return this.pomeloService.checkPomelo(username, botToken);
    }

    async claimPomelo(username: string, password?: string) {
        return this.pomeloService.claimPomelo(username, password);
    }

    async batchCheckPomelo(usernames: string[], data: { delay: number, autoClaim: boolean, password?: string, botToken?: string, generator?: string }) {
        return this.pomeloService.batchCheckPomelo(usernames, data);
    }

    async stopPomeloBatch() {
        return this.pomeloService.stop();
    }

    private startAppDetection() {
        if (this.appDetectionTimer) return;
        this.log('Moteur de détection d\'applications en ligne', 'info');
        this.appDetectionTimer = setInterval(async () => {
            if (!this.client.user || !this.settings?.allowActiveAppDetection) return;
            
            const apps = await this.appDetector.getActiveApps();
            if (apps.length > 0) {
                const topApp = apps[0]; // Take the first matched one
                if (this.currentDetectedApp !== topApp.name) {
                    this.currentDetectedApp = topApp.name;
                    this.log(`Application détectée : ${topApp.name}`, 'info');
                    
                    // Commented out to prevent showing active games on Discord profile:
                    /*
                    this.client.user.setActivity(topApp.name, {
                        type: topApp.type === 'game' ? 0 : topApp.type === 'media' ? 2 : 3,
                        applicationId: topApp.applicationId
                    } as any);
                    */
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

    async startGroupRename(channelId: string, names: string[], delay: number = 2000, accounts: any[] = []) {
        const clientsToUse: Client[] = [];
        
        if (accounts.length === 0) {
            clientsToUse.push(this.client);
        } else {
            this.log(`[CONNEXION] Préparation des tokens pour le renommage de groupe (${accounts.length})...`, 'info');
            await Promise.all(
                accounts.map(async (acc: any) => {
                    try {
                        const client = await this.getSpamClient(acc);
                        if (client && client.readyAt) {
                            clientsToUse.push(client);
                        }
                    } catch (e: any) {
                        this.log(`[CONNEXION] ❌ Échec de connexion du token ${acc.username || acc.id}: ${e.message}`, 'error');
                    }
                })
            );
        }

        if (clientsToUse.length === 0) {
            clientsToUse.push(this.client);
        }

        return this.groupService.startGroupRename(channelId, names, delay, clientsToUse);
    }

    async stopGroupRename() {
        return this.groupService.stopGroupRename();
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
        return this.groupService.cloneGroup(groupId);
    }

    async massAddRecipients(groupId: string, userIds: string[], delayMs: number = 2000) {
        return this.groupService.massAddRecipients(groupId, userIds, delayMs);
    }
}
