import { Client, Message } from 'discord.js-selfbot-v13';
import { AutomationConfig } from '../../shared/types';

export class AutomationService {
    private mainClient: Client;
    private config: AutomationConfig | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    
    // Auto-Report stats
    private messageTimestamps: Map<string, number[]> = new Map();
    private isProcessing: boolean = false;

    // ANTI-SPAM: Cache processed message IDs
    private processedMessages: Set<string> = new Set();
    private joinedButtonIds: Set<string> = new Set();
    private joinedFingerprints: Set<string> = new Set();
    private lastJoinTimestamps: Map<string, number> = new Map();
    private readonly MAX_CACHE_SIZE = 100;

    constructor(mainClient: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.mainClient = mainClient;
        this.logCallback = logCallback;
    }

    public updateConfig(config: AutomationConfig) {
        // Compare current config to avoid redundant logs
        const oldConfigStr = JSON.stringify(this.config);
        const newConfigStr = JSON.stringify(config);
        
        this.config = config;
        
        if (oldConfigStr !== newConfigStr) {
            this.logCallback(`[ENGINE] Configuration Automation mise à jour`, 'info');
            
            if (config.autoReport?.enabled) {
                const target = config.autoReport.targetUserId || 'Tous';
                this.logCallback(`[SENTINEL] Surveillance active sur la cible : ${target}`, 'success');
            }
        }
    }


    private addToCache(id: string) {
        this.processedMessages.add(id);
        if (this.processedMessages.size > this.MAX_CACHE_SIZE) {
            const firstId = this.processedMessages.values().next().value;
            if (firstId) this.processedMessages.delete(firstId);
        }
    }
    private addToFingerprintCache(fp: string) {
        this.joinedFingerprints.add(fp);
        if (this.joinedFingerprints.size > 50) {
            const first = this.joinedFingerprints.values().next().value;
            if (first) this.joinedFingerprints.delete(first);
        }
    }


    private async handleNitroSniper(message: Message) {
        const nitroRegex = /(?:discord\.gift\/|discord\.com\/gifts\/|discordapp\.com\/gifts\/)([a-zA-Z0-9]+)/g;
        const matches = [...message.content.matchAll(nitroRegex)];
        
        if (matches.length > 0) {
            this.addToCache(message.id);
            for (const match of matches) {
                const code = match[1];
                this.logCallback(`[SNIPER] 🎯 Code détecté : ${code}`, 'info');
                try {
                    await (this.mainClient as any).api.entitlements['gift-codes'](code).redeem.post({
                        data: { channel_id: message.channel.id }
                    });
                    this.logCallback(`[SNIPER] 🎉 CADEAU CLAIMÉ : ${code} !`, 'success');
                } catch (e: any) {
                    this.logCallback(`[SNIPER] ❌ Échec claim ${code} : ${e.message}`, 'error');
                }
            }
        }
    }

    private async handleGiveawayJoiner(message: Message) {
        if (message.flags?.has('EPHEMERAL') || message.flags?.has(64 as any)) return;
        
        // --- FAST PRE-FILTERS (Optimization) ---
        if (!message.author.bot) return;
        if (!message.guild) return;

        const components = (message as any).components;
        const hasEmbed = message.embeds.length > 0;
        if (!hasEmbed && (!components || components.length === 0)) return;

        // --- S-TIER NORMALIZATION ---
        const rawChannelName = (message.channel as any).name || '';
        const channelName = rawChannelName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        const content = message.content.toLowerCase();
        const embedTitle = message.embeds[0]?.title?.toLowerCase() || '';
        const embedDesc = message.embeds[0]?.description?.toLowerCase() || '';

        // 1. HARD BLACKLIST (Parasites)
        const hardBlacklist = ['confession', 'replies', 'log', 'spawn', 'claim', 'pokemon', 'mudae', 'karuta'];
        if (hardBlacklist.some(k => channelName.includes(k))) return;

        // 2. GAME BOT BLACKLIST (Mudae, Karuta, etc.)
        const gameBots = ['432610292342587392', '716390085896962058', '646988852263239690', '571027211407327243', '438121703219101696', '270904126974590976'];
        if (gameBots.includes(message.author.id)) return;

        // 3. EVIDENCE GATHERING (The "Proof")
        let isGiveaway = false;
        let joinButton = null;

        // A. Check for "Proof" in Buttons (Highest Reliability)
        if (components) {
            for (const row of components) {
                if (!row.components || !Array.isArray(row.components)) continue;
                for (const comp of row.components) {
                    if (comp.type === 'BUTTON' && !comp.disabled) {
                        const label = comp.label?.toLowerCase() || '';
                        const emoji = comp.emoji?.name || '';
                        if (label.includes('enter') || label.includes('particip') || label.includes('rejoindre') || label.includes('join') || emoji === '🎉' || label === '🎉') {
                            joinButton = comp;
                            isGiveaway = true;
                            break;
                        }
                    }
                }
                if (isGiveaway) break;
            }
        }

        // B. Check for "Proof" in Content/Embed
        if (!isGiveaway) {
            const giveawayKeywords = ['giveaway', 'win', 'gagner', 'nitro', 'concours', '🎉'];
            const searchArea = content + embedTitle + embedDesc;
            if (giveawayKeywords.some(k => searchArea.includes(k))) {
                isGiveaway = true;
            }
        }

        if (!isGiveaway) return;

        // 4. ANTI-LOOP & FINGERPRINTING
        const rawSignature = hasEmbed ? (embedTitle + embedDesc) : content;
        const fingerprint = rawSignature.replace(/[0-9]/g, '').trim();
        if (fingerprint.length > 10 && this.joinedFingerprints.has(fingerprint)) return;

        // 5. COOLDOWN (30s per channel)
        const now = Date.now();
        const lastJoin = this.lastJoinTimestamps.get(message.channel.id) || 0;
        if (now - lastJoin < 30000) return;

        this.lastJoinTimestamps.set(message.channel.id, now);
        if (fingerprint.length > 10) this.addToFingerprintCache(fingerprint);

        if (this.processedMessages.has(message.id)) return;
        this.addToCache(message.id);

        try {
            this.logCallback(`[JOINER] 🎁 Giveaway détecté dans #${(message.channel as any).name}`, 'info');
            
            const delay = (this.config?.giveawayJoiner?.delay || 5000) + Math.random() * 5000;
            await new Promise(r => setTimeout(r, delay));

            if (!this.config?.giveawayJoiner?.enabled) return;

            if (joinButton) {
                if (joinButton.customId && this.joinedButtonIds.has(joinButton.customId)) return;
                if (joinButton.customId) {
                    this.joinedButtonIds.add(joinButton.customId);
                    if (this.joinedButtonIds.size > 100) {
                        const first = this.joinedButtonIds.values().next().value;
                        if (first) this.joinedButtonIds.delete(first);
                    }
                }

                await (message as any).clickButton(joinButton.customId);
                this.logCallback(`[JOINER] ✅ Giveaway rejoint (Bouton)`, 'success');
                return;
            }

            // Fallback to Reaction (only if 🎉 is present)
            const searchArea = content + embedTitle + embedDesc;
            if (searchArea.includes('🎉')) {
                await message.react('🎉').catch(() => {});
                this.logCallback(`[JOINER] ✅ Giveaway rejoint (Réaction)`, 'success');
            }
        } catch (e: any) {
            // Re-logging failures only if truly different
            this.logCallback(`[JOINER] ❌ Échec : ${e.message}`, 'error');
        }
    }

    private async handleAutoReport(message: Message) {
        const ar = this.config?.autoReport;
        if (!ar || !ar.enabled) return;
        
        // --- SMART DIAGNOSTICS (Only log if it's the target) ---
        const isSelf = message.author.id === this.mainClient.user?.id;
        
        const targetUserId = ar.targetUserId?.trim() || null;
        const targetGuildId = ar.targetGuildId?.trim() || null;

        const matchesUser = targetUserId && message.author.id === targetUserId;
        const matchesGuild = targetGuildId && message.guild?.id === targetGuildId;

        if (matchesUser || matchesGuild) {
             const guildMatch = !targetGuildId || message.guild?.id === targetGuildId;
             const userMatch = !targetUserId || message.author.id === targetUserId;
             
             if (guildMatch && userMatch) {
                 this.logCallback(`[SENTINEL] Analyse du message de ${message.author.username}...`, 'info');
             }
        } else if (isSelf && ar.enabled && message.content.includes('test-sentinel')) {
             this.logCallback(`[SENTINEL] Test réussi : Le bot t'écoute bien.`, 'success');
        }

        // 1. SERVER FILTER: Skip if not the target server (if defined)
        if (targetGuildId && message.guild?.id !== targetGuildId) return;

        // 2. TARGET FILTER: Skip if not the target user (if defined)
        if (targetUserId && message.author.id !== targetUserId) return;

        if (this.processedMessages.has(message.id)) return;

        // --- NEW: Neutral scan log to prove it works ---
        if (ar.enabled && !isSelf) {
             const scanContent = message.content.toLowerCase();
             let hasInsult = false;
             if (ar.insultKeywords?.length > 0) {
                 if (ar.useRegex) {
                     for (const pattern of ar.insultKeywords) {
                         try { if (new RegExp(pattern, 'i').test(message.content)) hasInsult = true; } catch (e) {}
                     }
                 } else {
                     if (ar.insultKeywords.some((k: string) => scanContent.includes(k.toLowerCase()))) hasInsult = true;
                 }
             }
             
             if (!hasInsult) {
                 // Removed noisy neutral scan logs
             }
        }

        // 3. DETECTION TRIGGER (Insults/Regex/Flood)
        let shouldReport = false;
        let reason = "Detection";

        if (ar.insultKeywords?.length > 0) {
            if (ar.useRegex) {
                for (const pattern of ar.insultKeywords) {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(message.content)) {
                            shouldReport = true;
                            reason = `Regex (${pattern})`;
                            break;
                        }
                    } catch (e) {}
                }
            } else {
                const content = message.content.toLowerCase();
                if (ar.insultKeywords.some((k: string) => content.includes(k.toLowerCase()))) {
                    shouldReport = true;
                    reason = "Insulte";
                }
            }
        }

        if (!shouldReport && ar.floodLimit > 0) {
            const now = Date.now();
            const userMsgs = this.messageTimestamps.get(message.author.id) || [];
            const recentMsgs = userMsgs.filter(t => now - t < 60000);
            recentMsgs.push(now);
            this.messageTimestamps.set(message.author.id, recentMsgs);

            if (recentMsgs.length >= ar.floodLimit) {
                shouldReport = true;
                reason = `Flood (${recentMsgs.length} msg/min)`;
                this.messageTimestamps.set(message.author.id, []);
            }
        }

        if (shouldReport && !this.isProcessing) {
            this.isProcessing = true;
            this.addToCache(message.id);
            
            const humanDelay = 2000 + Math.random() * 3000;
            const scanDepth = ar.historyScanDepth || 50;
            this.logCallback(`[REPORT] 🛡️ Cible détectée (${reason}). Scan profond (${scanDepth} msgs)...`, 'info');
            
            setTimeout(async () => {
                try {
                    // FETCH DEEP HISTORY
                    const history = await message.channel.messages.fetch({ limit: scanDepth }).catch(() => null);
                    const toReport: { msg: Message; score: number }[] = [];
                    
                    if (history) {
                        for (const m of history.values()) {
                            if (m.author.id === message.author.id && !this.processedMessages.has(m.id)) {
                                const score = this.calculateToxicityScore(m, ar);
                                // If it's the original flood trigger or score > 40
                                if (score >= 40 || (reason.includes('Flood') && m.id === message.id)) {
                                    toReport.push({ msg: m, score });
                                }
                            }
                        }
                    } else {
                        toReport.push({ msg: message, score: 100 });
                    }

                    // Sort by score (highest first for maximum impact)
                    toReport.sort((a, b) => b.score - a.score);
                    
                    // Limit to 10 reports per "Nuke" for account safety
                    const finalQueue = toReport.slice(0, 10);
                    this.logCallback(`[REPORT] 🔎 Analyse terminée : ${finalQueue.length} violations majeures identifiées.`, 'info');

                    const reportElements = { user_profile_select: ['name'] };

                    for (const entry of finalQueue) {
                        const m = entry.msg;
                        this.addToCache(m.id);
                        try {
                            await (m as any).report(ar.reportCategory || [3, 28, 72], reportElements);
                            this.logCallback(`[REPORT] ✅ NUKE DÉPLOYÉ ! (Score: ${entry.score}) ID: ${m.id}`, 'success');
                            await new Promise(r => setTimeout(r, 4000)); // Safer delay since we are nuking
                        } catch (e: any) {
                            const err = JSON.stringify(e.response?.body || e.message);
                            if (err.includes('Validation error')) {
                                await (m as any).report([3], reportElements).catch(() => {});
                                this.logCallback(`[REPORT] ✅ NUKE DÉPLOYÉ (Repli)!`, 'success');
                            } else {
                                this.logCallback(`[REPORT] ❌ Échec NUKE : ${err.slice(0, 100)}...`, 'error');
                            }
                        }
                    }
                } catch (e: any) {
                    this.logCallback(`[REPORT] ❌ ÉCHEC CRITIQUE NUKE : ${e.message}`, 'error');
                } finally {
                    // Lock for 60s after a Nuke to avoid account flag
                    setTimeout(() => { this.isProcessing = false; }, 60000);
                }
            }, humanDelay);
        }
    }

    private calculateToxicityScore(m: Message, ar: any): number {
        let score = 0;
        const scanContent = m.content.toLowerCase();

        // 1. Keyword/Regex Match
        if (ar.insultKeywords?.length > 0) {
            if (ar.useRegex) {
                for (const pattern of ar.insultKeywords) {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(m.content)) {
                            score += 100;
                            break; // One regex hit is enough for max score
                        }
                    } catch (e) {}
                }
            } else {
                if (ar.insultKeywords.some((k: string) => scanContent.includes(k.toLowerCase()))) score += 70;
            }
        }

        // 2. Link Spam
        if (/https?:\/\/[^\s]+/.test(m.content)) score += 40;

        // 3. Repeated Characters (aaaaa)
        if (/(.)\1{4,}/.test(m.content)) score += 30;

        // 4. Excessive Caps
        const capsCount = (m.content.match(/[A-Z]/g) || []).length;
        if (m.content.length > 5 && capsCount / m.content.length > 0.7) score += 30;

        return score;
    }

    public setClient(client: Client) {
        this.mainClient = client;
        
        const bind = () => {
             this.mainClient.on('messageCreate', async (message: Message) => {
                if (!this.config) return;
                if (message.author.id === this.mainClient.user?.id) return;
                if (this.processedMessages.has(message.id)) return;

                // 1. Nitro Sniper
                if (this.config.nitroSniper?.enabled) {
                    this.handleNitroSniper(message);
                }

                // 2. Giveaway Joiner
                if (this.config.giveawayJoiner?.enabled) {
                    this.handleGiveawayJoiner(message);
                }

                // 3. Auto Report
                if (this.config.autoReport?.enabled) {
                    this.handleAutoReport(message);
                }
            });
        };

        if (client.readyAt) {
            bind();
            this.logCallback(`[SENTINEL] Système lié au compte ${client.user?.username}`, 'info');
        } else {
            client.once('ready', () => {
                bind();
                this.logCallback(`[SENTINEL] Système lié au compte ${client.user?.username}`, 'info');
            });
        }
    }
}
