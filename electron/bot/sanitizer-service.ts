import { Client } from 'discord.js-selfbot-v13';

export class SanitizerService {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    public isSanitizing: boolean = false;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public setClient(client: Client) {
        this.client = client;
    }

    public stop() {
        this.isSanitizing = false;
    }

    private async runInChunks<T>(
        items: T[], 
        chunkSize: number, 
        delayMs: number, 
        processor: (item: T) => Promise<void>
    ) {
        for (let i = 0; i < items.length; i += chunkSize) {
            if (!this.isSanitizing) break;
            const chunk = items.slice(i, i + chunkSize);
            await Promise.all(chunk.map(item => processor(item)));
            if (i + chunkSize < items.length && this.isSanitizing) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    async leaveGroups(ids: string[], silent: boolean = false) {
        try {
            this.isSanitizing = true;
            const targetIds: any[] = ids.length > 0 ? ids : Array.from(this.client.channels.cache.filter(c => c.type === 'GROUP_DM').keys());
            this.logCallback(`Départ${silent ? ' (discret)' : ''} de ${targetIds.length} groupes...`, 'info');
            let count = 0;

            await this.runInChunks(targetIds, 3, 250, async (id) => {
                if (!this.isSanitizing) return;
                try {
                    let channel: any = this.client.channels.cache.get(id);
                    if (!channel) channel = await this.client.channels.fetch(id).catch(() => undefined);
                    if (channel && channel.type === 'GROUP_DM') {
                        const groupName = (channel as any).name || 'Groupe sans nom';
                        if (count % 10 === 0) this.logCallback(`[Progression] Départ${silent ? ' discret' : ''} de : ${groupName}... (Total: ${count})`, 'info');
                        if (silent) await (this.client as any).api.channels(id).delete({ query: { silent: true } });
                        else await (channel as any).delete();
                        count++;
                    }
                } catch (e: any) { this.logCallback(`Erreur groupe ${id} : ${e.message}`, 'error'); }
            });

            const finalMsg = !this.isSanitizing ? 'Départ des groupes interrompu.' : `${count} groupes quittés.`;
            this.logCallback(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.logCallback(`Erreur groupes : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async deleteFriends(ids: string[]) {
        try {
            this.isSanitizing = true;
            const targetIds: any[] = ids.length > 0 ? ids : Array.from((this.client.relationships as any).cache.filter((r: any) => r.type === 1 || r === 1).keys());
            this.logCallback(`Nettoyage des relations : ${targetIds.length} cibles trouvées`, 'info');
            
            let success = 0;
            let failed = 0;

            await this.runInChunks(targetIds, 3, 250, async (id) => {
                if (!this.isSanitizing) return;
                try {
                    const user = this.client.users.cache.get(id) || await this.client.users.fetch(id).catch(() => null);
                    const name = user ? user.tag : id;
                    
                    const rels: Record<string, any> = (this.client as any).api.users['@me'].relationships;
                    await rels[id].delete({ DiscordContext: { location: 'ContextMenu' } });
                    
                    success++;
                    if (success % 20 === 0) this.logCallback(`[Progression] Amis retirés : ${success}... (Dernier: ${name})`, 'info');
                } catch (e: any) { 
                    failed++;
                    this.logCallback(`[ERROR] Impossible de retirer ${id} : ${e.message}`, 'error'); 
                }
            });
            
            const finalMsg = !this.isSanitizing ? 'Nettoyage des relations interrompu.' : `Nettoyage terminé. Succès : ${success} | Échecs : ${failed}`;
            this.logCallback(finalMsg, this.isSanitizing && success > 0 ? 'success' : 'info');
            return { success: true, count: success, failed };
        } catch (err: any) {
            this.logCallback(`Échec critique du nettoyage : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async closeAllDMs() {
        try {
            this.isSanitizing = true;
            const dmChannels = Array.from(this.client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM').values());
            this.logCallback(`Fermeture de ${dmChannels.length} conversations privées...`, 'info');
            let count = 0;

            await this.runInChunks(dmChannels, 3, 250, async (channel) => {
                if (!this.isSanitizing) return;
                try {
                    await (channel as any).delete();
                    count++;
                    if (count % 20 === 0) this.logCallback(`[Progression] Fermeture des DM : ${count}...`, 'info');
                } catch (e: any) { this.logCallback(`Erreur DM ${channel.id} : ${e.message}`, 'error'); }
            });

            const finalMsg = !this.isSanitizing ? 'Fermeture des conversations interrompue.' : `${count} conversations fermées.`;
            this.logCallback(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.logCallback(`Erreur fermeture DMs : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }

    async leaveServers(ids: string[]) {
        try {
            this.isSanitizing = true;
            const targetIds = ids.length > 0 ? ids : Array.from(this.client.guilds.cache.keys());
            this.logCallback(`Départ de ${targetIds.length} serveurs...`, 'info');
            let count = 0;

            await this.runInChunks(targetIds, 3, 250, async (id) => {
                if (!this.isSanitizing) return;
                try {
                    const guild = this.client.guilds.cache.get(id);
                    if (guild) {
                        if (count % 5 === 0) this.logCallback(`[Progression] Départ de : ${guild.name}... (Total: ${count})`, 'info');
                        await guild.leave();
                        count++;
                    }
                } catch (e: any) { this.logCallback(`Erreur serveur ${id} : ${e.message}`, 'error'); }
            });

            const finalMsg = !this.isSanitizing ? 'Départ des serveurs interrompu.' : `${count} serveurs quittés.`;
            this.logCallback(finalMsg, this.isSanitizing ? 'success' : 'info');
            return { success: true, count };
        } catch (err: any) {
            this.logCallback(`Erreur serveurs : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally { this.isSanitizing = false; }
    }
}
