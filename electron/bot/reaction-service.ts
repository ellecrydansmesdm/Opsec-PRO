import { Client } from 'discord.js-selfbot-v13';
import { Account } from '../../shared/types';
import UserAgent from 'user-agents';
import { ProxyAgent } from 'proxy-agent';

export class ReactionService {
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private clients: Map<string, Client> = new Map();
    private loginPromises: Map<string, Promise<Client>> = new Map();
    private solver?: (captcha: any, UA: string) => Promise<string>;
    public isRunning: boolean = false;

    constructor(logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.logCallback = logCallback;
    }

    public stop() {
        this.isRunning = false;
    }

    public setSolver(solver: (captcha: any, UA: string) => Promise<string>) {
        this.solver = solver;
    }

    private async getOrCreateClient(acc: Account): Promise<Client> {
        const existing = this.clients.get(acc.id);
        if (existing && existing.readyAt) {
            return existing;
        }

        if (this.loginPromises.has(acc.id)) {
            return this.loginPromises.get(acc.id)!;
        }

        const loginPromise = (async () => {
            if (existing) {
                try { existing.destroy(); } catch (_) {}
                this.clients.delete(acc.id);
            }

            const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
            const clientOptions: any = {
                captchaSolver: this.solver,
                http: { headers: { 'User-Agent': ua } }
            };

            if (acc.proxy && acc.proxy.trim()) {
                try {
                    const agent = new ProxyAgent(acc.proxy.trim() as any);
                    clientOptions.http.agent = agent;
                    clientOptions.ws = { agent };
                } catch (_) {}
            }

            const client = new Client(clientOptions);

            client.on('error', () => {});

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    try { client.destroy(); } catch (_) {}
                    reject(new Error('Login Timeout (15s)'));
                }, 15000);

                client.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                client.login(acc.token).catch((err) => {
                    clearTimeout(timeout);
                    try { client.destroy(); } catch (_) {}
                    reject(err);
                });
            });

            this.clients.set(acc.id, client);
            return client;
        })();

        this.loginPromises.set(acc.id, loginPromise);

        try {
            const client = await loginPromise;
            return client;
        } finally {
            this.loginPromises.delete(acc.id);
        }
    }

    public async preConnectAccounts(accounts: Account[]) {
        for (const acc of accounts) {
            if (!acc || !acc.token) continue;
            this.getOrCreateClient(acc).catch(() => {});
        }
    }

    public async nukeReaction(messageId: string, channelId: string, emoji: string, accounts: Account[]) {
        if (this.isRunning) {
            return { successCount: 0, failCount: accounts.length, error: 'Vote Storm déjà en cours' };
        }
        this.isRunning = true;
        this.logCallback(`[REACTION-NUKE] 🚀 Lancement sur ${accounts.length} tokens...`, 'info');

        const promises = accounts.map(async (acc) => {
            try {
                const client = await this.getOrCreateClient(acc);

                // 2. Fetch Channel
                let channel: any = await client.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    channel = client.channels.cache.get(channelId);
                }

                if (!channel) {
                    return { id: acc.id, user: acc.username, success: false, error: 'Salon inaccessible' };
                }

                // 3. Fetch Message
                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    return { id: acc.id, user: acc.username, success: false, error: 'Message introuvable' };
                }

                // 4. Perform Reaction
                await message.react(emoji.trim());
                return { id: acc.id, user: acc.username, success: true };

            } catch (err: any) {
                return { id: acc.id, user: acc.username, success: false, error: err.message || 'Erreur inconnue' };
            }
        });

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const failures = results.filter(r => !r.success);

        failures.forEach(f => {
            this.logCallback(`[REACTION-NUKE] ❌ ÉCHEC [${f.user}] : ${f.error}`, 'error');
        });

        this.logCallback(`[REACTION-NUKE] ✨ Terminé. Succès : ${successCount} | Échecs : ${failures.length}`, successCount > 0 ? 'success' : 'error');
        this.isRunning = false;
        return { successCount, failCount: failures.length };
    }

    public async massRemoveReactions(channelId: string, messageId: string, emoji?: string, accounts: Account[] = []): Promise<{ success: boolean; count: number }> {
        this.logCallback(`[REACTION-CLEAR] 🧹 Nettoyage des réactions sur message ${messageId}...`, 'info');
        let count = 0;

        for (const acc of accounts) {
            try {
                const client = await this.getOrCreateClient(acc);
                const channel: any = await client.channels.fetch(channelId).catch(() => null);
                if (!channel) continue;

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message || !message.reactions?.cache) continue;

                for (const reaction of Array.from(message.reactions.cache.values()) as any[]) {
                    if (!emoji || reaction.emoji.name === emoji || reaction.emoji.id === emoji) {
                        await reaction.users.remove(client.user?.id).catch(() => {});
                        count++;
                    }
                }
            } catch (_) {}
        }

        this.logCallback(`[REACTION-CLEAR] ✨ ${count} réaction(s) retirée(s).`, 'success');
        return { success: true, count };
    }

    public destroy() {
        this.clients.forEach(c => {
            try { c.destroy(); } catch (e) {}
        });
        this.clients.clear();
        this.loginPromises.clear();
    }
}
