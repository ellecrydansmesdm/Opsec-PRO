import { Client } from 'discord.js-selfbot-v13';

export type FarmerStatus = 'connected' | 'idle';

export class VoiceStalker {
    private client: Client;
    private status: FarmerStatus = 'idle';
    private currentGuildId: string | null = null;
    private currentChannelId: string | null = null;

    constructor(client: Client) {
        this.client = client;
        this.setupListeners();
    }

    private setupListeners() {
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            // Uniquement si on est censé être connectés en AFK
            if (this.status !== 'connected' || !this.currentChannelId) return;

            // Si c'est nous qui avons changé d'état
            if (newState.member?.id === this.client.user?.id) {
                // Si on a été déconnectés (channelId est null)
                if (!newState.channelId) {
                    console.log(`[AFK] Déconnexion détectée. Reconnexion automatique dans 5s...`);
                    setTimeout(() => {
                        if (this.status === 'connected' && this.currentChannelId) {
                            this.joinAFK(this.currentChannelId);
                        }
                    }, 5000);
                }
            }
        });
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }

    public getStatus(): FarmerStatus {
        return this.status;
    }

    /**
     * Rejoint un salon vocal pour le farming AFK
     */
    public async joinAFK(channelId: string) {
        if (!this.client?.user) return { success: false, message: 'Client non connecté' };

        try {
            // Recherche du salon dans tous les serveurs
            let targetGuildId = null;
            let channelName = channelId;

            for (const guild of this.client.guilds.cache.values()) {
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    targetGuildId = guild.id;
                    channelName = (channel as any).name || channelId;
                    break;
                }
            }

            if (!targetGuildId) {
                return { success: false, message: 'Salon introuvable' };
            }

            console.log(`[AFK] Tentative de connexion à ${channelName} (${channelId})...`);

            const shard = (this.client as any).ws?.shards?.first();
            if (!shard || !shard.connection) {
                return { success: false, message: 'WebSocket indisponible' };
            }

            // Injection Gateway Op 4 (Mute/Deaf auto)
            shard.connection.send(JSON.stringify({
                op: 4,
                d: {
                    guild_id: targetGuildId,
                    channel_id: channelId,
                    self_mute: true,
                    self_deaf: true
                }
            }));

            this.currentGuildId = targetGuildId;
            this.currentChannelId = channelId;
            this.status = 'connected';

            console.log(`[AFK] Connecté avec succès dans ${channelName}`);
            return { success: true, channelName };

        } catch (e: any) {
            console.error(`[AFK ERROR] ${e.message}`);
            return { success: false, message: e.message };
        }
    }

    /**
     * Quitte le salon vocal actuel
     */
    public async leaveAFK() {
        if (!this.client?.user || !this.currentGuildId) {
            return { success: false, message: 'Non connecté à un vocal' };
        }

        try {
            console.log(`[AFK] Déconnexion du salon...`);
            
            const shard = (this.client as any).ws?.shards?.first();
            if (shard && shard.connection) {
                shard.connection.send(JSON.stringify({
                    op: 4,
                    d: {
                        guild_id: this.currentGuildId,
                        channel_id: null,
                        self_mute: true,
                        self_deaf: true
                    }
                }));
            }

            this.currentGuildId = null;
            this.currentChannelId = null;
            this.status = 'idle';

            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    // Compatibilité API existante (alias)
    public async scan() { return; }
    public start() { return; }
    public async setTarget(id: string) { return this.joinAFK(id); }
    public async clearTarget() { return this.leaveAFK(); }
}
