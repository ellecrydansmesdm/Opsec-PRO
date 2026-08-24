import { AppSettings } from '../../shared/types';

export class CaptchaService {
    private logCallback: (msg: string, type: 'info' | 'success' | 'error') => void;

    constructor(logCallback: (msg: string, type: 'info' | 'success' | 'error') => void) {
        this.logCallback = logCallback;
    }

    public async checkCapMonsterKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.capmonster.cloud/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.logCallback(`[CapMonster] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkTwoCaptchaKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch(`https://2captcha.com/res.php?key=${key}&action=getbalance&json=1`).then(r => r.json()) as any;
            if (res.status === 1) {
                this.logCallback(`[2Captcha] Clé valide. Solde : ${res.request}$`, 'success');
                return { success: true, balance: parseFloat(res.request) };
            } else {
                return { success: false, error: res.request || 'Clé invalide' };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkAntiCaptchaKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.anti-captcha.com/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.logCallback(`[Anti-Captcha] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.errorDescription || `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkCapsolverKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch('https://api.capsolver.com/getBalance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key })
            }).then(r => r.json()) as any;

            if (res.errorId === 0) {
                this.logCallback(`[Capsolver] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.errorDescription || `Erreur ${res.errorCode}` };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public async checkNoCaptchaAIKey(key: string) {
        if (!key) return { success: false, error: 'Clé manquante' };
        try {
            const res = await fetch(`https://manage.nocaptchaai.com/api/user/balance?key=${key}`).then(r => r.json()) as any;
            if (res.balance !== undefined) {
                this.logCallback(`[NoCaptchaAI] Clé valide. Solde : ${res.balance}$`, 'success');
                return { success: true, balance: res.balance };
            } else {
                return { success: false, error: res.error || 'Clé invalide' };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    public getCaptchaSolverConfig(settings: AppSettings | null): { provider: string; key: string } | null {
        const cfg = settings?.automationConfig;
        if (!cfg) return null;
        if (cfg.capsolverKey?.trim()) return { provider: 'capsolver', key: cfg.capsolverKey.trim() };
        if (cfg.capMonsterKey?.trim()) return { provider: 'capmonster', key: cfg.capMonsterKey.trim() };
        if (cfg.twoCaptchaKey?.trim()) return { provider: '2captcha', key: cfg.twoCaptchaKey.trim() };
        if (cfg.antiCaptchaKey?.trim()) return { provider: 'anticaptcha', key: cfg.antiCaptchaKey.trim() };
        if (cfg.noCaptchaAIKey?.trim()) return { provider: 'nocaptchaai', key: cfg.noCaptchaAIKey.trim() };
        return null;
    }

    private async solveWithCapMonster(key: string, captcha: any, UA: string): Promise<string> {
        this.logCallback('[CapMonster] Résolution du captcha hCaptcha en cours...', 'info');
        const createRes = await fetch('https://api.capmonster.cloud/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: key,
                task: {
                    type: 'HCaptchaTaskProxyless',
                    websiteURL: 'https://discord.com',
                    websiteKey: captcha.captcha_sitekey,
                    isInvisible: true,
                    data: captcha.captcha_rqdata,
                    userAgent: UA,
                },
            }),
        }).then(res => res.json()) as any;

        if (createRes.errorId !== 0) throw new Error(`CapMonster Error: ${createRes.errorCode}`);

        const taskId = createRes.taskId;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const resultRes = await fetch('https://api.capmonster.cloud/getTaskResult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key, taskId }),
            }).then(res => res.json()) as any;

            if (resultRes.status === 'ready') {
                this.logCallback('[CapMonster] Captcha résolu avec succès !', 'success');
                return resultRes.solution.gRecaptchaResponse;
            }
            if (resultRes.errorId !== 0) throw new Error(`CapMonster Error: ${resultRes.errorCode}`);
        }
        throw new Error('CapMonster Timeout');
    }

    private async solveWithCapsolver(key: string, captcha: any, UA: string): Promise<string> {
        this.logCallback('[Capsolver] Résolution du captcha hCaptcha en cours...', 'info');
        const createRes = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: key,
                task: {
                    type: 'HCaptchaTaskProxyLess',
                    websiteURL: 'https://discord.com',
                    websiteKey: captcha.captcha_sitekey,
                    isInvisible: true,
                    userAgent: UA,
                    enterprisePayload: captcha.captcha_rqdata ? { rqdata: captcha.captcha_rqdata } : undefined,
                },
            }),
        }).then(res => res.json()) as any;

        if (createRes.errorId !== 0) throw new Error(`Capsolver Error: ${createRes.errorDescription || createRes.errorCode}`);

        const taskId = createRes.taskId;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: key, taskId }),
            }).then(res => res.json()) as any;

            if (resultRes.status === 'ready') {
                this.logCallback('[Capsolver] Captcha résolu avec succès !', 'success');
                return resultRes.solution.gRecaptchaResponse;
            }
            if (resultRes.errorId !== 0) throw new Error(`Capsolver Error: ${resultRes.errorDescription || resultRes.errorCode}`);
        }
        throw new Error('Capsolver Timeout');
    }

    private async solveWith2Captcha(key: string, captcha: any, UA: string): Promise<string> {
        this.logCallback('[2Captcha] Résolution du captcha hCaptcha en cours...', 'info');
        const params = new URLSearchParams({
            key,
            method: 'hcaptcha',
            sitekey: captcha.captcha_sitekey,
            pageurl: 'https://discord.com',
            json: '1',
            userAgent: UA,
        });
        if (captcha.captcha_rqdata) {
            params.append('data', captcha.captcha_rqdata);
        }

        const createRes = await fetch(`https://2captcha.com/in.php?${params.toString()}`).then(r => r.json()) as any;
        if (createRes.status !== 1) throw new Error(`2Captcha Error: ${createRes.request}`);

        const requestId = createRes.request;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const resultRes = await fetch(`https://2captcha.com/res.php?key=${key}&action=get&id=${requestId}&json=1`).then(r => r.json()) as any;
            if (resultRes.status === 1) {
                this.logCallback('[2Captcha] Captcha résolu avec succès !', 'success');
                return resultRes.request;
            }
            if (resultRes.request !== 'CAPCHA_NOT_READY') {
                throw new Error(`2Captcha Error: ${resultRes.request}`);
            }
        }
        throw new Error('2Captcha Timeout');
    }

    public async solveCaptcha(settings: AppSettings | null, captcha: any, UA: string): Promise<string> {
        const solver = this.getCaptchaSolverConfig(settings);
        if (!solver) {
            this.logCallback('Captcha détecté — configurez une clé API dans Network Hub (Resolvers).', 'error');
            return '';
        }

        try {
            if (solver.provider === 'capsolver') return await this.solveWithCapsolver(solver.key, captcha, UA);
            if (solver.provider === 'capmonster') return await this.solveWithCapMonster(solver.key, captcha, UA);
            if (solver.provider === '2captcha') return await this.solveWith2Captcha(solver.key, captcha, UA);
            this.logCallback(`[Captcha] Solveur ${solver.provider} non supporté — utilisez Capsolver, CapMonster ou 2Captcha.`, 'error');
            return '';
        } catch (err: any) {
            this.logCallback(`[Captcha] Échec fatal : ${err.message}`, 'error');
            throw err;
        }
    }
}
