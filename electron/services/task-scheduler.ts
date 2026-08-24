import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Client } from 'discord.js-selfbot-v13';
import { appBus } from './event-bus';
import { policyEngine } from './policy-engine';

export type ScheduledTaskType = 'auto_bump' | 'scheduled_message' | 'status_cycle' | 'custom';

export interface ScheduledTask {
    id: string;
    name: string;
    type: ScheduledTaskType;
    intervalMinutes: number;
    jitterSeconds?: number;
    enabled: boolean;
    channelId?: string;
    payload?: string;
    lastRun?: number;
    nextRun?: number;
    runCount: number;
}

export class TaskScheduler {
    private static instance: TaskScheduler;
    private tasks: Map<string, ScheduledTask> = new Map();
    private activeTimers: Map<string, NodeJS.Timeout> = new Map();
    private client: Client | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void = () => {};
    private configFilePath: string;

    private constructor() {
        const userDataPath = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.data');
        this.configFilePath = path.join(userDataPath, 'scheduled_tasks.json');
        this.loadTasks();
    }

    public static getInstance(): TaskScheduler {
        if (!TaskScheduler.instance) {
            TaskScheduler.instance = new TaskScheduler();
        }
        return TaskScheduler.instance;
    }

    public setClient(client: Client, logCallback?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.client = client;
        if (logCallback) this.logCallback = logCallback;
        this.startAllEnabledTasks();
    }

    private loadTasks() {
        try {
            if (fs.existsSync(this.configFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
                if (Array.isArray(data)) {
                    this.tasks.clear();
                    data.forEach(t => this.tasks.set(t.id, t));
                }
            }
        } catch (_) {}
    }

    private saveTasks() {
        try {
            const list = Array.from(this.tasks.values());
            fs.writeFileSync(this.configFilePath, JSON.stringify(list, null, 2), 'utf-8');
        } catch (_) {}
    }

    public listTasks(): ScheduledTask[] {
        return Array.from(this.tasks.values());
    }

    public addTask(task: Omit<ScheduledTask, 'runCount'>): ScheduledTask {
        const fullTask: ScheduledTask = {
            ...task,
            runCount: 0,
            nextRun: Date.now() + (task.intervalMinutes * 60 * 1000)
        };
        this.tasks.set(fullTask.id, fullTask);
        this.saveTasks();

        if (fullTask.enabled) {
            this.scheduleNextExecution(fullTask);
        }
        return fullTask;
    }

    public removeTask(taskId: string): boolean {
        this.stopTaskTimer(taskId);
        const deleted = this.tasks.delete(taskId);
        this.saveTasks();
        return deleted;
    }

    public toggleTask(taskId: string, enabled: boolean): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        task.enabled = enabled;
        if (enabled) {
            this.scheduleNextExecution(task);
        } else {
            this.stopTaskTimer(taskId);
            task.nextRun = undefined;
        }
        this.saveTasks();
        return true;
    }

    private startAllEnabledTasks() {
        for (const task of this.tasks.values()) {
            if (task.enabled) {
                this.scheduleNextExecution(task);
            }
        }
    }

    private stopTaskTimer(taskId: string) {
        if (this.activeTimers.has(taskId)) {
            clearTimeout(this.activeTimers.get(taskId)!);
            this.activeTimers.delete(taskId);
        }
    }

    private scheduleNextExecution(task: ScheduledTask) {
        this.stopTaskTimer(task.id);

        const baseDelayMs = Math.max(10000, task.intervalMinutes * 60 * 1000);
        const jitterMs = (task.jitterSeconds || 0) > 0 
            ? Math.floor(Math.random() * (task.jitterSeconds! * 1000))
            : 0;

        const totalDelay = baseDelayMs + jitterMs;
        task.nextRun = Date.now() + totalDelay;

        const timer = setTimeout(async () => {
            await this.executeTask(task);
            if (task.enabled) {
                this.scheduleNextExecution(task);
            }
        }, totalDelay);

        this.activeTimers.set(task.id, timer);
    }

    public async executeTask(task: ScheduledTask): Promise<{ success: boolean; error?: string }> {
        if (!this.client || !this.client.user) {
            return { success: false, error: 'Client Discord non connecté' };
        }

        const verdict = policyEngine.checkAction('TASK_EXECUTION', this.client.user.tag);
        if (verdict.verdict === 'DENY') {
            appBus.warn(`Tâche [${task.name}] ignorée (Rate-limit de sécurité)`, 'SCHEDULER');
            return { success: false, error: verdict.reason };
        }

        this.logCallback(`[Scheduler] ⏰ Exécution de la tâche : '${task.name}'...`, 'info');

        try {
            if (task.type === 'auto_bump') {
                if (!task.channelId) return { success: false, error: 'Salon non spécifié pour Auto-Bump' };
                const channel = await this.client.channels.fetch(task.channelId).catch(() => null);
                if (channel && channel.isText()) {
                    // Send slash command /bump or fallback message
                    try {
                        await (channel as any).sendSlash('302050872383242240', 'bump');
                    } catch (_) {
                        await (channel as any).send('!d bump');
                    }
                    this.logCallback(`[Scheduler] 🚀 Auto-Bump envoyé dans #${(channel as any).name}`, 'success');
                }
            } else if (task.type === 'scheduled_message') {
                if (!task.channelId || !task.payload) return { success: false, error: 'Salon ou texte manquant' };
                const channel = await this.client.channels.fetch(task.channelId).catch(() => null);
                if (channel && channel.isText()) {
                    await (channel as any).send(task.payload);
                    this.logCallback(`[Scheduler] ✉️ Message programmé envoyé dans #${(channel as any).name}`, 'success');
                }
            } else if (task.type === 'status_cycle') {
                if (task.payload) {
                    await (this.client as any).settings.setCustomStatus({ text: task.payload });
                    this.logCallback(`[Scheduler] 💬 Statut cyclique mis à jour : "${task.payload}"`, 'info');
                }
            }

            task.lastRun = Date.now();
            task.runCount++;
            this.saveTasks();

            appBus.audit('TASK_EXECUTION', 'ALLOW', `Tâche planifiée exécutée avec succès : ${task.name}`, { taskId: task.id }, this.client.user.tag);
            return { success: true };
        } catch (err: any) {
            this.logCallback(`[Scheduler] ❌ Erreur tâche '${task.name}': ${err.message}`, 'error');
            appBus.audit('TASK_EXECUTION', 'WARN', `Erreur sur tâche ${task.name}: ${err.message}`, { taskId: task.id }, this.client.user.tag);
            return { success: false, error: err.message };
        }
    }

    public stopAll() {
        for (const timer of this.activeTimers.values()) {
            clearTimeout(timer);
        }
        this.activeTimers.clear();
    }
}

export const taskScheduler = TaskScheduler.getInstance();
