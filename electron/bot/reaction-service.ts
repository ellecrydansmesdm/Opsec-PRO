import { Client } from 'discord.js-selfbot-v13';
import { Account } from '../../shared/types';
import UserAgent from 'user-agents';

export class ReactionService {
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private clients: Map<string, Client> = new Map();
    private solver?: (captcha: any, UA: string) => Promise<string>;

    constructor(logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.logCallback = logCallback;
    }

    public setSolver(solver: (captcha: any, UA: string) => Promise<string>) {
        this.solver = solver;
    }

    public async nukeReaction(messageId: string, channelId: string, emoji: string, accounts: Account[]) {
        this.logCallback(`[REACTION-NUKE] 🚀 Lancement sur ${accounts.length} tokens...`, 'info');
        
        const promises = accounts.map(async (acc) => {
            try {
                let client = this.clients.get(acc.id);
                
                // 1. Initialize and Login if not ready
                if (!client || !client.readyAt) {
                    const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
                    client = new Client({
                        captchaSolver: this.solver,
                        http: { headers: { 'User-Agent': ua } }
                    });
                    
                    // Promise wrapper for login with timeout
                    const loginPromise = new Promise(async (resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Login Timeout (30s)')), 30000);
                        try {
                            client!.once('ready', () => {
                                clearTimeout(timeout);
                                resolve(true);
                            });
                            await client!.login(acc.token);
                        } catch (e) {
                            clearTimeout(timeout);
                            reject(e);
                        }
                    });

                    await loginPromise;
                    this.clients.set(acc.id, client);
                }

                // 2. Fetch Channel
                const channel = await client.channels.fetch(channelId).catch(() => null) as any;
                if (!channel) {
                    return { id: acc.id, user: acc.username, success: false, error: 'Salon inaccessible' };
                }

                // 3. Fetch Message
                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    return { id: acc.id, user: acc.username, success: false, error: 'Message introuvable' };
                }

                // 4. Perform Reaction
                await message.react(emoji);
                return { id: acc.id, user: acc.username, success: true };

            } catch (err: any) {
                return { id: acc.id, user: acc.username, success: false, error: err.message || 'Erreur inconnue' };
            }
        });

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const failures = results.filter(r => !r.success);

        // Detailed logging of failures
        failures.forEach(f => {
            this.logCallback(`[REACTION-NUKE] ❌ ÉCHEC [${f.user}] : ${f.error}`, 'error');
        });

        this.logCallback(`[REACTION-NUKE] ✨ Terminé. Succès : ${successCount} | Échecs : ${failures.length}`, successCount > 0 ? 'success' : 'error');
        return { successCount, failCount: failures.length };
    }

    public destroy() {
        this.clients.forEach(c => {
            try { c.destroy(); } catch (e) {}
        });
        this.clients.clear();
    }
}
