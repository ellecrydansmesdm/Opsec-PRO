import { Client } from 'discord.js-selfbot-v13';
import { ProxyAgent } from 'proxy-agent';
import UserAgent from 'user-agents';
import { Account } from '../../shared/types';
import { appBus } from '../services/event-bus';
import { policyEngine } from '../services/policy-engine';

export interface ActiveSession {
    accountId: string;
    accountTag: string;
    client: Client;
    proxy?: string;
    status: 'connecting' | 'online' | 'error' | 'disconnected';
    startedAt: number;
    lastPing: number;
}

export class SessionManager {
    private static instance: SessionManager;
    private sessions: Map<string, ActiveSession> = new Map();

    private constructor() {}

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    /**
     * Start an isolated background session for an account
     */
    public async startSession(account: Account): Promise<{ success: boolean; error?: string }> {
        if (this.sessions.has(account.id)) {
            const existing = this.sessions.get(account.id)!;
            if (existing.status === 'online') {
                return { success: true };
            }
        }

        const verdict = policyEngine.checkAction('ACCOUNT_SWITCH', account.tag || account.username);
        if (verdict.verdict === 'DENY') {
            return { success: false, error: verdict.reason || 'Action bloquée par la politique de sécurité' };
        }

        try {
            const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
            const clientOptions: any = {
                http: {
                    headers: { 'User-Agent': ua }
                }
            };

            if (account.proxy && account.proxy.trim()) {
                try {
                    const agent = new ProxyAgent(account.proxy.trim() as any);
                    clientOptions.http.agent = agent;
                    clientOptions.ws = { agent };
                } catch (err: any) {
                    appBus.warn(`Session [${account.username}] Proxy invalide: ${err.message}`, 'SESSION');
                }
            }

            const client = new Client(clientOptions);
            const session: ActiveSession = {
                accountId: account.id,
                accountTag: account.tag || account.username,
                client,
                proxy: account.proxy,
                status: 'connecting',
                startedAt: Date.now(),
                lastPing: 0
            };

            this.sessions.set(account.id, session);

            client.on('ready', () => {
                session.status = 'online';
                session.lastPing = client.ws.ping;
                appBus.info(`Session en tâche de fond active pour : ${client.user?.tag}`, 'SESSION');
                appBus.emitTyped('account:login-success', { 
                    userId: client.user?.id || account.id, 
                    tag: client.user?.tag || account.username 
                });
            });

            client.on('disconnect', () => {
                session.status = 'disconnected';
                appBus.warn(`Session déconnectée : ${account.username}`, 'SESSION');
            });

            await client.login(account.token);
            return { success: true };
        } catch (err: any) {
            this.sessions.delete(account.id);
            appBus.error(`Échec du lancement de session pour ${account.username}: ${err.message}`, 'SESSION');
            return { success: false, error: err.message };
        }
    }

    /**
     * Stop a running background session
     */
    public stopSession(accountId: string): { success: boolean } {
        const session = this.sessions.get(accountId);
        if (!session) return { success: true };

        try {
            session.client.destroy();
        } catch (_) {}

        this.sessions.delete(accountId);
        appBus.info(`Session terminée pour le compte ID : ${accountId}`, 'SESSION');
        appBus.emitTyped('account:logout', { userId: accountId });
        return { success: true };
    }

    /**
     * Get list of active sessions with health status
     */
    public listActiveSessions(): Array<{
        accountId: string;
        accountTag: string;
        status: string;
        uptimeSeconds: number;
        proxy?: string;
        ping: number;
    }> {
        const list = [];
        for (const [id, s] of this.sessions.entries()) {
            list.push({
                accountId: id,
                accountTag: s.accountTag,
                status: s.status,
                uptimeSeconds: Math.floor((Date.now() - s.startedAt) / 1000),
                proxy: s.proxy ? s.proxy.replace(/:[^:@]+@/, ':***@') : undefined,
                ping: s.client.ws ? s.client.ws.ping : 0
            });
        }
        return list;
    }

    /**
     * Get isolated client instance for background task dispatching
     */
    public getClient(accountId: string): Client | null {
        const session = this.sessions.get(accountId);
        return session ? session.client : null;
    }
}

export const sessionManager = SessionManager.getInstance();
