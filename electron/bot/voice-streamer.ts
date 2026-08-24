import { Client, VoiceChannel, StageChannel } from 'discord.js-selfbot-v13';
import fs from 'fs';
import path from 'path';
import { appBus } from '../services/event-bus';

export interface VoiceStreamerStatus {
    connected: boolean;
    channelId: string | null;
    channelName: string | null;
    guildName: string | null;
    playing: boolean;
    currentTrack: string | null;
    volume: number;
    autoReconnect: boolean;
}

export class VoiceStreamer {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    private connection: any = null;
    private currentChannelId: string | null = null;
    private currentChannelName: string | null = null;
    private currentGuildName: string | null = null;
    private isPlaying: boolean = false;
    private currentTrack: string | null = null;
    private volume: number = 100;
    
    // Auto-reconnect 24/7 persistence
    public autoReconnect: boolean = true;
    private isReconnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.client = client;
        this.logCallback = logCallback;
        this.setupVoiceListeners();
    }

    public setClient(newClient: Client) {
        this.cleanup();
        this.client = newClient;
        this.setupVoiceListeners();
    }

    private setupVoiceListeners() {
        if (!this.client) return;

        // Auto-healing listener on voice state update
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            if (!this.currentChannelId || !this.client.user) return;
            if (oldState.id !== this.client.user.id) return;

            // If disconnected unintentionally and autoReconnect is active
            if (oldState.channelId === this.currentChannelId && !newState.channelId && this.autoReconnect && !this.isReconnecting) {
                this.logCallback(`[Voice 24/7] ⚠️ Déconnexion inattendue détectée. Tentative de reconnexion auto...`, 'warning');
                this.scheduleReconnect();
            }
        });
    }

    private scheduleReconnect() {
        if (this.isReconnecting || !this.currentChannelId) return;
        this.isReconnecting = true;
        this.reconnectAttempts++;

        const delay = Math.min(30000, 1000 * Math.pow(1.5, this.reconnectAttempts));
        this.logCallback(`[Voice 24/7] Reconnexion programmée dans ${(delay / 1000).toFixed(1)}s (tentative #${this.reconnectAttempts})...`, 'info');

        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(async () => {
            if (this.currentChannelId) {
                const targetId = this.currentChannelId;
                const res = await this.join(targetId, false);
                this.isReconnecting = false;
                if (res.success) {
                    this.reconnectAttempts = 0;
                    this.logCallback(`[Voice 24/7] ✅ Reconnexion vocale 24/7 réussie !`, 'success');
                } else {
                    this.scheduleReconnect();
                }
            } else {
                this.isReconnecting = false;
            }
        }, delay);
    }

    public getStatus(): VoiceStreamerStatus {
        return {
            connected: !!this.connection,
            channelId: this.currentChannelId,
            channelName: this.currentChannelName,
            guildName: this.currentGuildName,
            playing: this.isPlaying,
            currentTrack: this.currentTrack,
            volume: this.volume,
            autoReconnect: this.autoReconnect
        };
    }

    public async join(channelId: string, resetReconnect: boolean = true): Promise<{ success: boolean; error?: string }> {
        if (!this.client?.user) return { success: false, error: 'Client non connecté' };

        if (resetReconnect) {
            this.reconnectAttempts = 0;
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        }

        try {
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            if (!channel || (!channel.isVoice() && (channel.type as any) !== 'GUILD_VOICE' && (channel.type as any) !== 'GUILD_STAGE_VOICE')) {
                return { success: false, error: 'Salon vocal introuvable' };
            }

            const voiceChan = channel as VoiceChannel | StageChannel;
            this.logCallback(`[Voice Streamer] Connexion au salon vocal : ${voiceChan.name}...`, 'info');

            // Join voice channel via selfbot connection with self-deafen
            if (typeof (voiceChan as any).join === 'function') {
                this.connection = await (voiceChan as any).join({ selfDeaf: true });
            } else {
                this.connection = { channel: voiceChan };
            }

            this.currentChannelId = voiceChan.id;
            this.currentChannelName = voiceChan.name;
            this.currentGuildName = voiceChan.guild?.name || 'Serveur';

            appBus.emitTyped('voice:status', { 
                connected: true, 
                channelId: voiceChan.id, 
                playing: this.isPlaying, 
                title: this.currentTrack || undefined 
            });
            appBus.audit('VOICE_JOIN', 'ALLOW', `Connexion au salon vocal '${voiceChan.name}' (${this.currentGuildName})`, { channelId }, this.client.user.tag);

            this.logCallback(`[Voice Streamer] 🎙️ Connecté à ${voiceChan.name} (${this.currentGuildName}) !`, 'success');
            return { success: true };
        } catch (err: any) {
            this.logCallback(`[Voice Streamer] ❌ Échec de connexion : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    public async leave(): Promise<{ success: boolean }> {
        this.autoReconnect = false;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        try {
            if (this.currentChannelId && this.client) {
                const channel = this.client.channels.cache.get(this.currentChannelId);
                if (channel && typeof (channel as any).leave === 'function') {
                    (channel as any).leave();
                }
            }
            if (this.connection && typeof this.connection.disconnect === 'function') {
                this.connection.disconnect();
            }
        } catch (_) {}

        this.cleanup();
        appBus.emitTyped('voice:status', { connected: false });
        this.logCallback(`[Voice Streamer] 🚪 Déconnecté du salon vocal.`, 'warning');
        return { success: true };
    }

    private cleanup() {
        this.connection = null;
        this.currentChannelId = null;
        this.currentChannelName = null;
        this.currentGuildName = null;
        this.isPlaying = false;
        this.currentTrack = null;
        this.isReconnecting = false;
    }

    public async play(audioSource: string): Promise<{ success: boolean; error?: string }> {
        if (!this.connection) {
            return { success: false, error: 'Veuillez d\'abord rejoindre un salon vocal' };
        }

        try {
            const trackName = path.basename(audioSource);
            this.logCallback(`[Voice Streamer] 🎵 Lecture de : ${trackName}...`, 'info');

            if (typeof this.connection.play === 'function') {
                const dispatcher = this.connection.play(audioSource, { volume: this.volume / 100 });
                dispatcher.on('finish', () => {
                    this.isPlaying = false;
                    this.currentTrack = null;
                    appBus.emitTyped('voice:status', { connected: true, playing: false });
                    this.logCallback(`[Voice Streamer] ✅ Fin de la lecture de : ${trackName}`, 'info');
                });
                dispatcher.on('error', (err: any) => {
                    this.isPlaying = false;
                    this.currentTrack = null;
                    appBus.emitTyped('voice:status', { connected: true, playing: false });
                    this.logCallback(`[Voice Streamer] ❌ Erreur lecture : ${err.message}`, 'error');
                });
            }

            this.isPlaying = true;
            this.currentTrack = trackName;
            appBus.emitTyped('voice:status', { connected: true, playing: true, title: trackName });
            return { success: true };
        } catch (err: any) {
            this.isPlaying = false;
            this.logCallback(`[Voice Streamer] ❌ Échec lecture : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    public stop(): { success: boolean } {
        if (this.connection && this.connection.dispatcher) {
            try { this.connection.dispatcher.destroy(); } catch (_) {}
        }
        this.isPlaying = false;
        this.currentTrack = null;
        appBus.emitTyped('voice:status', { connected: !!this.connection, playing: false });
        this.logCallback(`[Voice Streamer] ⏹️ Lecture arrêtée.`, 'info');
        return { success: true };
    }

    public setVolume(vol: number): { success: boolean } {
        this.volume = Math.max(0, Math.min(200, vol));
        if (this.connection && this.connection.dispatcher) {
            try {
                this.connection.dispatcher.setVolume(this.volume / 100);
            } catch (_) {}
        }
        this.logCallback(`[Voice Streamer] 🔊 Volume réglé à ${this.volume}%`, 'info');
        return { success: true };
    }
}
