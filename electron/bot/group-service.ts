import { Client } from 'discord.js-selfbot-v13';

export class GroupService {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    public isGroupRenaming: boolean = false;
    
    // Status tracking fields
    public activeChannelId: string | null = null;
    public activeNames: string[] = [];
    public activeDelay: number = 2000;
    public activeAccountIds: string[] = [];

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public setClient(client: Client) {
        this.client = client;
    }

    public stop() {
        this.isGroupRenaming = false;
        this.activeChannelId = null;
        this.activeNames = [];
        this.activeAccountIds = [];
    }

    getRenameStatus() {
        return {
            active: this.isGroupRenaming,
            channelId: this.activeChannelId,
            names: this.activeNames,
            delay: this.activeDelay,
            accountIds: this.activeAccountIds
        };
    }

    async startGroupRename(channelId: string, names: string[], delay: number = 2000, clientsToUse: Client[] = []) {
        if (this.isGroupRenaming) return { success: false, error: 'Un renommage est déjà en cours' };
        if (!names || names.length === 0) return { success: false, error: 'Liste de noms vide' };

        try {
            const activeClients = clientsToUse.length > 0 ? clientsToUse : [this.client];
            
            // Resolve the group channel for all clients
            const channelsToUse = await Promise.all(
                activeClients.map(async (client) => {
                    try {
                        let chan = client.channels.cache.get(channelId);
                        if (!chan) {
                            const fetched = await client.channels.fetch(channelId).catch(() => undefined);
                            chan = fetched || undefined;
                        }
                        if (chan && chan.type === 'GROUP_DM') {
                            return chan;
                        }
                    } catch (e) {}
                    return null;
                })
            );

            const activeChannels = channelsToUse.filter((c): c is any => c !== null);

            if (activeChannels.length === 0) {
                return { success: false, error: 'Groupe introuvable pour les tokens sélectionnés' };
            }

            this.isGroupRenaming = true;
            this.activeChannelId = channelId;
            this.activeNames = names;
            this.activeDelay = delay;
            this.activeAccountIds = activeClients.map(c => c.user?.id || 'main');

            this.logCallback(`🚀 Démarrage du Spammer de Nom sur le groupe (${activeChannels.length} tokens actifs, ${names.length} noms, vitesse: ${delay}ms)...`, 'info');

            let index = 0;
            let channelIndex = 0;

            // Run loop in background
            (async () => {
                while (this.isGroupRenaming) {
                    try {
                        const channel = activeChannels[channelIndex % activeChannels.length];
                        const nextName = names[index % names.length];
                        
                        await channel.setName(nextName);
                        index++;
                        channelIndex++;
                        
                        if (index % 5 === 0) {
                            this.logCallback(`[Group] ${index} changements effectués...`, 'info');
                        }
                        
                        await new Promise(r => setTimeout(r, Math.max(delay, 1)));
                    } catch (e: any) {
                        if (e.status === 429 || e.code === 429 || /rate limit|retry/i.test(e.message)) {
                            const retryAfter = (e.retryAfter || 5) * 1000;
                            this.logCallback(`[Group] Rate-limit. Rotation vers le token suivant (pause de ${retryAfter/1000}s sur ce token)...`, 'error');
                            channelIndex++;
                            await new Promise(r => setTimeout(r, 500));
                        } else {
                            this.logCallback(`[Group] Erreur : ${e.message}`, 'error');
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }
            })();

            return { success: true };
        } catch (err: any) {
            this.isGroupRenaming = false;
            this.activeChannelId = null;
            this.activeNames = [];
            this.activeAccountIds = [];
            return { success: false, error: err.message };
        }
    }

    async stopGroupRename() {
        this.isGroupRenaming = false;
        this.activeChannelId = null;
        this.activeNames = [];
        this.activeAccountIds = [];
        this.logCallback('🛑 Spammer de Nom arrêté.', 'info');
    }

    async cloneGroup(groupId: string) {
        if (!this.client.user) return { success: false, error: 'Non connecte' };
        try {
            this.logCallback(`Clone du groupe ${groupId} en cours...`, 'info');
            const sourceChan = await this.client.channels.fetch(groupId).catch(() => null) as any;
            if (!sourceChan || sourceChan.type !== 'GROUP_DM') return { success: false, error: 'Groupe source introuvable' };

            const friendIds = (this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1).map((_: any, id: string) => id);
            const recipientsToClone = Array.from(sourceChan.recipients.keys())
                .filter((id: any) => id !== this.client.user?.id && friendIds.includes(id));

            if (recipientsToClone.length === 0) return { success: false, error: 'Aucun ami trouvé dans ce groupe pour le clonage' };

            this.logCallback(`Creation du nouveau groupe avec ${recipientsToClone.length} amis...`, 'info');
            const newGroup = await (this.client as any).channels.createGroupDM(recipientsToClone);
            
            if (sourceChan.name) {
                await newGroup.edit({ name: sourceChan.name });
            }

            this.logCallback(`Groupe clone avec succes ! ID: ${newGroup.id}`, 'success');
            return { success: true, newGroupId: newGroup.id };
        } catch (err: any) {
            this.logCallback(`Echec du clonage : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async massAddRecipients(groupId: string, userIds: string[], delayMs: number = 2000) {
        if (!this.client.user) return { success: false, error: 'Non connecte' };
        try {
            this.logCallback(`Demarrage du Mass Add (${userIds.length} cibles)...`, 'info');
            const channel = await this.client.channels.fetch(groupId).catch(() => null) as any;
            if (!channel || channel.type !== 'GROUP_DM') return { success: false, error: 'Groupe introuvable' };

            let count = 0;
            for (const userId of userIds) {
                try {
                    await channel.addUser(userId);
                    count++;
                    this.logCallback(`[Mass Add] Ajoute: ${userId} (${count}/${userIds.length})`, 'info');
                    if (userIds.indexOf(userId) < userIds.length - 1) {
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                } catch (e: any) {
                    this.logCallback(`[Mass Add] Erreur pour ${userId} : ${e.message}`, 'error');
                }
            }
            this.logCallback(`Mass Add termine : ${count} ajoutes.`, 'success');
            return { success: true, count };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
