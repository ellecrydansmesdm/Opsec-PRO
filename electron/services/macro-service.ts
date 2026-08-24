import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { BotService } from '../bot/bot-service';
import { appBus } from './event-bus';

export interface MacroStep {
    id: string;
    type: 'status' | 'fake_activity' | 'hypesquad' | 'purge' | 'leave_groups' | 'delay' | 'voice_join' | 'voice_leave';
    params: Record<string, any>;
    label?: string;
}

export interface MacroScenario {
    id: string;
    name: string;
    description: string;
    icon?: string;
    steps: MacroStep[];
    isPreset?: boolean;
    createdAt: number;
    hasRollback?: boolean;
}

export interface UserStateSnapshot {
    status?: string;
    customStatus?: string;
    activities?: any[];
    timestamp: number;
}

export class MacroService {
    private botService: BotService | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    private macrosFilePath: string;
    private userMacros: MacroScenario[] = [];
    public isRunning: boolean = false;
    private shouldCancel: boolean = false;
    private activeSnapshot: UserStateSnapshot | null = null;

    constructor(logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.logCallback = logCallback;
        const userDataPath = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.data');
        this.macrosFilePath = path.join(userDataPath, 'user_macros.json');
        this.loadMacros();
    }

    public setBotService(botService: BotService) {
        this.botService = botService;
    }

    private getPresets(): MacroScenario[] {
        return [
            {
                id: 'preset_stealth',
                name: '🕶️ Protocole Furtif (Stealth)',
                description: 'Passe en Invisible, supprime le custom status et quitte les groupes non désirés avec restauration possible.',
                isPreset: true,
                hasRollback: true,
                createdAt: 0,
                steps: [
                    { id: '1', type: 'status', params: { status: 'invisible', customText: '' }, label: 'Statut Invisible' },
                    { id: '2', type: 'delay', params: { ms: 500 }, label: 'Pause 500ms' },
                    { id: '3', type: 'leave_groups', params: {}, label: 'Quitter les groupes' }
                ]
            },
            {
                id: 'preset_streamer',
                name: '🚀 Mode Streamer Pro',
                description: 'Active une présence Twitch en direct et un badge personnalisé avec snapshot d\'état.',
                isPreset: true,
                hasRollback: true,
                createdAt: 0,
                steps: [
                    { id: '1', type: 'status', params: { status: 'online', customText: '🔴 En Live Twitch !' }, label: 'Statut En Live' },
                    { id: '2', type: 'fake_activity', params: { type: 'stream', title: '🔴 OPSEC PRO STREAM' }, label: 'Présence Twitch' },
                    { id: '3', type: 'hypesquad', params: { house: 'bravery' }, label: 'Badge HypeSquad Bravery' }
                ]
            },
            {
                id: 'preset_afk',
                name: '💤 Mode AFK Gamer',
                description: 'Passe en Ne pas déranger avec un faux jeu configuré.',
                isPreset: true,
                hasRollback: true,
                createdAt: 0,
                steps: [
                    { id: '1', type: 'status', params: { status: 'dnd', customText: 'AFK / Occupé' }, label: 'Statut DND' },
                    { id: '2', type: 'fake_activity', params: { type: 'play', title: 'Grand Theft Auto VI' }, label: 'Activité GTA VI' }
                ]
            }
        ];
    }

    private loadMacros() {
        try {
            if (fs.existsSync(this.macrosFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.macrosFilePath, 'utf-8'));
                if (Array.isArray(data)) {
                    this.userMacros = data;
                }
            }
        } catch (_) {}
    }

    private saveMacros() {
        try {
            fs.writeFileSync(this.macrosFilePath, JSON.stringify(this.userMacros, null, 2), 'utf-8');
        } catch (_) {}
    }

    public listMacros(): MacroScenario[] {
        return [...this.getPresets(), ...this.userMacros];
    }

    public saveUserMacro(macro: Omit<MacroScenario, 'isPreset' | 'createdAt'>): { success: boolean; data?: MacroScenario } {
        const newMacro: MacroScenario = {
            ...macro,
            isPreset: false,
            createdAt: Date.now()
        };

        const existingIdx = this.userMacros.findIndex(m => m.id === macro.id);
        if (existingIdx >= 0) {
            this.userMacros[existingIdx] = newMacro;
        } else {
            this.userMacros.unshift(newMacro);
        }

        this.saveMacros();
        this.logCallback(`[Macro] Scénario '${newMacro.name}' sauvegardé avec succès.`, 'success');
        return { success: true, data: newMacro };
    }

    public deleteUserMacro(macroId: string): { success: boolean } {
        this.userMacros = this.userMacros.filter(m => m.id !== macroId);
        this.saveMacros();
        this.logCallback(`[Macro] Scénario supprimé.`, 'info');
        return { success: true };
    }

    public cancelExecution() {
        this.shouldCancel = true;
    }

    public isExecuting(): boolean {
        return this.isRunning;
    }

    public getLastSnapshot(): UserStateSnapshot | null {
        return this.activeSnapshot;
    }

    /**
     * Capture State Snapshot before executing workflow
     */
    public captureSnapshot(): UserStateSnapshot | null {
        if (!this.botService?.client?.user) return null;
        try {
            const user: any = this.botService.client.user;
            const presence = user.presence || {};
            const snapshot: UserStateSnapshot = {
                status: presence.status || 'online',
                customStatus: presence.activities?.find((a: any) => a.type === 4)?.state || '',
                activities: presence.activities ? JSON.parse(JSON.stringify(presence.activities)) : [],
                timestamp: Date.now()
            };
            this.activeSnapshot = snapshot;
            return snapshot;
        } catch (_) {
            return null;
        }
    }

    /**
     * Rollback State Snapshot
     */
    public async restoreSnapshot(): Promise<{ success: boolean; error?: string }> {
        if (!this.activeSnapshot || !this.botService?.client?.user) {
            return { success: false, error: 'Aucun snapshot disponible pour la restauration.' };
        }

        try {
            const user: any = this.botService.client.user;
            this.logCallback('🔄 Restauration de l\'état précédent du profil...', 'info');

            if (this.activeSnapshot.status) {
                user.setStatus(this.activeSnapshot.status);
            }

            if (this.activeSnapshot.customStatus !== undefined) {
                await (this.botService.client as any).settings?.setCustomStatus({ 
                    text: this.activeSnapshot.customStatus 
                });
            }

            if (this.activeSnapshot.activities && this.activeSnapshot.activities.length > 0) {
                user.setPresence({ activities: this.activeSnapshot.activities });
            } else {
                user.setPresence({ activities: [] });
            }

            this.logCallback('✅ État du profil restauré avec succès.', 'success');
            this.activeSnapshot = null;
            return { success: true };
        } catch (e: any) {
            this.logCallback(`❌ Échec de la restauration : ${e.message}`, 'error');
            return { success: false, error: e.message };
        }
    }

    public async executeMacro(macroId: string): Promise<{ success: boolean; error?: string }> {
        const allMacros = this.listMacros();
        const target = allMacros.find(m => m.id === macroId);
        if (!target) return { success: false, error: 'Macro introuvable' };

        if (!this.botService || !this.botService.client?.user) {
            return { success: false, error: 'Client Discord non connecté' };
        }

        this.isRunning = true;
        this.shouldCancel = false;
        
        // Auto capture snapshot for possible rollback
        this.captureSnapshot();

        appBus.emitTyped('macro:start', { macroId: target.id, name: target.name });
        appBus.audit('EXECUTE_MACRO', 'ALLOW', `Lancement du scénario '${target.name}' (${target.steps.length} étapes)`, { macroId }, this.botService.client.user?.tag);
        this.logCallback(`⚡ Démarrage du scénario : '${target.name}' (${target.steps.length} étapes)...`, 'info');

        try {
            for (let i = 0; i < target.steps.length; i++) {
                if (this.shouldCancel) {
                    this.logCallback(`[Macro] Exécution interrompue par l'utilisateur.`, 'warning');
                    appBus.emitTyped('macro:finish', { macroId: target.id, success: false, error: 'Interrompu' });
                    break;
                }

                const step = target.steps[i];
                const label = step.label || step.type;
                appBus.emitTyped('macro:step', { macroId: target.id, stepIndex: i + 1, totalSteps: target.steps.length, label });
                this.logCallback(`[Macro] [${i + 1}/${target.steps.length}] ${label}...`, 'info');
                await this.executeStep(step);
            }

            if (!this.shouldCancel) {
                this.logCallback(`🎉 Scénario '${target.name}' exécuté avec succès !`, 'success');
                appBus.emitTyped('macro:finish', { macroId: target.id, success: true });
            }
            return { success: true };
        } catch (err: any) {
            this.logCallback(`❌ Erreur dans le scénario : ${err.message}`, 'error');
            appBus.emitTyped('macro:finish', { macroId: target.id, success: false, error: err.message });
            return { success: false, error: err.message };
        } finally {
            this.isRunning = false;
            this.shouldCancel = false;
        }
    }

    private async executeStep(step: MacroStep) {
        if (!this.botService) return;
        const client = this.botService.client;

        switch (step.type) {
            case 'status': {
                const status = step.params.status || 'online';
                const customText = step.params.customText !== undefined ? step.params.customText : '';
                (client.user as any).setStatus(status);
                if (customText !== undefined) {
                    await (client as any).settings.setCustomStatus({ text: customText });
                }
                break;
            }

            case 'fake_activity': {
                const type = step.params.type || 'play';
                const title = step.params.title || 'Opsec PRO';
                let actType: any = 'PLAYING';
                let streamUrl: string | undefined = undefined;

                if (type === 'stream') {
                    actType = 'STREAMING';
                    streamUrl = 'https://www.twitch.tv/discord';
                } else if (type === 'listen') actType = 'LISTENING';
                else if (type === 'watch') actType = 'WATCHING';
                else if (type === 'compete') actType = 'COMPETING';

                (client.user as any).setPresence({
                    activities: [{
                        name: title,
                        type: actType,
                        url: streamUrl
                    }]
                });
                break;
            }

            case 'hypesquad': {
                const house = step.params.house || 'bravery';
                let houseId = 1;
                if (house === 'bravery') houseId = 1;
                else if (house === 'brilliance') houseId = 2;
                else if (house === 'balance') houseId = 3;
                else if (house === 'none') houseId = 0;

                if (houseId > 0) {
                    await (client as any).api.hypesquad.online.post({ data: { house_id: houseId } });
                } else {
                    await (client as any).api.hypesquad.online.delete();
                }
                break;
            }

            case 'leave_groups': {
                await this.botService.leaveGroups([]);
                break;
            }

            case 'purge': {
                const channelId = step.params.channelId;
                const count = step.params.count || 10;
                if (channelId) {
                    await this.botService.purgeMessages(channelId, count, false, 600);
                }
                break;
            }

            case 'voice_join': {
                const channelId = step.params.channelId;
                if (channelId && this.botService.voiceStreamer) {
                    await this.botService.voiceStreamer.join(channelId);
                }
                break;
            }

            case 'voice_leave': {
                if (this.botService.voiceStreamer) {
                    await this.botService.voiceStreamer.leave();
                }
                break;
            }

            case 'delay': {
                const ms = step.params.ms || 1000;
                await new Promise(r => setTimeout(r, ms));
                break;
            }
        }
    }
}
