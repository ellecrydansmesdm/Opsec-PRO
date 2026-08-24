import { Client, Guild, Role, TextChannel, VoiceChannel, CategoryChannel, Permissions } from 'discord.js-selfbot-v13';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { appBus } from '../services/event-bus';

export interface RoleBackup {
    id: string;
    name: string;
    color: number;
    hoist: boolean;
    permissions: string;
    mentionable: boolean;
    position: number;
    icon?: string | null;
    unicodeEmoji?: string | null;
}

export interface ChannelOverwriteBackup {
    roleName?: string;
    isEveryone?: boolean;
    allow: string;
    deny: string;
    type: number; // 0 for role, 1 for member
}

export interface ChannelBackup {
    name: string;
    type: 'GUILD_TEXT' | 'GUILD_VOICE' | 'GUILD_NEWS' | 'GUILD_STORE' | 'GUILD_STAGE_VOICE';
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    bitrate?: number;
    userLimit?: number;
    parentCategory?: string | null;
    position: number;
    overwrites: ChannelOverwriteBackup[];
}

export interface CategoryBackup {
    name: string;
    position: number;
    overwrites: ChannelOverwriteBackup[];
}

export interface EmojiBackup {
    name: string;
    url: string;
    roles?: string[];
}

export interface StickerBackup {
    name: string;
    description?: string;
    tags: string;
    url: string;
}

export interface GuildBackupData {
    id: string;
    name: string;
    icon?: string | null;
    banner?: string | null;
    description?: string | null;
    afkTimeout?: number;
    verificationLevel?: string | number;
    createdAt: number;
    roles: RoleBackup[];
    categories: CategoryBackup[];
    channels: ChannelBackup[];
    emojis?: EmojiBackup[];
    stickers?: StickerBackup[];
}

export class GuildCloner {
    private client: Client;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    private backupDir: string;
    public isCloning: boolean = false;

    constructor(client: Client, logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void) {
        this.client = client;
        this.logCallback = logCallback;
        const userDataPath = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.data');
        this.backupDir = path.join(userDataPath, 'guild_backups');
        if (!fs.existsSync(this.backupDir)) {
            try { fs.mkdirSync(this.backupDir, { recursive: true }); } catch (_) {}
        }
    }

    public setClient(newClient: Client) {
        this.client = newClient;
    }

    public stop() {
        this.isCloning = false;
    }

    public async createBackup(guildId: string): Promise<{ success: boolean; data?: GuildBackupData; error?: string }> {
        if (!this.client?.user) return { success: false, error: 'Client non connecté' };

        try {
            const guild = await this.client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return { success: false, error: 'Serveur introuvable ou accès refusé' };

            this.logCallback(`[Cloner] Création de la sauvegarde pour : ${guild.name}...`, 'info');

            // 1. Roles Backup (Topological position order ascending: 0 is everyone, then lowest to highest)
            const roles: RoleBackup[] = guild.roles.cache
                .filter(r => !r.managed)
                .sort((a, b) => a.position - b.position)
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    permissions: r.permissions.bitfield.toString(),
                    mentionable: r.mentionable,
                    position: r.position,
                    icon: (r as any).iconURL ? (r as any).iconURL() : null,
                    unicodeEmoji: (r as any).unicodeEmoji || null
                }));

            // 2. Categories & Channels Backup
            const categories: CategoryBackup[] = [];
            const channels: ChannelBackup[] = [];

            const roleNameMap = new Map<string, string>();
            guild.roles.cache.forEach(r => roleNameMap.set(r.id, r.name));

            const rawChannels = Array.from(guild.channels.cache.values());

            for (const chan of rawChannels) {
                const overwrites: ChannelOverwriteBackup[] = [];
                if ((chan as any).permissionOverwrites) {
                    (chan as any).permissionOverwrites.cache.forEach((ov: any) => {
                        const isEveryone = ov.id === guild.id;
                        const roleName = isEveryone ? '@everyone' : (ov.type === 'role' || ov.type === 0 ? roleNameMap.get(ov.id) : undefined);
                        
                        overwrites.push({
                            roleName,
                            isEveryone,
                            allow: ov.allow ? ov.allow.bitfield.toString() : '0',
                            deny: ov.deny ? ov.deny.bitfield.toString() : '0',
                            type: ov.type === 'role' || ov.type === 0 ? 0 : 1
                        });
                    });
                }

                if (chan.type === 'GUILD_CATEGORY') {
                    categories.push({
                        name: chan.name,
                        position: chan.position,
                        overwrites
                    });
                } else if (chan.type === 'GUILD_TEXT' || chan.type === 'GUILD_VOICE' || chan.type === 'GUILD_NEWS' || chan.type === 'GUILD_STAGE_VOICE') {
                    const parentCat = chan.parentId ? guild.channels.cache.get(chan.parentId)?.name || null : null;
                    channels.push({
                        name: chan.name,
                        type: chan.type as any,
                        topic: (chan as any).topic || null,
                        nsfw: (chan as any).nsfw || false,
                        rateLimitPerUser: (chan as any).rateLimitPerUser || 0,
                        bitrate: (chan as any).bitrate || undefined,
                        userLimit: (chan as any).userLimit || undefined,
                        parentCategory: parentCat,
                        position: chan.position,
                        overwrites
                    });
                }
            }

            const emojis: EmojiBackup[] = guild.emojis?.cache ? Array.from(guild.emojis.cache.values()).map(e => ({
                name: e.name || 'emoji',
                url: e.url,
                roles: e.roles?.cache ? Array.from(e.roles.cache.values()).map(r => r.name) : []
            })) : [];

            const stickers: StickerBackup[] = guild.stickers?.cache ? Array.from(guild.stickers.cache.values()).map(s => ({
                name: s.name,
                description: s.description || undefined,
                tags: Array.isArray(s.tags) ? s.tags.join(',') : (s.tags || ''),
                url: s.url
            })) : [];

            const backupData: GuildBackupData = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ format: 'png', dynamic: true, size: 512 }),
                banner: (guild as any).bannerURL ? (guild as any).bannerURL({ format: 'png', size: 1024 }) : null,
                description: (guild as any).description || null,
                afkTimeout: guild.afkTimeout,
                verificationLevel: guild.verificationLevel,
                createdAt: Date.now(),
                roles,
                categories: categories.sort((a, b) => a.position - b.position),
                channels: channels.sort((a, b) => a.position - b.position),
                emojis,
                stickers
            };

            const fileName = `backup_${guild.id}_${Date.now()}.json`;
            const filePath = path.join(this.backupDir, fileName);
            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

            appBus.audit('GUILD_BACKUP', 'ALLOW', `Sauvegarde de ${guild.name} (${roles.length} rôles, ${channels.length} salons, ${emojis.length} emojis)`, { guildId, guildName: guild.name }, this.client.user.tag);
            this.logCallback(`[Cloner] Sauvegarde réussie (${roles.length} rôles, ${channels.length} salons, ${emojis.length} emojis) !`, 'success');
            return { success: true, data: backupData };
        } catch (err: any) {
            this.logCallback(`[Cloner] Échec de la sauvegarde : ${err.message}`, 'error');
            return { success: false, error: err.message };
        }
    }

    public listBackups(): { fileName: string; data: GuildBackupData }[] {
        try {
            if (!fs.existsSync(this.backupDir)) return [];
            const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
            const list: { fileName: string; data: GuildBackupData }[] = [];

            for (const file of files) {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(this.backupDir, file), 'utf-8'));
                    list.push({ fileName: file, data: content });
                } catch (_) {}
            }

            return list.sort((a, b) => b.data.createdAt - a.data.createdAt);
        } catch (e) {
            return [];
        }
    }

    public async loadBackupFromFile(fileName: string): Promise<GuildBackupData | null> {
        try {
            const filePath = path.join(this.backupDir, fileName);
            if (!fs.existsSync(filePath)) return null;
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            return null;
        }
    }

    /**
     * Deterministic Guild Hierarchy Cloner (Topological Rebuilding Engine)
     */
    public async cloneGuild(
        backup: GuildBackupData, 
        targetGuildId: string, 
        options: { clearExisting?: boolean; delayMs?: number } = {}
    ): Promise<{ success: boolean; error?: string }> {
        if (!this.client?.user) return { success: false, error: 'Client non connecté' };
        if (this.isCloning) return { success: false, error: 'Clonage déjà en cours' };

        const delayMs = Math.max(options.delayMs || 800, 400);

        try {
            const targetGuild = await this.client.guilds.fetch(targetGuildId).catch(() => null);
            if (!targetGuild) return { success: false, error: 'Serveur cible introuvable' };

            this.isCloning = true;
            appBus.audit('GUILD_CLONE_START', 'ALLOW', `Clonage déterministe vers ${targetGuild.name}`, { targetGuildId }, this.client.user.tag);
            this.logCallback(`🚀 Démarrage du clonage déterministe vers : ${targetGuild.name}...`, 'info');

            // 1. Nettoyage de l'existant si demandé
            if (options.clearExisting) {
                this.logCallback(`[Cloner] Nettoyage des salons existants sur la cible...`, 'warning');
                for (const chan of Array.from(targetGuild.channels.cache.values())) {
                    if (!this.isCloning) break;
                    try {
                        await chan.delete();
                        await new Promise(r => setTimeout(r, delayMs));
                    } catch (_) {}
                }

                this.logCallback(`[Cloner] Nettoyage des rôles personnalisés...`, 'warning');
                for (const role of Array.from(targetGuild.roles.cache.values())) {
                    if (!this.isCloning) break;
                    if (!role.managed && role.id !== targetGuild.id && role.editable) {
                        try {
                            await role.delete();
                            await new Promise(r => setTimeout(r, delayMs));
                        } catch (_) {}
                    }
                }
            }

            // 2. Reconfiguration du rôle @everyone
            const everyoneRole = targetGuild.roles.everyone;
            const everyoneBackup = backup.roles.find(r => r.name === '@everyone' || r.position === 0);
            if (everyoneRole && everyoneBackup) {
                try {
                    await everyoneRole.setPermissions(BigInt(everyoneBackup.permissions || '0'));
                } catch (_) {}
            }

            // 3. Re-création des Rôles (Tri topologique)
            const createdRolesMap = new Map<string, Role>(); // roleName -> newRole
            createdRolesMap.set('@everyone', everyoneRole);

            const customRoles = backup.roles.filter(r => r.name !== '@everyone' && r.position > 0);
            this.logCallback(`[Cloner] Création topologique de ${customRoles.length} rôles...`, 'info');

            for (const roleData of customRoles) {
                if (!this.isCloning) break;
                try {
                    const newRole = await targetGuild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        permissions: BigInt(roleData.permissions || '0'),
                        mentionable: roleData.mentionable,
                    });
                    createdRolesMap.set(roleData.name, newRole);
                    await new Promise(r => setTimeout(r, delayMs));
                } catch (e: any) {
                    this.logCallback(`[Cloner] Erreur rôle ${roleData.name}: ${e.message}`, 'warning');
                    if (e.status === 429) {
                        const waitTime = (e.retryAfter || 5) * 1000;
                        await new Promise(r => setTimeout(r, waitTime));
                    }
                }
            }

            // 4. Re-création des Catégories
            const createdCategoriesMap = new Map<string, CategoryChannel>();
            this.logCallback(`[Cloner] Création de ${backup.categories.length} catégories...`, 'info');

            for (const catData of backup.categories) {
                if (!this.isCloning) break;
                try {
                    const catOverwrites: any[] = [];
                    for (const ov of catData.overwrites) {
                        let targetId: string | null = null;
                        if (ov.isEveryone || ov.roleName === '@everyone') {
                            targetId = everyoneRole.id;
                        } else if (ov.roleName && createdRolesMap.has(ov.roleName)) {
                            targetId = createdRolesMap.get(ov.roleName)!.id;
                        }

                        if (targetId) {
                            catOverwrites.push({
                                id: targetId,
                                allow: BigInt(ov.allow || '0'),
                                deny: BigInt(ov.deny || '0')
                            });
                        }
                    }

                    const newCat = await targetGuild.channels.create(catData.name, {
                        type: 'GUILD_CATEGORY',
                        position: catData.position,
                        permissionOverwrites: catOverwrites
                    }) as CategoryChannel;

                    createdCategoriesMap.set(catData.name, newCat);
                    await new Promise(r => setTimeout(r, delayMs));
                } catch (e: any) {
                    this.logCallback(`[Cloner] Erreur catégorie ${catData.name}: ${e.message}`, 'warning');
                }
            }

            // 5. Re-création des Salons (Text & Voice)
            this.logCallback(`[Cloner] Création de ${backup.channels.length} salons textuels & vocaux...`, 'info');

            for (const chanData of backup.channels) {
                if (!this.isCloning) break;
                try {
                    const chanOverwrites: any[] = [];
                    for (const ov of chanData.overwrites) {
                        let targetId: string | null = null;
                        if (ov.isEveryone || ov.roleName === '@everyone') {
                            targetId = everyoneRole.id;
                        } else if (ov.roleName && createdRolesMap.has(ov.roleName)) {
                            targetId = createdRolesMap.get(ov.roleName)!.id;
                        }

                        if (targetId) {
                            chanOverwrites.push({
                                id: targetId,
                                allow: BigInt(ov.allow || '0'),
                                deny: BigInt(ov.deny || '0')
                            });
                        }
                    }

                    const parentCategory = chanData.parentCategory ? createdCategoriesMap.get(chanData.parentCategory) : null;

                    await targetGuild.channels.create(chanData.name, {
                        type: chanData.type,
                        topic: chanData.topic || undefined,
                        nsfw: chanData.nsfw,
                        rateLimitPerUser: chanData.rateLimitPerUser,
                        bitrate: chanData.bitrate,
                        userLimit: chanData.userLimit,
                        parent: parentCategory ? parentCategory.id : undefined,
                        position: chanData.position,
                        permissionOverwrites: chanOverwrites
                    });

                    await new Promise(r => setTimeout(r, delayMs));
                } catch (e: any) {
                    this.logCallback(`[Cloner] Erreur salon ${chanData.name}: ${e.message}`, 'warning');
                }
            }

            appBus.audit('GUILD_CLONE_FINISH', 'ALLOW', `Clonage terminé avec succès sur ${targetGuild.name}`, { targetGuildId }, this.client.user.tag);
            this.logCallback(`🎉 Clonage terminé avec succès sur : ${targetGuild.name} !`, 'success');
            return { success: true };
        } catch (err: any) {
            this.logCallback(`❌ Échec du clonage : ${err.message}`, 'error');
            return { success: false, error: err.message };
        } finally {
            this.isCloning = false;
        }
    }
}
