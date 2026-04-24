import { Client } from 'discord.js-selfbot-v13';
import UserAgent from 'user-agents';

export class ProtectionService {
    private mainClient: Client;
    private partnerClient: Client | null = null;
    private protectedGroups: Set<string> = new Set();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isSentinelActive: boolean = false;
    private shieldedGroups: Map<string, { name: string, iconHash: string | null, iconBuffer: Buffer | null }> = new Map();
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private processingInvites: Set<string> = new Set();
    private solver?: (captcha: any, UA: string) => Promise<string>;

    constructor(mainClient: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.mainClient = mainClient;
        this.logCallback = logCallback;
        this.setupMainListeners();
    }

    public setMainClient(client: Client) {
        this.removeMainListeners();
        this.mainClient = client;
        this.setupMainListeners();
        this.logCallback(`[Sentinel] Synchronisation du compte Principal effectuee.`, 'success');
    }

    public setSolver(solver: (captcha: any, UA: string) => Promise<string>) {
        this.solver = solver;
    }

    private removeMainListeners() {
        if (!this.mainClient) return;
        this.mainClient.off('raw', (p) => this.onMainRaw(p));
        this.mainClient.off('messageCreate', (m) => this.onMainMessage(m));
        this.mainClient.off('channelUpdate', (o, n) => this.onMainUpdate(o, n));
    }

    private onMainRaw(packet: any) {
        if (!this.isSentinelActive || !this.partnerClient || !this.partnerClient.user) return;
        if (packet.t === 'CHANNEL_RECIPIENT_REMOVE') {
            const { channel_id, user } = packet.d;
            const partnerId = (this.partnerClient as any).user.id.toString();
            
            if (user.id.toString() === partnerId && this.protectedGroups.has(channel_id)) {
                this.logCallback(`[Sentinel] Gateway : Detection de kick (Partenaire) !`, 'success');
                this.reinvite(this.mainClient, channel_id, user.id);
            }
        }
    }

    private async onMainMessage(message: any) {
        if (!this.isSentinelActive || !this.partnerClient || !this.partnerClient.user) return;
        
        if (message.type === 'RECIPIENT_REMOVE' || message.type === 4 || message.type === 'RECIPIENT_ADD' || message.type === 3) {
            // Keep console log for advanced debugging if needed
            // console.log(`[Sentinel Diagnostic] Message Systeme Type ${message.type} dans le groupe ${message.channel?.id}`);
        }

        if (message.type === 'RECIPIENT_REMOVE' || message.type === 4) {
            const partnerId = (this.partnerClient as any).user.id.toString();
            const chanId = message.channel?.id;
            if (!chanId) return;

            if (this.protectedGroups.has(chanId)) {
                this.logCallback(`[Sentinel] Retrait detecte dans un groupe protege...`, 'info');
                const channel = await this.mainClient.channels.fetch(chanId).catch(() => null) as any;
                const isStillThere = channel && channel.recipients && channel.recipients.has(partnerId);

                if (!isStillThere) {
                    this.logCallback(`[Sentinel] Le partenaire a ete ejecte. Re-invitation forcee !`, 'success');
                    await this.reinvite(this.mainClient, chanId, partnerId);
                }
            }
        }
    }

    private async onMainUpdate(oldChan: any, newChan: any) {
        if (newChan.type !== 'GROUP_DM' || !this.shieldedGroups.has(newChan.id)) return;
        
        const shield = this.shieldedGroups.get(newChan.id);
        if (!shield) return;

        if (newChan.name !== shield.name || newChan.icon !== shield.iconHash) {
            this.logCallback(`[Sentinel] Tentative de modification détectée sur un groupe protégé ! Restauration...`, 'info');
            try {
                const updateObj: any = {};
                if (newChan.name !== shield.name) updateObj.name = shield.name;
                
                // If icon changed and we have a stored buffer, restore it
                if (newChan.icon !== shield.iconHash) {
                    if (shield.iconBuffer) {
                        updateObj.icon = shield.iconBuffer;
                    } else if (shield.iconHash === null) {
                        updateObj.icon = null; // Revert to no icon if that was the case
                    }
                }

                if (Object.keys(updateObj).length > 0) {
                    await (newChan as any).edit(updateObj);
                    this.logCallback(`[Sentinel] Bouclier : Groupe restauré avec succès (Nom/Icone).`, 'success');
                }
            } catch (e: any) {
                this.logCallback(`[Sentinel] Échec du Revert (Shield): ${e.message}`, 'error');
            }
        }
    }

    private setupMainListeners() {
        this.mainClient.on('raw', (p) => this.onMainRaw(p));
        this.mainClient.on('messageCreate', (m) => this.onMainMessage(m));
        this.mainClient.on('channelUpdate', (o, n) => this.onMainUpdate(o, n));
    }

    private removePartnerListeners() {
        if (!this.partnerClient) return;
        this.partnerClient.off('raw', (p) => this.onPartnerRaw(p));
        this.partnerClient.off('messageCreate', (m) => this.onPartnerMessage(m));
    }

    private onPartnerRaw(packet: any) {
        if (!this.isSentinelActive || !this.mainClient.user) return;
        if (packet.t === 'CHANNEL_RECIPIENT_REMOVE') {
            const { channel_id, user } = packet.d;
            const mainId = this.mainClient.user.id.toString();
            if (user.id.toString() === mainId && this.protectedGroups.has(channel_id)) {
                this.logCallback(`[Sentinel] 🛡️ Gateway : Détection de kick !`, 'success');
                this.reinvite(this.partnerClient!, channel_id, user.id);
            }
        }
    }

    private async onPartnerMessage(message: any) {
        if (!this.isSentinelActive || !this.mainClient.user) return;

        if (message.type === 'RECIPIENT_REMOVE' || message.type === 4) {
            const mainId = this.mainClient.user.id.toString();
            const chanId = message.channel?.id;
            if (!chanId) return;

            if (this.protectedGroups.has(chanId)) {
                this.logCallback(`[Sentinel] 🔔 Retrait détecté par le partenaire...`, 'info');
                const channel = await this.partnerClient!.channels.fetch(chanId).catch(() => null) as any;
                const isStillThere = channel && channel.recipients && channel.recipients.has(mainId);

                if (!isStillThere) {
                    this.logCallback(`[Sentinel] 🛡️ Compte principal éjecté. La Sentinelle vous rajoute !`, 'success');
                    await this.reinvite(this.partnerClient!, chanId, mainId);
                }
            }
        }
    }

    private setupPartnerListeners() {
        if (!this.partnerClient) return;
        this.partnerClient.on('raw', (p) => this.onPartnerRaw(p));
        this.partnerClient.on('messageCreate', (m) => this.onPartnerMessage(m));
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
            // Bypass the library's acceptInvite which crashes on the 'GUEST' bitfield flag
            await (client as any).api.invites(code).post({ data: {} });
            this.logCallback(`[Sentinel] Re-jointure reussie (Lien invitation) !`, 'success');
            console.log(`[DEBUG] Auto-join SUCCESS for code ${code}`);
        } catch (e: any) {
            console.log(`[DEBUG] Auto-join FAILED: ${e.message}`);
            this.logCallback(`[Sentinel] Echec auto-jointure : ${e.message}`, 'error');
        }
    }

    private async reinvite(inviter: Client, groupId: string, targetId: string) {
        if (!this.isSentinelActive) return;
        
        const lockKey = `${groupId}-${targetId}`;
        if (this.processingInvites.has(lockKey)) return;
        
        this.processingInvites.add(lockKey);
        
        try {
            this.logCallback(`[Sentinel] Tentative de re-invitation pour ${targetId}...`, 'info');
            
            let channel = inviter.channels.cache.get(groupId) as any;
            if (!channel) channel = await inviter.channels.fetch(groupId).catch(() => null);

            if (channel && typeof channel.addRecipient === 'function') {
                await channel.addRecipient(targetId).catch(async (err: any) => {
                    if (err.message.includes('reached')) throw err;
                    await (inviter as any).api.channels(groupId).recipients(targetId).put({
                        headers: { Authorization: inviter.token }
                    });
                });
                this.logCallback(`[Sentinel] Re-invitation reussie (Ajout direct) !`, 'success');
            } else {
                await (inviter as any).api.channels(groupId).recipients(targetId).put({
                    headers: { Authorization: inviter.token }
                });
                this.logCallback(`[Sentinel] Re-invitation reussie (Ajout direct).`, 'success');
            }
        } catch (e: any) {
            this.logCallback(`[Sentinel] Echec re-invitation : ${e.message}`, 'error');
        } finally {
            // Keep the lock for 2 seconds to avoid multiple parallel invites from multiple listeners
            setTimeout(() => this.processingInvites.delete(lockKey), 2000);
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
                captchaSolver: this.solver,
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

            let iconBuffer: Buffer | null = null;
            if (channel.icon) {
                try {
                    const iconUrl = channel.iconURL({ format: 'png', size: 1024 });
                    if (iconUrl) {
                        const response = await fetch(iconUrl);
                        if (response.ok) {
                            iconBuffer = Buffer.from(await response.arrayBuffer());
                            this.logCallback(`[Sentinel] Icone téléchargée pour le bouclier.`, 'info');
                        }
                    }
                } catch (iconErr) {
                    this.logCallback(`[Sentinel] Avertissement: Impossible de pré-charger l'icône.`, 'error');
                }
            }

            this.shieldedGroups.set(groupId, {
                name: channel.name || '',
                iconHash: channel.icon || null,
                iconBuffer: iconBuffer
            });

            this.logCallback(`[Sentinel] Bouclier ACTIF sur "${channel.name || groupId}"`, 'success');
            return { success: true, shielded: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    public async stopSentinel() {
        this.isSentinelActive = false;
        this.protectedGroups.clear();
        this.processingInvites.clear();
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
 
        if (this.partnerClient) {
            this.removePartnerListeners();
            this.partnerClient.destroy();
            this.partnerClient = null;
        }
        
        this.removeMainListeners();
        
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
