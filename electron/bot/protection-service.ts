import { Client } from 'discord.js-selfbot-v13';
import UserAgent from 'user-agents';

export class ProtectionService {
    private mainClient: Client;
    private partnerClient: Client | null = null;
    private protectedGroups: Set<string> = new Set();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isSentinelActive: boolean = false;
    private shieldedGroups: Map<string, { name: string, icon: string | null }> = new Map();
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;

    constructor(mainClient: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.mainClient = mainClient;
        this.logCallback = logCallback;
        this.setupMainListeners();
    }

    public setMainClient(client: Client) {
        this.mainClient = client;
        this.setupMainListeners();
        this.logCallback(`[Sentinel] Synchronisation du compte Principal effectuee.`, 'success');
    }

    private setupMainListeners() {
        // 1. Gateway Level Monitor (Backup)
        this.mainClient.on('raw', (packet) => {
            if (!this.isSentinelActive || !this.partnerClient || !this.partnerClient.user) return;
            if (packet.t === 'CHANNEL_RECIPIENT_REMOVE') {
                const { channel_id, user } = packet.d;
                const partnerId = (this.partnerClient as any).user.id.toString();
                
                if (user.id.toString() === partnerId && this.protectedGroups.has(channel_id)) {
                    this.logCallback(`[Sentinel] Gateway : Detection de kick (Partenaire) !`, 'success');
                    this.reinvite(this.mainClient, channel_id, user.id);
                }
            }
        });

        // 2. Message Level Monitor (Primary)
        this.mainClient.on('messageCreate', async (message: any) => {
            if (!this.isSentinelActive || !this.partnerClient || !this.partnerClient.user) return;
            
            // Diagnostic: Log ANY system message related to recipient changes
            if (message.type === 'RECIPIENT_REMOVE' || message.type === 4 || message.type === 'RECIPIENT_ADD' || message.type === 3) {
                console.log(`[Sentinel Diagnostic] Message Systeme Type ${message.type} dans le groupe ${message.channel?.id}`);
            }

            if (message.type === 'RECIPIENT_REMOVE' || message.type === 4) {
                const partnerId = (this.partnerClient as any).user.id.toString();
                const chanId = message.channel?.id;
                if (!chanId) return;

                const isProtected = this.protectedGroups.has(chanId);

                if (isProtected) {
                    this.logCallback(`[Sentinel] Retrait detecte dans un groupe protege...`, 'info');
                    
                    // Force check if partner is still here
                    const channel = await this.mainClient.channels.fetch(chanId).catch(() => null) as any;
                    const isStillThere = channel && channel.recipients && channel.recipients.has(partnerId);

                    if (!isStillThere) {
                        this.logCallback(`[Sentinel] Le partenaire a ete ejecte. Re-invitation forcee !`, 'success');
                        await this.reinvite(this.mainClient, chanId, partnerId);
                    }
                }
            }
        });

        // 3. Shield Revert Monitor
        this.mainClient.on('channelUpdate', async (oldChan: any, newChan: any) => {
            if (newChan.type !== 'GROUP_DM' || !this.shieldedGroups.has(newChan.id)) return;
            
            const shield = this.shieldedGroups.get(newChan.id);
            if (!shield) return;

            const nameChanged = newChan.name !== shield.name;
            const iconChanged = newChan.icon !== shield.icon;

            if (nameChanged || iconChanged) {
                this.logCallback(`[Sentinel] Tentative de modification detectee sur un groupe protege ! Revert en cours...`, 'info');
                try {
                    await (newChan as any).edit({
                        name: shield.name,
                        icon: shield.icon
                    });
                    this.logCallback(`[Sentinel] Bouclier : Groupe restaure avec succes.`, 'success');
                } catch (e: any) {
                    this.logCallback(`[Sentinel] Echec du Revert (Shield): ${e.message}`, 'error');
                }
            }
        });
    }

    private setupPartnerListeners() {
        if (!this.partnerClient) return;
        
        // 1. Gateway Level Monitor (Backup)
        this.partnerClient.on('raw', (packet) => {
            if (!this.isSentinelActive || !this.mainClient.user) return;
            if (packet.t === 'CHANNEL_RECIPIENT_REMOVE') {
                const { channel_id, user } = packet.d;
                const mainId = this.mainClient.user.id.toString();
                if (user.id.toString() === mainId && this.protectedGroups.has(channel_id)) {
                    this.logCallback(`[Sentinel] 🛡️ Gateway : Détection de kick !`, 'success');
                    this.reinvite(this.partnerClient!, channel_id, user.id);
                }
            }
        });

        // 2. Message Level Monitor (Primary for Group DMs)
        this.partnerClient.on('messageCreate', async (message: any) => {
            if (!this.isSentinelActive || !this.mainClient.user) return;

            if (message.type === 'RECIPIENT_REMOVE' || message.type === 4) {
                const mainId = this.mainClient.user.id.toString();
                const chanId = message.channel?.id;
                if (!chanId) return;

                const isProtected = this.protectedGroups.has(chanId);

                if (isProtected) {
                    this.logCallback(`[Sentinel] 🔔 Retrait détecté par le partenaire...`, 'info');
                    
                    // Force check if main is still here
                    const channel = await this.partnerClient!.channels.fetch(chanId).catch(() => null) as any;
                    const isStillThere = channel && channel.recipients && channel.recipients.has(mainId);

                    if (!isStillThere) {
                        this.logCallback(`[Sentinel] 🛡️ Compte principal éjecté. La Sentinelle vous rajoute !`, 'success');
                        await this.reinvite(this.partnerClient!, chanId, mainId);
                    }
                }
            }
        });
    }

    private async checkGroupVisibility() {
        if (!this.partnerClient) {
            this.logCallback(`[Sentinel] Erreur: PartnerClient est null. Re-tentative...`, 'error');
            return;
        }
        if (!this.partnerClient.user) {
            this.logCallback(`[Sentinel] Erreur: PartnerClient.user est null. Le compte est peut-etre deconnecte.`, 'error');
            return;
        }
        if (!this.mainClient.user) {
            this.logCallback(`[Sentinel] Erreur: MainClient.user est null.`, 'error');
            return;
        }
        
        const partnerId = this.partnerClient.user.id;
        const mainId = this.mainClient.user.id;

        for (const groupId of this.protectedGroups) {
            try {
                const inviteLink = this.groupLinks[groupId];
                this.logCallback(`[Sentinel] Analyse: ${groupId} | Lien: ${inviteLink ? 'OUI' : 'NON'}`, 'info');

                await Promise.all([
                    (async () => {
                        const channel = await this.mainClient.channels.fetch(groupId, { force: true }).catch((e) => {
                            this.logCallback(`[Sentinel] Main ne voit plus ${groupId}: ${e.message}`, 'error');
                            return null;
                        }) as any;

                        if (channel) {
                            const recipients = Array.from(channel.recipients?.keys() || []);
                            this.logCallback(`[Sentinel] Membres vus par le Principal: ${recipients.length}`, 'info');
                            
                            if (!recipients.includes(partnerId)) {
                                this.logCallback(`[Sentinel] Partenaire ABSENT. Re-invitation...`, 'info');
                                await this.reinvite(this.mainClient, groupId, partnerId);
                            }
                        } else if (inviteLink) {
                            this.logCallback(`[Sentinel] Groupe invisible (Main). Auto-rejointure...`, 'info');
                            await this.autoJoin(this.mainClient, inviteLink);
                        }
                    })(),
                    (async () => {
                        const channel = await this.partnerClient!.channels.fetch(groupId, { force: true }).catch((e) => {
                            this.logCallback(`[Sentinel] Partenaire ne voit plus ${groupId}: ${e.message}`, 'error');
                            return null;
                        }) as any;

                        if (channel) {
                            const recipients = Array.from(channel.recipients?.keys() || []);
                            this.logCallback(`[Sentinel] Membres vus par le Partenaire: ${recipients.length}`, 'info');

                            if (!recipients.includes(mainId)) {
                                this.logCallback(`[Sentinel] Principal ABSENT. Re-invitation...`, 'info');
                                await this.reinvite(this.partnerClient!, groupId, mainId);
                            }
                        } else if (inviteLink) {
                            this.logCallback(`[Sentinel] Groupe invisible (Partenaire). Auto-rejointure...`, 'info');
                            await this.autoJoin(this.partnerClient!, inviteLink);
                        }
                    })()
                ]);
            } catch (e: any) {
                this.logCallback(`[Sentinel Scan Error] ${groupId}: ${e.message}`, 'error');
            }
        }
    }

    private async autoJoin(client: Client, inviteLink: string) {
        try {
            const code = inviteLink.match(/(?:discord\.gg\/|discord\.com\/invite\/)?([a-zA-Z0-9-]+)/)?.[1] || inviteLink.split('/').pop();
            if (!code) {
                console.log(`[DEBUG] Invalid invite link format: ${inviteLink}`);
                return;
            }
            console.log(`[DEBUG] Attempting to join code: ${code}`);
            console.log(`[DEBUG] Attempting to join code: ${code}`);
            await (client as any).acceptInvite(code);
            this.logCallback(`[Sentinel] Re-jointure reussie (Lien invitation) !`, 'success');
            console.log(`[DEBUG] Auto-join SUCCESS for code ${code}`);
        } catch (e: any) {
            console.log(`[DEBUG] Auto-join FAILED: ${e.message}`);
            this.logCallback(`[Sentinel] Echec auto-jointure : ${e.message}`, 'error');
        }
    }

    private async reinvite(inviter: Client, groupId: string, targetId: string) {
        try {
            // 1. Try to get the channel
            let channel = inviter.channels.cache.get(groupId) as any;
            if (!channel) channel = await inviter.channels.fetch(groupId).catch(() => null);

            if (channel && typeof channel.addRecipient === 'function') {
                await channel.addRecipient(targetId).catch(async (err: any) => {
                    // If native fails, try raw with explicit token
                    this.logCallback(`[Sentinel] Méthode native échouée, tentative directe...`, 'info');
                    await (inviter as any).api.channels(groupId).recipients(targetId).put({
                        headers: { Authorization: inviter.token }
                    });
                });
                this.logCallback(`[Sentinel] Re-invitation reussie (Ajout direct) !`, 'success');
            } else {
                // Manual fallback if channel object is not a GroupDMChannel
                this.logCallback(`[Sentinel] Canal invalide, tentative via REST direct...`, 'info');
                await (inviter as any).api.channels(groupId).recipients(targetId).put({
                    headers: { Authorization: inviter.token }
                });
                this.logCallback(`[Sentinel] Re-invitation reussie (Ajout direct).`, 'success');
            }
        } catch (e: any) {
            this.logCallback(`[Sentinel] Echec re-invitation : ${e.message}`, 'error');
            if (e.message.includes('friend')) {
                this.logCallback(`[Sentinel] NOTE : Les deux comptes doivent etre AMIS pour s'inviter.`, 'error');
            }
        }
    }

    private groupLinks: {[key: string]: string} = {};

    public async startSentinel(partnerToken: string, groupIds: string[], groupLinks: {[key: string]: string} = {}) {
        if (this.isSentinelActive) await this.stopSentinel();

        this.protectedGroups = new Set(groupIds);
        this.groupLinks = groupLinks;
        this.logCallback(`[Sentinel] Demarrage de la protection sur ${groupIds.length} groupes...`, 'info');

        try {
            const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
            this.partnerClient = new Client({
                http: { headers: { 'User-Agent': ua } }
            });

            this.partnerClient.on('ready', async () => {
                this.logCallback(`[Sentinel] Partenaire connecte : ${this.partnerClient?.user?.tag}`, 'success');
                this.isSentinelActive = true;
                
                // Friendship check
                const mainId = this.mainClient.user?.id;
                if (mainId && !this.partnerClient?.relationships.friendCache.has(mainId)) {
                    this.logCallback(`[Sentinel] ALERTE : Les comptes ne sont pas AMIS.`, 'error');
                }

                // Initial scan
                await this.checkGroupVisibility();
                this.setupPartnerListeners();
                
                this.logCallback(`[Sentinel] Surveillance active. Scan toutes les 7s.`, 'success');
            });

            // Start heartbeat outside ready to be sure it's set
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = setInterval(async () => {
                if (this.isSentinelActive && this.protectedGroups.size > 0) {
                    this.logCallback(`[Sentinel] Scan permanent en cours... (${this.protectedGroups.size} groupes)`, 'info');
                    await this.checkGroupVisibility();
                }
            }, 7000);

            this.partnerClient.on('error', (err) => {
                this.logCallback(`[Sentinel Error] ${err.message}`, 'error');
            });
 
            await this.partnerClient.login(partnerToken);
            return { success: true };
        } catch (e: any) {
            this.logCallback(`[Sentinel] Echec connexion partenaire : ${e.message}`, 'error');
            return { success: false, error: e.message };
        }
    }

    public async toggleShield(groupId: string, active: boolean) {
        if (!active) {
            this.shieldedGroups.delete(groupId);
            this.logCallback(`[Sentinel] Bouclier desactive pour ${groupId}`, 'info');
            return { success: true, shielded: false };
        }

        try {
            const channel = await this.mainClient.channels.fetch(groupId).catch(() => null) as any;
            if (!channel || channel.type !== 'GROUP_DM') {
                return { success: false, error: 'Groupe introuvable ou invalide' };
            }

            this.shieldedGroups.set(groupId, {
                name: channel.name || '',
                icon: channel.icon || null
            });

            this.logCallback(`[Sentinel] Bouclier ACTIVE sur "${channel.name || groupId}"`, 'success');
            return { success: true, shielded: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    public async stopSentinel() {
        this.isSentinelActive = false;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
 
        if (this.partnerClient) {
            this.partnerClient.destroy();
            this.partnerClient = null;
        }
        this.logCallback(`[Sentinel] Protection arretee.`, 'info');
        return { success: true };
    }

    public getStatus() {
        return {
            active: this.isSentinelActive,
            partner: this.partnerClient?.user?.tag || null,
            groups: Array.from(this.protectedGroups)
        };
    }
}
