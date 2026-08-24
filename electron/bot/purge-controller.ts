import { Client } from 'discord.js-selfbot-v13';
import { statsService } from '../services/stats-service';

export class PurgeController {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    public isPurging: boolean = false;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public async purgeMessages(channelId: string, amount: number, purgeAll: boolean = false, delay: number = 1000) {
        try {
            let channel: any = await this.client.channels.fetch(channelId).catch(() => null);
            
            if (!channel) {
                channel = this.client.channels.cache.find((c: any) => c.type === 'DM' && c.recipient?.id === channelId);
                
                if (!channel) {
                    const user = await this.client.users.fetch(channelId).catch(() => null);
                    if (user) {
                        this.logCallback(`Ouverture du DM pour ${user.username} (ID: ${channelId})...`, 'info');
                        channel = await user.createDM().catch(() => null);
                    }
                }
            }

            if (!channel || (typeof channel.isText === 'function' && !channel.isText()) && channel.type !== 'DM' && channel.type !== 'GROUP_DM') {
                this.logCallback('Salon introuvable, inaccessible ou non textuel.', 'error');
                return;
            }

            this.isPurging = true;
            const isAll = amount >= 1000;
            this.logCallback(`Démarrage de la purge (${isAll ? 'ALL' : amount} messages, mode: ${purgeAll ? 'Global' : 'Perso'}, délai: ${delay}ms)...`, 'info');

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

                lastMessageId = fetched.last()?.id;

                const toDelete = fetched.filter((m: any) => purgeAll ? true : m.author.id === this.client.user?.id);

                const promises = [];
                let sentRequests = 0;

                for (const msg of toDelete.values()) {
                    if (!this.isPurging) break;
                    
                    promises.push(
                        (async () => {
                            try {
                                await msg.delete();
                                deleted++;
                                if (deleted % 50 === 0) this.logCallback(`[Progression] Purge confirmée : ${deleted} messages (Mode Rapide)...`, 'info');
                            } catch (e: any) {
                                if (e.status === 429) {
                                    this.logCallback('Taux limite Discord atteint (ralentissement automatique)...', 'error');
                                }
                            }
                        })()
                    );
                    
                    sentRequests++;
                    
                    if (delay > 0) {
                        await new Promise(r => setTimeout(r, delay));
                    }
                    
                    if (!isAll && (deleted + sentRequests) >= amount) break;
                }
                
                if (promises.length > 0) {
                    await Promise.all(promises);
                }
                
                if (!isAll && deleted >= amount) break;
            } while ((isAll || deleted < amount) && fetched && fetched.size > 0 && this.isPurging);

            const finalMsg = !this.isPurging ? 'Purge interrompue.' : `Purge terminée : ${deleted} messages supprimés.`;
            this.logCallback(finalMsg, this.isPurging ? 'success' : 'info');
            this.isPurging = false;
        } catch (err: any) {
            this.isPurging = false;
            this.logCallback(`Échec critique de la purge : ${err.message}`, 'error');
        }
    }

    public async stopPurge() {
        this.isPurging = false;
    }

    public async purgeServer(serverId: string, amount: number, purgeAll: boolean = false, delay: number = 1000) {
        try {
            const guild = await this.client.guilds.fetch(serverId).catch(() => null);
            if (!guild) {
                this.logCallback('Serveur introuvable pour la purge.', 'error');
                return;
            }

            this.isPurging = true;
            this.logCallback(`Démarrage de la purge complète sur le serveur ${guild.name}...`, 'info');

            const channels = guild.channels.cache.filter((c: any) => c.isText());
            
            for (const channel of channels.values()) {
                if (!this.isPurging) break;
                this.logCallback(`Purge en cours dans le salon : ${channel.name}`, 'info');
                await this.purgeMessages(channel.id, amount, purgeAll, delay);
            }

            if (this.isPurging) {
                this.logCallback(`Purge du serveur ${guild.name} terminée.`, 'success');
            } else {
                this.logCallback(`Purge du serveur ${guild.name} interrompue.`, 'info');
            }
            this.isPurging = false;
        } catch (err: any) {
            this.isPurging = false;
            this.logCallback(`Échec de la purge serveur : ${err.message}`, 'error');
        }
    }
}
