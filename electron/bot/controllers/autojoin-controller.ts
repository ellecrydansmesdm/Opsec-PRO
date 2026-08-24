import { Client } from 'discord.js-selfbot-v13';

export class AutoJoinController {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    public isAutoJoining: boolean = false;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.client = client;
        this.logCallback = logCallback;
    }

    public getStatus() {
        return { running: this.isAutoJoining };
    }

    public stop() {
        this.isAutoJoining = false;
        return { success: true };
    }

    public parseInviteCode(link: string): string | null {
        const trimmed = link.trim();
        const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i);
        if (match) return match[1];
        if (/^[a-zA-Z0-9-]+$/.test(trimmed)) return trimmed;
        return null;
    }

    public async joinGuildInvite(client: Client, code: string) {
        try {
            await (client as any).acceptInvite(code);
        } catch {
            await (client as any).api.invites(code).post({ data: {} });
        }
    }

    public async autoJoinServers(
        inviteLink: string, 
        delayMs: number = 3000, 
        settings: any, 
        hasCaptchaSolver: boolean, 
        getSpamClient: (acc: any) => Promise<Client>
    ) {
        if (this.isAutoJoining) return { success: false, error: 'Auto-join déjà en cours' };

        const code = this.parseInviteCode(inviteLink);
        if (!code) return { success: false, error: 'Lien d\'invitation invalide' };

        const accounts = settings?.accounts || [];
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

        this.isAutoJoining = true;
        this.logCallback(`[AUTO-JOIN] 🚀 Join sur ${targets.length} compte(s) — invite: ${code}`, 'success');

        if (!hasCaptchaSolver) {
            this.logCallback('[AUTO-JOIN] ⚠️ Aucune clé Captcha — les comptes flaggés devront en configurer une dans Network Hub.', 'info');
        }

        const results: { username: string; status: 'joined' | 'already' | 'captcha' | 'error'; message?: string }[] = [];

        try {
            for (let i = 0; i < targets.length; i++) {
                if (!this.isAutoJoining) break;
                const target = targets[i];
                try {
                    const client = target.isMain ? this.client : await getSpamClient(target);
                    await this.joinGuildInvite(client, code);
                    results.push({ username: target.username, status: 'joined' });
                    this.logCallback(`[AUTO-JOIN] ✅ ${target.username} a rejoint le serveur`, 'success');
                } catch (e: any) {
                    const msg = (e.message || String(e)).toLowerCase();
                    const raw = e.message || String(e);
                    const status = e.status || e.statusCode;
                    const retryAfter = e.retryAfter || (e.headers && e.headers['retry-after']) || (e.response && e.response.headers && e.response.headers['retry-after']);
                    
                    if (status === 429 || /rate limit|retry/i.test(msg)) {
                        const waitTime = retryAfter ? Number(retryAfter) : 5000;
                        this.logCallback(`[AUTO-JOIN] ⚠️ Rate limit détecté pour ${target.username}. Attente de ${Math.ceil(waitTime / 1000)}s...`, 'error');
                        await new Promise(r => setTimeout(r, waitTime));
                        try {
                            const client = target.isMain ? this.client : await getSpamClient(target);
                            await this.joinGuildInvite(client, code);
                            results.push({ username: target.username, status: 'joined' });
                            this.logCallback(`[AUTO-JOIN] ✅ ${target.username} a rejoint le serveur après attente`, 'success');
                        } catch (err2: any) {
                            const msg2 = (err2.message || String(err2)).toLowerCase();
                            if (/captcha|captcha_key|10008/i.test(msg2) || err2.captcha) {
                                const captchaMsg = hasCaptchaSolver ? 'Captcha non résolu' : 'Clé Captcha requise';
                                results.push({ username: target.username, status: 'captcha', message: captchaMsg });
                            } else if (/already|10007|50013|known member/i.test(msg2)) {
                                results.push({ username: target.username, status: 'already', message: 'Déjà membre' });
                            } else {
                                results.push({ username: target.username, status: 'error', message: 'Rate limit persistant' });
                            }
                            this.logCallback(`[AUTO-JOIN] ❌ ${target.username}: Échec après attente rate limit`, 'error');
                        }
                    } else if (/captcha|captcha_key|10008/i.test(msg) || e.captcha) {
                        const captchaMsg = hasCaptchaSolver
                            ? 'Captcha non résolu — vérifiez votre solde solver'
                            : 'Clé Captcha requise (Network Hub → Resolvers)';
                        results.push({ username: target.username, status: 'captcha', message: captchaMsg });
                        this.logCallback(`[AUTO-JOIN] 🔒 ${target.username}: ${captchaMsg}`, 'error');
                    } else if (/already|10007|50013|known member/i.test(msg)) {
                        results.push({ username: target.username, status: 'already', message: 'Déjà membre' });
                        this.logCallback(`[AUTO-JOIN] ℹ️ ${target.username}: déjà sur le serveur`, 'info');
                    } else {
                        results.push({ username: target.username, status: 'error', message: raw.slice(0, 150) });
                        this.logCallback(`[AUTO-JOIN] ❌ ${target.username}: ${raw}`, 'error');
                    }
                }

                if (i < targets.length - 1 && this.isAutoJoining) {
                    const wait = Math.max(500, delayMs + Math.floor(Math.random() * 1000));
                    await new Promise(r => setTimeout(r, wait));
                }
            }

            const joined = results.filter(r => r.status === 'joined').length;
            this.logCallback(`[AUTO-JOIN] Terminé — ${joined}/${targets.length} join(s) réussi(s).`, joined > 0 ? 'success' : 'info');
            return { success: true, data: { results, total: targets.length, hasCaptchaKey: hasCaptchaSolver } };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            this.isAutoJoining = false;
        }
    }
}
