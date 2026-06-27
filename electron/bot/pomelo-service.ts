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
    }

    async checkPomelo(username: string, botToken?: string) {
        if (!botToken) return { success: false, error: 'Bot Token is required' };
        try {
            let isTaken = false;
            
            const response = await fetch('https://discord.com/api/v9/users/@me/pomelo-attempt', {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                return { success: false, error: 'Rate-limited', retryAfter: data.retry_after || 5 };
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
                    
                    this.logCallback(`[POMELO] Result for ${username}: Code ${errorCode}, Status ${status}, Msg: ${message}`, 'info');

                    const isCaptcha = 
                        message?.toUpperCase().includes('CAPTCHA') || 
                        Number(errorCode) === 500 || 
                        errorCode === 'CAPTCHA_SOLVER_NOT_IMPLEMENTED' ||
                        status === 429;
                    
                    if (isCaptcha) {
                        this.logCallback(`[POMELO] Detected CAPTCHA/Block for ${username}`, 'error');
                        return { success: true, data: { available: false, status: 'captcha' } };
                    }

                    if (Number(errorCode) === 40033 || Number(errorCode) === 40001 || status === 404) {
                        const firstSeen = ghostTracker.track(username);
                        return { success: true, data: { available: false, status: 'ghost', firstSeen } };
                    }
                    
                    this.logCallback(`[POMELO] Treating as TAKEN for ${username} (Unrecognized error)`, 'info');
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
            console.error('[POMELO] API Error:', err);
            if (err.status === 429) return { success: false, error: 'Rate-limited', retryAfter: err.retryAfter };
            return { success: false, error: err.message || 'Erreur API inconnue' };
        }
    }

    async claimPomelo(username: string, password?: string) {
        if (!this.client.user) return { success: false, error: 'Non connecté' };
        if (!password) return { success: false, error: 'Mot de passe requis pour le claim' };
        
        try {
            this.logCallback(`🔥 Tentative de CLAIM du pseudo : ${username}...`, 'info');
            const res = await (this.client as any).api.users['@me'].patch({
                data: {
                    username,
                    password
                }
            });
            
            if (res.username === username) {
                this.logCallback(`🎉 SUCCÈS : Pseudo ${username} récupéré !`, 'success');
                return { success: true, username: res.username };
            }
            return { success: false, error: 'Le pseudo n\'a pas pu être changé' };
        } catch (err: any) {
            this.logCallback(`❌ Échec du claim (${username}) : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    async batchCheckPomelo(usernames: string[], { delay = 1000, autoClaim = false, password = '', botToken = '', generator = 'custom' }) {
        if (!botToken) return { success: false, error: 'Bot Token is required' };
        if (this.isPomeloBatching) return { success: false, error: 'Un check est déjà en cours' };
        this.isPomeloBatching = true;
        
        let targetUsernames = usernames;
        if (generator && generator !== 'custom') {
            this.logCallback(`Génération du dictionnaire (${generator})...`, 'info');
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789._';
            
            let chars = letters;
            let len = 3;
            if (generator === '3l') { chars = letters; len = 3; }
            else if (generator === '3c') { chars = alphanum; len = 3; }
            else if (generator === '4l') { chars = letters; len = 4; }
            else if (generator === '4c') { chars = alphanum; len = 4; }
            
            targetUsernames = generateCombinations(len, chars);
            this.logCallback(`Mélange (shuffle) de ${targetUsernames.length} combinaisons...`, 'info');
            shuffleArray(targetUsernames);
        }

        this.logCallback(`🎯 Démarrage Batch Check (${targetUsernames.length} pseudos) [VIA BOT TOKEN]`, 'info');
        
        let found = 0;
        let i = 0;
        while (i < targetUsernames.length) {
            if (!this.isPomeloBatching) break;
            const username = targetUsernames[i];
            
            const result = await this.checkPomelo(username, botToken);
            if (result.success && result.data) {
                if (result.data.available) {
                    this.logCallback(`... DISPONIBLE : ${username}`, 'success');
                    this.emitCallback('pomelo-update', { username, status: 'available' });
                    found++;
                    
                    if (autoClaim && password) {
                        const claimRes = await this.claimPomelo(username, password);
                        if (claimRes.success) {
                            this.isPomeloBatching = false;
                            return { success: true, data: { found, claimed: username } };
                        }
                    }
                } else {
                    const status = result.data.status;
                    const firstSeen = result.data.firstSeen;
                    this.logCallback(`${status === 'ghost' ? '🟠 GHOST' : '🔴 PRIS'} : ${username}`, 'info');
                    this.emitCallback('pomelo-update', { username, status, firstSeen });
                }
                i++;
            } else {
                this.logCallback(`⚠️ Erreur check ${username} : ${result.error}`, 'error');
                if (result.error === 'Rate-limited') {
                    const waitTime = (result.retryAfter || 5) * 1000;
                    this.logCallback(`⏳ Rate-limit ! Attente de ${waitTime/1000}s...`, 'info');
                    await new Promise(r => setTimeout(r, waitTime));
                } else {
                    i++;
                }
            }
            
            await new Promise(r => setTimeout(r, delay));
        }
        
        this.isPomeloBatching = false;
        this.logCallback(`✅ Batch Check terminé. ${found} pseudos trouvés.`, 'info');
        return { success: true, found };
    }
}
