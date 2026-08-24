import { Client } from 'discord.js-selfbot-v13';
import { ghostTracker } from '../services/ghost-tracker';

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateCombinations(length: number, chars: string): string[] {
    const results: string[] = [];
    const charArray = chars.split('');
    
    function helper(current: string) {
        if (current.length === length) {
            // Discord rule: no consecutive dots, no dots at edges
            if (!current.includes('..') && !current.startsWith('.') && !current.endsWith('.')) {
                results.push(current);
            }
            return;
        }
        for (const c of charArray) {
            helper(current + c);
        }
    }
    
    helper('');
    return results;
}

export class PomeloService {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;
    private emitCallback: (event: string, data: any) => void;
    public isPomeloBatching: boolean = false;
    private tokenCooldowns: Map<string, number> = new Map();

    constructor(
        client: Client, 
        logCallback: (msg: string, type: 'info' | 'success' | 'error') => void,
        emitCallback: (event: string, data: any) => void
    ) {
        this.client = client;
        this.logCallback = logCallback;
        this.emitCallback = emitCallback;
    }

    public setClient(client: Client) {
        this.client = client;
    }

    public stop() {
        this.isPomeloBatching = false;
        this.emitCallback('pomelo-update', { status: 'batch_stopped' });
    }

    async checkPomelo(username: string, botToken?: string) {
        const token = botToken || this.client.token;
        if (!token) return { success: false, error: 'Token Discord requis pour le check' };

        // Check if this token is currently in cooldown
        const cooldownUntil = this.tokenCooldowns.get(token) || 0;
        if (Date.now() < cooldownUntil) {
            const waitSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
            return { success: false, error: 'Rate-limited', retryAfter: waitSeconds };
        }

        try {
            let isTaken = false;
            
            const authHeader = token.startsWith('Bot ') ? token : (botToken ? `Bot ${botToken.trim()}` : token);
            const response = await fetch('https://discord.com/api/v9/users/@me/pomelo-attempt', {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                const retryAfter = Number(data.retry_after) || 5;
                this.tokenCooldowns.set(token, Date.now() + (retryAfter * 1000));
                return { success: false, error: 'Rate-limited', retryAfter };
            }
            
            const data = await response.json().catch(() => ({ taken: true }));
            isTaken = data.taken !== false;
            
            if (!response.ok && response.status !== 400) {
                throw new Error(`Bot API Error: ${response.status}`);
            }
            
            if (isTaken) {
                try {
                    await (this.client as any).api.users['@me'].relationships.post({
                        data: { username }
                    });
                    ghostTracker.remove(username);
                    return { success: true, data: { available: false, status: 'taken' } };
                } catch (err: any) {
                    const errorCode = err.code || (err.rawError && err.rawError.code);
                    const status = err.status || (err.rawError && err.rawError.status);
                    const message = err.message || (err.rawError && err.rawError.message);
                    
                    const isCaptcha = 
                        message?.toUpperCase().includes('CAPTCHA') || 
                        Number(errorCode) === 500 || 
                        errorCode === 'CAPTCHA_SOLVER_NOT_IMPLEMENTED' ||
                        status === 429;
                    
                    if (isCaptcha) {
                        this.logCallback(`[POMELO] 🔒 Détection Captcha pour ${username}`, 'error');
                        return { success: true, data: { available: false, status: 'captcha' } };
                    }

                    if (Number(errorCode) === 40033 || Number(errorCode) === 40001 || status === 404) {
                        const firstSeen = ghostTracker.track(username);
                        return { success: true, data: { available: false, status: 'ghost', firstSeen } };
                    }
                    
                    ghostTracker.remove(username);
                    return { success: true, data: { available: false, status: 'taken' } };
                }
            }
            
            if (this.client.user && username.toLowerCase() === this.client.user.username.toLowerCase()) {
                return { success: true, data: { available: true, status: 'owned' } };
            }
            
            ghostTracker.remove(username);
            return { success: true, data: { available: true, status: 'available' } };
        } catch (err: any) {
            if (err.status === 429) {
                this.tokenCooldowns.set(token, Date.now() + 5000);
                return { success: false, error: 'Rate-limited', retryAfter: err.retryAfter || 5 };
            }
            return { success: false, error: err.message || 'Erreur API inconnue' };
        }
    }

    async claimPomelo(username: string, password?: string) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        if (!password) return { success: false, error: 'Mot de passe requis pour le claim' };
        
        try {
            this.logCallback(`🔥 [CLAIM] Tentative immédiate de récupération du pseudo : @${username}...`, 'info');
            const res = await (this.client as any).api.users['@me'].patch({
                data: {
                    username,
                    password
                }
            });
            
            if (res.username === username) {
                this.logCallback(`🎉 [CLAIM SUCCÈS] Le pseudo @${username} a été assigné à votre compte !`, 'success');
                this.emitCallback('pomelo-update', { username, status: 'claimed' });
                return { success: true, username: res.username };
            }
            return { success: false, error: 'Le pseudo n\'a pas pu être changé' };
        } catch (err: any) {
            this.logCallback(`❌ [CLAIM ÉCHEC] Impossible de claim @${username} : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async batchCheckPomelo(
        usernames: string[], 
        { 
            delay = 1000, 
            autoClaim = false, 
            password = '', 
            botToken = '', 
            generator = 'custom' 
        }: {
            delay?: number;
            autoClaim?: boolean;
            password?: string;
            botToken?: string;
            generator?: string;
        }
    ) {
        // Parse multi-bot tokens pool
        const rawTokens = botToken
            .split(/[\n,;]+/)
            .map(t => t.trim().replace(/^Bot\s+/i, ''))
            .filter(t => t.length > 10);

        const botTokenPool = rawTokens.length > 0 ? rawTokens : (this.client.token ? [this.client.token] : []);
        
        if (botTokenPool.length === 0) {
            return { success: false, error: 'Veuillez renseigner au moins un Bot Token pour le scan' };
        }

        if (this.isPomeloBatching) return { success: false, error: 'Un check est déjà en cours' };
        this.isPomeloBatching = true;
        
        let targetUsernames = usernames;
        if (generator && generator !== 'custom') {
            this.logCallback(`[POMELO] Génération du dictionnaire (${generator})...`, 'info');
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789._';
            
            let chars = letters;
            let len = 3;
            if (generator === '2l') { chars = letters; len = 2; }
            else if (generator === '2c') { chars = alphanum; len = 2; }
            else if (generator === '3l') { chars = letters; len = 3; }
            else if (generator === '3c') { chars = alphanum; len = 3; }
            else if (generator === '4l') { chars = letters; len = 4; }
            else if (generator === '4c') { chars = alphanum; len = 4; }
            else if (generator === '5l') { chars = letters; len = 5; }
            
            targetUsernames = generateCombinations(len, chars);
            this.logCallback(`[POMELO] Mélange aléatoire (shuffle) de ${targetUsernames.length} combinaisons...`, 'info');
            shuffleArray(targetUsernames);
        }

        this.logCallback(`🎯 [POMELO] Démarrage Batch Scan (${targetUsernames.length} cibles) via ${botTokenPool.length} Bot Token(s)`, 'success');
        
        let found = 0;
        let tokenIndex = 0;

        for (let i = 0; i < targetUsernames.length; i++) {
            if (!this.isPomeloBatching) break;
            const username = targetUsernames[i];
            
            // Pick next token in round-robin
            const currentToken = botTokenPool[tokenIndex % botTokenPool.length];
            tokenIndex++;

            const result = await this.checkPomelo(username, currentToken);
            if (result.success && result.data) {
                if (result.data.available) {
                    this.logCallback(`✨ [DISPONIBLE] Pseudo libre trouvé : @${username}`, 'success');
                    this.emitCallback('pomelo-update', { username, status: 'available' });
                    found++;
                    
                    if (autoClaim && password) {
                        const claimRes = await this.claimPomelo(username, password);
                        if (claimRes.success) {
                            this.isPomeloBatching = false;
                            this.emitCallback('pomelo-update', { status: 'batch_ended', found, claimed: username });
                            return { success: true, data: { found, claimed: username } };
                        }
                    }
                } else {
                    const status = result.data.status;
                    const firstSeen = result.data.firstSeen;
                    this.emitCallback('pomelo-update', { username, status, firstSeen });
                }
            } else {
                if (result.error === 'Rate-limited') {
                    // If we have multiple tokens, try next token immediately; otherwise wait
                    if (botTokenPool.length === 1) {
                        const waitTime = (result.retryAfter || 5) * 1000;
                        this.logCallback(`⏳ [RATE-LIMIT] Attente de ${waitTime/1000}s sur le token...`, 'info');
                        await new Promise(r => setTimeout(r, waitTime));
                    }
                    // Retry same username on next loop
                    i--;
                }
            }
            
            // Delay divided by number of tokens for parallel throughput
            const effectiveDelay = Math.max(100, Math.floor(delay / Math.max(1, botTokenPool.length)));
            await new Promise(r => setTimeout(r, effectiveDelay));
        }
        
        this.isPomeloBatching = false;
        this.emitCallback('pomelo-update', { status: 'batch_ended', found });
        this.logCallback(`✅ [POMELO] Batch Scan terminé — ${found} pseudo(s) disponible(s) détecté(s).`, 'success');
        return { success: true, found };
    }
}
