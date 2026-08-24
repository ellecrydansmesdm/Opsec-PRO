import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Client } from 'discord.js-selfbot-v13';
import { appBus } from './event-bus';

export interface ExportedFriend {
    id: string;
    tag: string;
    username: string;
    avatarURL: string | null;
}

export interface ExportedGuild {
    id: string;
    name: string;
    memberCount?: number;
    owner: boolean;
    iconURL: string | null;
}

export interface FullAccountExport {
    exportedAt: number;
    account: {
        id: string;
        tag: string;
        username: string;
        createdAt: number;
    };
    friends: ExportedFriend[];
    guilds: ExportedGuild[];
}

export class AccountDataExporter {
    private static instance: AccountDataExporter;
    private exportDir: string;

    private constructor() {
        const userDataPath = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.data');
        this.exportDir = path.join(userDataPath, 'exports');
        if (!fs.existsSync(this.exportDir)) {
            try { fs.mkdirSync(this.exportDir, { recursive: true }); } catch (_) {}
        }
    }

    public static getInstance(): AccountDataExporter {
        if (!AccountDataExporter.instance) {
            AccountDataExporter.instance = new AccountDataExporter();
        }
        return AccountDataExporter.instance;
    }

    /**
     * Exports full account relationships and servers snapshot to a JSON backup file
     */
    public async exportAccountSnapshot(client: Client): Promise<{ success: boolean; filePath?: string; data?: FullAccountExport; error?: string }> {
        if (!client || !client.user) {
            return { success: false, error: 'Client non connecté' };
        }

        try {
            const user = client.user;
            const friends: ExportedFriend[] = [];
            const guilds: ExportedGuild[] = [];

            // 1. Gather Friends / Relationships
            if ((client as any).relationships?.cache) {
                (client as any).relationships.cache.forEach((relUser: any) => {
                    friends.push({
                        id: relUser.id,
                        tag: relUser.tag || relUser.username,
                        username: relUser.username,
                        avatarURL: typeof relUser.displayAvatarURL === 'function' ? relUser.displayAvatarURL({ format: 'png' }) : null
                    });
                });
            }

            // 2. Gather Guilds
            if (client.guilds?.cache) {
                client.guilds.cache.forEach((g) => {
                    guilds.push({
                        id: g.id,
                        name: g.name,
                        memberCount: g.memberCount,
                        owner: g.ownerId === user.id,
                        iconURL: g.iconURL({ format: 'png' })
                    });
                });
            }

            const exportPayload: FullAccountExport = {
                exportedAt: Date.now(),
                account: {
                    id: user.id,
                    tag: user.tag,
                    username: user.username,
                    createdAt: user.createdTimestamp
                },
                friends,
                guilds
            };

            const fileName = `export_${user.id}_${Date.now()}.json`;
            const filePath = path.join(this.exportDir, fileName);
            fs.writeFileSync(filePath, JSON.stringify(exportPayload, null, 2), 'utf-8');

            appBus.audit('ACCOUNT_EXPORT', 'ALLOW', `Export complet du compte ${user.tag} (${friends.length} amis, ${guilds.length} serveurs)`, { filePath }, user.tag);
            return { success: true, filePath, data: exportPayload };
        } catch (err: any) {
            appBus.error(`Échec de l'export de compte: ${err.message}`, 'EXPORTER');
            return { success: false, error: err.message };
        }
    }
}

export const accountDataExporter = AccountDataExporter.getInstance();
