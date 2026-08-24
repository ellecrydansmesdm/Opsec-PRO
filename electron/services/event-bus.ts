import { EventEmitter } from 'events';

export type LogLevel = 'debug' | 'operational' | 'security';
export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface AuditLogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    type: LogType;
    category: string;
    message: string;
    details?: Record<string, any>;
    accountTag?: string;
}

export interface AppEventMap {
    'log': AuditLogEntry;
    'auth:license-validated': { key: string; hwid: string; durationDays: number };
    'account:login-success': { userId: string; tag: string };
    'account:logout': { userId?: string };
    'voice:status': { connected: boolean; channelId?: string; playing?: boolean; title?: string };
    'inchat:command': { command: string; authorId: string; channelId: string; success: boolean };
    'macro:start': { macroId: string; name: string };
    'macro:step': { macroId: string; stepIndex: number; totalSteps: number; label: string };
    'macro:finish': { macroId: string; success: boolean; error?: string };
    'sniper:claim': { type: 'nitro' | 'vanity'; code: string; speedMs: number; success: boolean };
    'security:audit': { action: string; policy: 'ALLOW' | 'WARN' | 'DENY'; details?: any };
    'update:found': { version: string; url?: string };
}

export class AppEventBus extends EventEmitter {
    private static instance: AppEventBus;
    private logHistory: AuditLogEntry[] = [];
    private readonly MAX_HISTORY = 500;
    private externalLogSink: ((entry: AuditLogEntry) => void) | null = null;

    private constructor() {
        super();
        this.setMaxListeners(50);
    }

    public static getInstance(): AppEventBus {
        if (!AppEventBus.instance) {
            AppEventBus.instance = new AppEventBus();
        }
        return AppEventBus.instance;
    }

    public setLogSink(sink: (entry: AuditLogEntry) => void) {
        this.externalLogSink = sink;
    }

    public emitTyped<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): boolean {
        return this.emit(event as string, data);
    }

    public onTyped<K extends keyof AppEventMap>(event: K, listener: (data: AppEventMap[K]) => void): () => void {
        this.on(event as string, listener);
        return () => {
            this.off(event as string, listener);
        };
    }

    public offTyped<K extends keyof AppEventMap>(event: K, listener: (data: AppEventMap[K]) => void): this {
        return this.off(event as string, listener);
    }

    /**
     * 3-Tier Structured Logger
     */
    public log(
        message: string, 
        type: LogType = 'info', 
        level: LogLevel = 'operational', 
        category: string = 'SYSTEM',
        details?: Record<string, any>,
        accountTag?: string
    ) {
        const entry: AuditLogEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: Date.now(),
            level,
            type,
            category,
            message,
            details,
            accountTag
        };

        this.logHistory.push(entry);
        if (this.logHistory.length > this.MAX_HISTORY) {
            this.logHistory.shift();
        }

        this.emit('log', entry);

        if (this.externalLogSink) {
            this.externalLogSink(entry);
        }
    }

    public debug(msg: string, category: string = 'GATEWAY', details?: any) {
        this.log(msg, 'info', 'debug', category, details);
    }

    public info(msg: string, category: string = 'OPSEC') {
        this.log(msg, 'info', 'operational', category);
    }

    public success(msg: string, category: string = 'OPSEC') {
        this.log(msg, 'success', 'operational', category);
    }

    public warn(msg: string, category: string = 'OPSEC', details?: any) {
        this.log(msg, 'warning', 'operational', category, details);
    }

    public error(msg: string, category: string = 'OPSEC', details?: any) {
        this.log(msg, 'error', 'operational', category, details);
    }

    public audit(action: string, policy: 'ALLOW' | 'WARN' | 'DENY', message: string, details?: any, accountTag?: string) {
        this.emitTyped('security:audit', { action, policy, details });
        this.log(
            `[SECURITY ${policy}] ${message}`, 
            policy === 'DENY' ? 'error' : policy === 'WARN' ? 'warning' : 'success', 
            'security', 
            'POLICY', 
            { action, policy, ...details },
            accountTag
        );
    }

    public getHistory(level?: LogLevel): AuditLogEntry[] {
        if (!level) return [...this.logHistory];
        return this.logHistory.filter(l => l.level === level);
    }
}

export const appBus = AppEventBus.getInstance();
