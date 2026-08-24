import { Client, Message } from 'discord.js-selfbot-v13';

export interface SnipedMessage {
    id: string;
    author: {
        id: string;
        tag: string;
        avatar: string | null;
    };
    content: string;
    attachments: string[];
    embeds: any[];
    channelId: string;
    guildId: string | null;
    deletedAt: number;
}

export interface EditedMessage {
    id: string;
    author: {
        id: string;
        tag: string;
        avatar: string | null;
    };
    oldContent: string;
    newContent: string;
    channelId: string;
    guildId: string | null;
    editedAt: number;
}

export class MessageLogger {
    private client: Client;
    private deletedCache: Map<string, SnipedMessage[]> = new Map(); // channelId -> SnipedMessage[]
    private editedCache: Map<string, EditedMessage[]> = new Map(); // channelId -> EditedMessage[]
    private readonly MAX_PER_CHANNEL = 20;

    private boundDelete = (message: any) => this.onDelete(message);
    private boundUpdate = (oldMsg: any, newMsg: any) => this.onUpdate(oldMsg, newMsg);

    constructor(client: Client) {
        this.client = client;
        this.setupListeners();
    }

    public setClient(newClient: Client) {
        this.removeListeners();
        this.client = newClient;
        this.setupListeners();
    }

    private setupListeners() {
        if (!this.client) return;
        this.client.on('messageDelete', this.boundDelete);
        this.client.on('messageUpdate', this.boundUpdate);
    }

    private removeListeners() {
        if (!this.client) return;
        this.client.off('messageDelete', this.boundDelete);
        this.client.off('messageUpdate', this.boundUpdate);
    }

    private onDelete(message: any) {
        try {
            if (!message || !message.channelId) return;
            // Ignore bots if desired or keep all
            const author = message.author ? {
                id: message.author.id,
                tag: message.author.tag || message.author.username || 'Inconnu',
                avatar: message.author.displayAvatarURL ? message.author.displayAvatarURL() : null
            } : { id: 'unknown', tag: 'Inconnu', avatar: null };

            const attachments = message.attachments ? Array.from(message.attachments.values()).map((a: any) => a.url || a.proxyURL) : [];
            const embeds = message.embeds ? message.embeds.map((e: any) => (e.toJSON ? e.toJSON() : e)) : [];

            const sniped: SnipedMessage = {
                id: message.id || String(Date.now()),
                author,
                content: message.content || '',
                attachments,
                embeds,
                channelId: message.channelId,
                guildId: message.guildId || (message.guild?.id) || null,
                deletedAt: Date.now()
            };

            const list = this.deletedCache.get(message.channelId) || [];
            list.unshift(sniped);
            if (list.length > this.MAX_PER_CHANNEL) list.pop();
            this.deletedCache.set(message.channelId, list);
        } catch (e) {
            console.error('[MessageLogger] Erreur onDelete:', e);
        }
    }

    private onUpdate(oldMsg: any, newMsg: any) {
        try {
            if (!oldMsg || !newMsg || !oldMsg.channelId) return;
            if (oldMsg.content === newMsg.content) return;

            const author = newMsg.author || oldMsg.author ? {
                id: (newMsg.author || oldMsg.author).id,
                tag: (newMsg.author || oldMsg.author).tag || (newMsg.author || oldMsg.author).username || 'Inconnu',
                avatar: (newMsg.author || oldMsg.author).displayAvatarURL ? (newMsg.author || oldMsg.author).displayAvatarURL() : null
            } : { id: 'unknown', tag: 'Inconnu', avatar: null };

            const edited: EditedMessage = {
                id: newMsg.id || oldMsg.id,
                author,
                oldContent: oldMsg.content || '',
                newContent: newMsg.content || '',
                channelId: newMsg.channelId || oldMsg.channelId,
                guildId: newMsg.guildId || oldMsg.guildId || null,
                editedAt: Date.now()
            };

            const list = this.editedCache.get(edited.channelId) || [];
            list.unshift(edited);
            if (list.length > this.MAX_PER_CHANNEL) list.pop();
            this.editedCache.set(edited.channelId, list);
        } catch (e) {
            console.error('[MessageLogger] Erreur onUpdate:', e);
        }
    }

    public getSnipe(channelId: string, index: number = 0): SnipedMessage | null {
        const list = this.deletedCache.get(channelId);
        if (!list || list.length === 0) return null;
        return list[Math.min(index, list.length - 1)] || null;
    }

    public getEditSnipe(channelId: string, index: number = 0): EditedMessage | null {
        const list = this.editedCache.get(channelId);
        if (!list || list.length === 0) return null;
        return list[Math.min(index, list.length - 1)] || null;
    }

    public getAllSnipes(channelId: string): SnipedMessage[] {
        return this.deletedCache.get(channelId) || [];
    }

    public clear(channelId?: string) {
        if (channelId) {
            this.deletedCache.delete(channelId);
            this.editedCache.delete(channelId);
        } else {
            this.deletedCache.clear();
            this.editedCache.clear();
        }
    }
}
