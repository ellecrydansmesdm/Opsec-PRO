import { Client, Message, TextChannel } from 'discord.js-selfbot-v13';
import { MessageLogger } from './message-logger';
import { GuildCloner } from './guild-cloner';
import { VoiceStreamer } from './voice-streamer';
import { MacroService } from '../services/macro-service';
import { zeroTraceDelete } from './stealth-actions';
import { appBus } from '../services/event-bus';

export interface CommandContext {
    message: Message;
    args: string[];
    rawArgs: string;
    command: string;
    prefix: string;
}

export interface InChatCommandDefinition {
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    category?: 'general' | 'presence' | 'moderation' | 'utility' | 'server' | 'voice';
    execute: (ctx: CommandContext, dispatcher: InChatDispatcher) => Promise<void>;
}

export class InChatDispatcher {
    public client: Client;
    public messageLogger: MessageLogger;
    public guildCloner: GuildCloner;
    public voiceStreamer: VoiceStreamer | null = null;
    public macroService: MacroService | null = null;
    private logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    public prefix: string = '.';
    public enabled: boolean = true;
    public isAfk: boolean = false;
    public afkReason: string = 'AFK';
    private startTime: number = Date.now();
    private commands: Map<string, InChatCommandDefinition> = new Map();

    private boundMessageCreate = (message: Message) => this.onMessageCreate(message);

    constructor(
        client: Client, 
        messageLogger: MessageLogger, 
        guildCloner: GuildCloner, 
        logCallback: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void
    ) {
        this.client = client;
        this.messageLogger = messageLogger;
        this.guildCloner = guildCloner;
        this.logCallback = logCallback;
        this.registerBuiltinCommands();
        this.setupListeners();
    }

    public setClient(newClient: Client) {
        this.removeListeners();
        this.client = newClient;
        this.setupListeners();
    }

    private setupListeners() {
        if (!this.client) return;
        this.client.on('messageCreate', this.boundMessageCreate);
    }

    private removeListeners() {
        if (!this.client) return;
        this.client.off('messageCreate', this.boundMessageCreate);
    }

    public registerCommand(def: InChatCommandDefinition) {
        this.commands.set(def.name.toLowerCase(), def);
        if (def.aliases) {
            for (const alias of def.aliases) {
                this.commands.set(alias.toLowerCase(), def);
            }
        }
    }

    /**
     * Advanced POSIX-compliant tokenizer respecting quotes and flags
     */
    private parseArgs(content: string): string[] {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1] || match[2] || match[0]);
        }
        return matches;
    }

    public async sanitizeResponse(message: Message, resultText: string, delayMs: number = 4500) {
        try {
            await message.edit(resultText);
            setTimeout(async () => {
                await zeroTraceDelete(message);
            }, delayMs);
        } catch (err: any) {
            try {
                const sent = await message.channel.send(resultText);
                await zeroTraceDelete(message);
                setTimeout(async () => {
                    await zeroTraceDelete(sent);
                }, delayMs);
            } catch (_) {}
        }
    }

    private async onMessageCreate(message: Message) {
        if (!this.enabled || !this.client?.user) return;

        // Auto AFK response if someone mentions the user in a DM or guild
        if (this.isAfk && message.author?.id !== this.client.user.id) {
            const isMentioned = message.mentions.has(this.client.user) || message.channel.type === 'DM';
            if (isMentioned) {
                try {
                    const afkReply = await message.channel.send(`💤 *[Opsec PRO Auto-Reply]* Je suis actuellement **AFK** : *${this.afkReason}*`);
                    setTimeout(async () => {
                        try { await afkReply.delete(); } catch (_) {}
                    }, 5000);
                } catch (_) {}
            }
        }

        if (message.author?.id !== this.client.user.id) return;
        if (!message.content) return;

        let cleanContent = message.content.trim();
        const userMentionRegex = new RegExp(`^<@!?${this.client.user.id}>\\s*`);
        if (userMentionRegex.test(cleanContent)) {
            cleanContent = cleanContent.replace(userMentionRegex, '').trim();
        }

        let usedPrefix = '';
        if (this.prefix && cleanContent.startsWith(this.prefix)) {
            usedPrefix = this.prefix;
        } else if (cleanContent.startsWith('.')) {
            usedPrefix = '.';
        } else {
            return;
        }

        const raw = cleanContent.slice(usedPrefix.length).trim();
        if (!raw) return;

        const tokens = this.parseArgs(raw);
        if (tokens.length === 0) return;

        const commandName = tokens[0].toLowerCase();
        const args = tokens.slice(1);
        const rawArgs = raw.slice(commandName.length).trim();

        const ctx: CommandContext = {
            message,
            args,
            rawArgs,
            command: commandName,
            prefix: usedPrefix
        };

        const cmd = this.commands.get(commandName);
        if (!cmd) return;

        this.logCallback(`[In-Chat] ⚡ Commande reçue : '${usedPrefix}${commandName}'`, 'info');
        appBus.emitTyped('inchat:command', { 
            command: commandName, 
            authorId: message.author.id, 
            channelId: message.channel.id, 
            success: true 
        });

        try {
            await cmd.execute(ctx, this);
        } catch (err: any) {
            this.logCallback(`[In-Chat] ❌ Erreur commande '${commandName}': ${err.message}`, 'error');
            appBus.audit('INCHAT_CMD_ERROR', 'WARN', `Erreur sur '${commandName}': ${err.message}`, { command: commandName }, this.client.user?.tag);
            await this.sanitizeResponse(message, `❌ **Erreur** : ${err.message}`, 3000);
        }
    }

    private registerBuiltinCommands() {
        // ==========================================
        // 1. AIDE & GÉNÉRAL
        // ==========================================
        this.registerCommand({
            name: 'help',
            aliases: ['h', 'cmds', 'commands'],
            description: 'Affiche la liste complète des commandes in-chat',
            category: 'general',
            execute: async ({ message }, disp) => {
                const helpText = [
                    '👑 **Opsec PRO — Guide des Commandes In-Chat**',
                    '',
                    '**🎭 Présence & Profil :**',
                    '• `.fake <stream|play|listen|watch|compete> <titre>` : Définit l\'activité RPC',
                    '• `.fake <clear|off|none>` : Supprime l\'activité actuelle',
                    '• `.status <texte>` : Définit le statut personnalisé (ou `.status clear`)',
                    '• `.cstatus <texte>` : Alias statut personnalisé',
                    '• `.online` | `.dnd` | `.idle` | `.invisible` : Raccourcis de statut instantanés',
                    '• `.afk [raison]` | `.unafk` : Mode répondeur automatique AFK',
                    '• `.hypesquad <bravery|brilliance|balance|none|leave>` : Change ou supprime le badge',
                    '• `.bio <texte>` : Met à jour votre bio Discord en direct',
                    '• `.copy <@user>` : Clone l\'avatar et la bio d\'un utilisateur cible',
                    '',
                    '**🧹 Nettoyage & Sécurité :**',
                    '• `.purge <nb>` : Supprime vos messages récents dans le salon',
                    '• `.purgebots [nb]` : Supprime les messages de bots dans le salon',
                    '• `.ghostping <@user>` : Mention furtive avec auto-suppression zero-trace',
                    '• `.leavegroups` : Quitte tous les groupes de DM',
                    '',
                    '**🎯 Snipers & Renseignements :**',
                    '• `.snipe [index]` : Révèle le dernier message supprimé',
                    '• `.editsnipe [index]` : Révèle le message avant modification',
                    '• `.clearsnipe` : Efface la mémoire de snipe du salon',
                    '• `.userinfo [@user]` : Fiche détaillée (ID, badges, dates)',
                    '• `.avatar [@user]` | `.banner [@user]` : Liens HD avatar & bannière',
                    '• `.serverinfo` : Stats du serveur (membres, boosts, owner)',
                    '• `.servericon` | `.serverbanner` : Médias HD du serveur',
                    '• `.firstmessage` : Lien vers le 1er message du salon',
                    '',
                    '**⚡ Automatisation, Audio & Outils :**',
                    '• `.macro <nom|list|stop>` : Exécute ou annule un scénario macro',
                    '• `.voice <join|leave|play|stop|pause|resume>` : Contrôle vocal 24/7',
                    '• `.vplay <audio>` | `.vstop` : Raccourcis lecteur vocal',
                    '• `.backup <save|list>` : Sauvegarde complète du serveur',
                    '• `.calc <expression>` : Calculatrice mathématique instantanée',
                    '• `.bigtext <texte>` : Convertit le texte en émojis géants',
                    '• `.uptime` : Affiche le temps d\'activité de la session',
                    '• `.ping` : Latence Gateway & API Discord'
                ].join('\n');
                await disp.sanitizeResponse(message, helpText, 12000);
            }
        });

        this.registerCommand({
            name: 'ping',
            description: 'Affiche la latence WebSocket',
            category: 'general',
            execute: async ({ message }, disp) => {
                const wsPing = disp.client.ws.ping;
                await disp.sanitizeResponse(message, `🏓 **Pong !** Latence Gateway : \`${wsPing}ms\``, 3000);
            }
        });

        this.registerCommand({
            name: 'uptime',
            description: 'Affiche le temps de fonctionnement d\'Opsec PRO',
            category: 'general',
            execute: async ({ message }, disp) => {
                const totalSeconds = Math.floor((Date.now() - disp.startTime) / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                await disp.sanitizeResponse(message, `⏱️ **Opsec PRO Uptime :** \`${hours}h ${minutes}m ${seconds}s\``, 4000);
            }
        });

        // ==========================================
        // 2. PRÉSENCE & IDENTITÉ
        // ==========================================
        this.registerCommand({
            name: 'fake',
            aliases: ['rpc', 'presence', 'activity'],
            description: 'Modifie ou supprime votre activité Rich Presence',
            category: 'presence',
            execute: async ({ message, args }, disp) => {
                const action = (args[0] || '').toLowerCase();
                
                // Clear presence if requested
                if (action === 'clear' || action === 'off' || action === 'none' || action === 'stop') {
                    (disp.client.user as any).setPresence({ activities: [] });
                    await disp.sanitizeResponse(message, '🧹 **Activité Rich Presence supprimée avec succès.**', 2500);
                    return;
                }

                const title = args.slice(1).join(' ');
                if (!title) {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.fake <stream|play|listen|watch|compete> <titre>` ou `.fake clear`', 3500);
                    return;
                }

                let activityType: any = 'PLAYING';
                let streamingUrl: string | undefined = undefined;

                if (action === 'stream') {
                    activityType = 'STREAMING';
                    streamingUrl = 'https://www.twitch.tv/discord';
                } else if (action === 'listen') activityType = 'LISTENING';
                else if (action === 'watch') activityType = 'WATCHING';
                else if (action === 'compete') activityType = 'COMPETING';

                (disp.client.user as any).setPresence({
                    activities: [{
                        name: title,
                        type: activityType,
                        url: streamingUrl
                    }]
                });

                await disp.sanitizeResponse(message, `🎭 **Présence Fake Activée :** \`${action.toUpperCase()}\` : *${title}*`, 3000);
            }
        });

        this.registerCommand({
            name: 'status',
            description: 'Change ou supprime votre statut personnalisé',
            category: 'presence',
            execute: async ({ message, args }, disp) => {
                const text = args.join(' ').trim();
                if (!text || text.toLowerCase() === 'clear' || text.toLowerCase() === 'off' || text.toLowerCase() === 'none') {
                    await (disp.client as any).settings.setCustomStatus({ text: '' });
                    await disp.sanitizeResponse(message, '🧹 **Statut personnalisé supprimé.**', 2500);
                    return;
                }

                await (disp.client as any).settings.setCustomStatus({ text });
                await disp.sanitizeResponse(message, `💬 **Statut personnalisé mis à jour :** "${text}"`, 2500);
            }
        });

        // Quick status shortcuts
        this.registerCommand({
            name: 'online',
            description: 'Passe en statut En ligne',
            category: 'presence',
            execute: async ({ message }, disp) => {
                (disp.client.user as any).setStatus('online');
                await disp.sanitizeResponse(message, '🟢 **Statut : En ligne**', 2000);
            }
        });

        this.registerCommand({
            name: 'dnd',
            aliases: ['busy'],
            description: 'Passe en statut Ne pas déranger',
            category: 'presence',
            execute: async ({ message }, disp) => {
                (disp.client.user as any).setStatus('dnd');
                await disp.sanitizeResponse(message, '🔴 **Statut : Ne pas déranger**', 2000);
            }
        });

        this.registerCommand({
            name: 'idle',
            aliases: ['away'],
            description: 'Passe en statut Inactif',
            category: 'presence',
            execute: async ({ message }, disp) => {
                (disp.client.user as any).setStatus('idle');
                await disp.sanitizeResponse(message, '🟡 **Statut : Inactif**', 2000);
            }
        });

        this.registerCommand({
            name: 'invisible',
            aliases: ['inv', 'offline'],
            description: 'Passe en statut Invisible',
            category: 'presence',
            execute: async ({ message }, disp) => {
                (disp.client.user as any).setStatus('invisible');
                await disp.sanitizeResponse(message, '⚫ **Statut : Invisible**', 2000);
            }
        });

        this.registerCommand({
            name: 'afk',
            description: 'Active le mode AFK avec réponse automatique',
            category: 'presence',
            execute: async ({ message, args }, disp) => {
                const reason = args.join(' ') || 'Je suis occupé';
                disp.isAfk = true;
                disp.afkReason = reason;
                (disp.client.user as any).setStatus('idle');
                await disp.sanitizeResponse(message, `💤 **Mode AFK activé :** "${reason}"`, 3000);
            }
        });

        this.registerCommand({
            name: 'unafk',
            description: 'Désactive le mode AFK',
            category: 'presence',
            execute: async ({ message }, disp) => {
                disp.isAfk = false;
                (disp.client.user as any).setStatus('online');
                await disp.sanitizeResponse(message, '👋 **De retour ! Mode AFK désactivé.**', 2000);
            }
        });

        this.registerCommand({
            name: 'hypesquad',
            description: 'Change votre badge HypeSquad',
            category: 'presence',
            execute: async ({ message, args }, disp) => {
                const house = (args[0] || '').toLowerCase();
                let houseId = 0;
                if (house === 'bravery' || house === '1') houseId = 1;
                else if (house === 'brilliance' || house === '2') houseId = 2;
                else if (house === 'balance' || house === '3') houseId = 3;
                else if (['none', 'leave', 'remove', 'delete', 'clear', '0', 'off'].includes(house)) houseId = 0;
                else {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.hypesquad <bravery|brilliance|balance|leave|none>`', 3000);
                    return;
                }

                if (houseId > 0) {
                    await (disp.client as any).api.hypesquad.online.post({ data: { house_id: houseId } });
                    await disp.sanitizeResponse(message, `🛡️ **Maison HypeSquad définie sur :** \`${house.toUpperCase()}\``, 3000);
                } else {
                    await (disp.client as any).api.hypesquad.online.delete();
                    await disp.sanitizeResponse(message, `🛡️ **Badge HypeSquad retiré.**`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'bio',
            aliases: ['aboutme', 'setbio'],
            description: 'Met à jour votre bio Discord',
            category: 'presence',
            execute: async ({ message, rawArgs }, disp) => {
                const bio = rawArgs.trim();
                try {
                    await (disp.client as any).api.users['@me'].profile.patch({ data: { bio } });
                    await disp.sanitizeResponse(message, bio ? `📝 **Bio mise à jour :**\n> ${bio}` : '🧹 **Bio effacée.**', 3000);
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Erreur modification bio :** ${e.message}`, 3500);
                }
            }
        });

        this.registerCommand({
            name: 'copy',
            aliases: ['cloneuser', 'impersonate'],
            description: 'Copie l\'avatar et la bio d\'un utilisateur',
            category: 'presence',
            execute: async ({ message, args }, disp) => {
                const targetUser = message.mentions.users.first() || (args[0] ? await disp.client.users.fetch(args[0]).catch(() => null) : null);
                if (!targetUser) {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.copy <@user|userId>`', 3000);
                    return;
                }

                await message.edit(`⏳ **Clonage du profil de ${targetUser.tag}...**`);
                try {
                    const profileData = await (disp.client as any).api.users(targetUser.id).profile.get().catch(() => null);
                    const avatarUrl = targetUser.displayAvatarURL({ format: 'png', size: 1024 });
                    const bio = profileData?.user_profile?.bio || '';
                    
                    if (bio) {
                        await (disp.client as any).api.users['@me'].profile.patch({ data: { bio } }).catch(() => {});
                    }

                    if (avatarUrl) {
                        const response = await fetch(avatarUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        const base64 = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
                        await (disp.client.user as any).setAvatar(base64).catch(() => {});
                    }

                    await disp.sanitizeResponse(message, `🎭 **Profil cloné avec succès depuis ${targetUser.tag} !**`, 4000);
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Échec du clonage :** ${e.message}`, 3500);
                }
            }
        });

        // ==========================================
        // 3. NETTOYAGE & SNIPERS
        // ==========================================
        this.registerCommand({
            name: 'purge',
            aliases: ['clear', 'cl'],
            description: 'Purge vos derniers messages dans le salon',
            category: 'moderation',
            execute: async ({ message, args }, disp) => {
                const count = parseInt(args[0], 10) || 10;
                await message.edit(`⏳ **Purge de ${count} messages en cours...**`);
                let deleted = 0;

                try {
                    const fetched = await message.channel.messages.fetch({ limit: 100 });
                    const userMessages = fetched.filter(m => m.author.id === disp.client.user?.id && m.id !== message.id);
                    const toDelete = Array.from(userMessages.values()).slice(0, count);

                    for (const msg of toDelete) {
                        try {
                            await msg.delete();
                            deleted++;
                            await new Promise(r => setTimeout(r, 600));
                        } catch (_) {}
                    }

                    await disp.sanitizeResponse(message, `✅ **Purge terminée :** \`${deleted}\` messages supprimés.`, 2500);
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Échec de purge :** ${e.message}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'purgebots',
            description: 'Purge les messages des bots dans ce salon',
            category: 'moderation',
            execute: async ({ message, args }, disp) => {
                const count = parseInt(args[0], 10) || 10;
                await message.edit(`⏳ **Nettoyage des messages de bots (${count})...**`);
                let deleted = 0;

                try {
                    const fetched = await message.channel.messages.fetch({ limit: 100 });
                    const botMessages = fetched.filter(m => m.author.bot);
                    const toDelete = Array.from(botMessages.values()).slice(0, count);

                    for (const msg of toDelete) {
                        try {
                            await msg.delete();
                            deleted++;
                            await new Promise(r => setTimeout(r, 600));
                        } catch (_) {}
                    }

                    await disp.sanitizeResponse(message, `🤖 **Purge Bot :** \`${deleted}\` messages de bots supprimés.`, 2500);
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Échec :** ${e.message}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'snipe',
            description: 'Révèle le dernier message supprimé dans le salon',
            category: 'moderation',
            execute: async ({ message, args }, disp) => {
                const index = parseInt(args[0], 10) ? parseInt(args[0], 10) - 1 : 0;
                const sniped = disp.messageLogger.getSnipe(message.channel.id, index);

                if (!sniped) {
                    await disp.sanitizeResponse(message, '🔍 **Aucun message supprimé trouvé dans ce salon.**', 2500);
                    return;
                }

                const dateStr = new Date(sniped.deletedAt).toLocaleTimeString();
                let output = `🗑️ **Message Supprimé de ${sniped.author.tag}** *(à ${dateStr})* :\n>>> ${sniped.content || '*[Aucun texte]*'}`;
                if (sniped.attachments.length > 0) {
                    output += `\n📎 **Fichiers joints** : ${sniped.attachments.join('\n')}`;
                }

                await disp.sanitizeResponse(message, output, 10000);
            }
        });

        this.registerCommand({
            name: 'editsnipe',
            aliases: ['esnipe'],
            description: 'Révèle le dernier message édité dans le salon',
            category: 'moderation',
            execute: async ({ message, args }, disp) => {
                const index = parseInt(args[0], 10) ? parseInt(args[0], 10) - 1 : 0;
                const edited = disp.messageLogger.getEditSnipe(message.channel.id, index);

                if (!edited) {
                    await disp.sanitizeResponse(message, '✏️ **Aucun message édité trouvé dans ce salon.**', 2500);
                    return;
                }

                const dateStr = new Date(edited.editedAt).toLocaleTimeString();
                const output = [
                    `✏️ **Message Édité de ${edited.author.tag}** *(à ${dateStr})* :`,
                    `**Avant :** ${edited.oldContent}`,
                    `**Après :** ${edited.newContent}`
                ].join('\n');

                await disp.sanitizeResponse(message, output, 10000);
            }
        });

        this.registerCommand({
            name: 'clearsnipe',
            description: 'Efface l\'historique des snipes du salon',
            category: 'moderation',
            execute: async ({ message }, disp) => {
                disp.messageLogger.clear(message.channel.id);
                await disp.sanitizeResponse(message, '🧹 **Historique des snipes effacé pour ce salon.**', 2500);
            }
        });

        // ==========================================
        // 4. RENSEIGNEMENTS & SERVEURS
        // ==========================================
        this.registerCommand({
            name: 'userinfo',
            aliases: ['whois', 'uinfo'],
            description: 'Informations détaillées sur un utilisateur',
            category: 'server',
            execute: async ({ message }, disp) => {
                const targetUser = message.mentions.users.first() || disp.client.user;
                if (!targetUser) return;
                const createdDate = new Date(targetUser.createdTimestamp).toLocaleDateString();
                const info = [
                    `👤 **Informations sur ${targetUser.tag}**`,
                    `• **ID :** \`${targetUser.id}\``,
                    `• **Compte créé le :** \`${createdDate}\``,
                    `• **Bot :** \`${targetUser.bot ? 'Oui' : 'Non'}\``,
                    `• **Avatar :** ${targetUser.displayAvatarURL({ dynamic: true, size: 2048 })}`
                ].join('\n');
                await disp.sanitizeResponse(message, info, 8000);
            }
        });

        this.registerCommand({
            name: 'avatar',
            aliases: ['av', 'pfp'],
            description: 'Lien direct vers l\'avatar en haute définition',
            category: 'server',
            execute: async ({ message }, disp) => {
                const targetUser = message.mentions.users.first() || disp.client.user;
                if (!targetUser) return;
                const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 2048 });
                await disp.sanitizeResponse(message, `🖼️ **Avatar de ${targetUser.tag} :**\n${avatarUrl}`, 8000);
            }
        });

        this.registerCommand({
            name: 'banner',
            description: 'Lien direct vers la bannière de profil',
            category: 'server',
            execute: async ({ message }, disp) => {
                const targetUser = message.mentions.users.first() || disp.client.user;
                if (!targetUser) return;
                try {
                    const fetchedUser = await disp.client.users.fetch(targetUser.id, { force: true });
                    const bannerUrl = (fetchedUser as any).bannerURL ? (fetchedUser as any).bannerURL({ dynamic: true, size: 2048 }) : null;
                    if (bannerUrl) {
                        await disp.sanitizeResponse(message, `🎨 **Bannière de ${targetUser.tag} :**\n${bannerUrl}`, 8000);
                    } else {
                        await disp.sanitizeResponse(message, `🎨 **${targetUser.tag} n'a pas de bannière configurée.**`, 3000);
                    }
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Erreur :** ${e.message}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'serverinfo',
            aliases: ['sinfo', 'guildinfo'],
            description: 'Informations détaillées sur le serveur actuel',
            category: 'server',
            execute: async ({ message }, disp) => {
                if (!message.guild) {
                    await disp.sanitizeResponse(message, '❌ **Cette commande doit être exécutée dans un serveur.**', 3000);
                    return;
                }
                const g = message.guild;
                const createdDate = new Date(g.createdTimestamp).toLocaleDateString();
                const info = [
                    `🏰 **Serveur : ${g.name}**`,
                    `• **ID :** \`${g.id}\``,
                    `• **Propriétaire ID :** \`${g.ownerId}\``,
                    `• **Membres :** \`${g.memberCount}\``,
                    `• **Salons :** \`${g.channels.cache.size}\``,
                    `• **Rôles :** \`${g.roles.cache.size}\``,
                    `• **Niveau Boost :** Tier \`${g.premiumTier}\` (\`${g.premiumSubscriptionCount || 0}\` boosts)`,
                    `• **Créé le :** \`${createdDate}\``
                ].join('\n');
                await disp.sanitizeResponse(message, info, 8000);
            }
        });

        this.registerCommand({
            name: 'servericon',
            description: 'Lien direct vers l\'icône du serveur',
            category: 'server',
            execute: async ({ message }, disp) => {
                if (!message.guild) return;
                const icon = message.guild.iconURL({ dynamic: true, size: 2048 });
                if (icon) {
                    await disp.sanitizeResponse(message, `🏰 **Icône de ${message.guild.name} :**\n${icon}`, 8000);
                } else {
                    await disp.sanitizeResponse(message, '❌ **Ce serveur n\'a pas d\'icône.**', 3000);
                }
            }
        });

        this.registerCommand({
            name: 'firstmessage',
            aliases: ['firstmsg'],
            description: 'Lien direct vers le tout premier message du salon',
            category: 'server',
            execute: async ({ message }, disp) => {
                try {
                    const fetched = await message.channel.messages.fetch({ after: '1', limit: 1 });
                    const first = fetched.first();
                    if (first) {
                        await disp.sanitizeResponse(message, `📜 **Premier message de ce salon :**\n${first.url}`, 6000);
                    } else {
                        await disp.sanitizeResponse(message, '❌ **Impossible de trouver le premier message.**', 3000);
                    }
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Erreur :** ${e.message}`, 3000);
                }
            }
        });

        // ==========================================
        // 5. UTILITAIRES RAPIDES & FUN
        // ==========================================
        this.registerCommand({
            name: 'calc',
            aliases: ['math'],
            description: 'Calculatrice mathématique instantanée',
            category: 'utility',
            execute: async ({ message, args }, disp) => {
                const expr = args.join('');
                if (!expr || !/^[0-9+\-*/().^ %]+$/.test(expr)) {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.calc <expression_mathématiqe>` *(ex: .calc (12*4)/2)*', 3000);
                    return;
                }
                try {
                    const result = Function(`'use strict'; return (${expr})`)();
                    await disp.sanitizeResponse(message, `🧮 **Calcul :** \`${expr}\` = **\`${result}\`**`, 4000);
                } catch (e: any) {
                    await disp.sanitizeResponse(message, `❌ **Expression invalide :** ${e.message}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'bigtext',
            description: 'Convertit du texte en emojis régionaux géants',
            category: 'utility',
            execute: async ({ message, args }, disp) => {
                const text = args.join(' ').toLowerCase();
                if (!text) return;
                const converted = text.split('').map(char => {
                    if (/[a-z]/.test(char)) return `:regional_indicator_${char}:`;
                    if (/[0-9]/.test(char)) {
                        const nums = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                        return `:${nums[parseInt(char)]}:`;
                    }
                    if (char === ' ') return '   ';
                    return char;
                }).join(' ');
                await disp.sanitizeResponse(message, converted, 8000);
            }
        });

        this.registerCommand({
            name: 'ghostping',
            description: 'Mention instantanée supprimée en 50ms',
            category: 'utility',
            execute: async ({ message, args }) => {
                const target = args[0];
                if (!target) return;
                await message.delete();
                const ghostMsg = await (message.channel as any).send(target);
                setTimeout(async () => {
                    try { await ghostMsg.delete(); } catch (_) {}
                }, 50);
            }
        });

        // ==========================================
        // 6. MACROS, SERVEURS & VOCAL
        // ==========================================
        this.registerCommand({
            name: 'macro',
            aliases: ['scenario'],
            description: 'Exécute ou gère un scénario d\'automatisation',
            category: 'utility',
            execute: async ({ message, args }, disp) => {
                const sub = (args[0] || '').toLowerCase();
                if (!sub) {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.macro <nom|list|stop>`', 3000);
                    return;
                }
                if (!disp.macroService) {
                    await disp.sanitizeResponse(message, '❌ **Moteur de macros non initialisé.**', 3000);
                    return;
                }

                if (sub === 'stop' || sub === 'cancel') {
                    disp.macroService.cancelExecution();
                    await disp.sanitizeResponse(message, '⏹️ **Exécution de scénario interrompue.**', 2500);
                    return;
                }

                if (sub === 'list') {
                    const list = disp.macroService.listMacros();
                    const str = list.map((m, i) => `${i + 1}. **${m.name}** (\`${m.steps.length} étapes\`)`).join('\n');
                    await disp.sanitizeResponse(message, `⚡ **Scénarios disponibles :**\n${str}`, 6000);
                    return;
                }

                const macroNameOrId = args.join(' ').toLowerCase();
                const allMacros = disp.macroService.listMacros();
                const found = allMacros.find(m => m.id.toLowerCase() === macroNameOrId || m.name.toLowerCase().includes(macroNameOrId));
                if (!found) {
                    await disp.sanitizeResponse(message, `❌ **Macro '${macroNameOrId}' introuvable.**`, 3000);
                    return;
                }

                await message.edit(`⚡ **Exécution du scénario :** *${found.name}*...`);
                const res = await disp.macroService.executeMacro(found.id);
                if (res.success) {
                    await disp.sanitizeResponse(message, `🎉 **Scénario '${found.name}' terminé !**`, 3000);
                } else {
                    await disp.sanitizeResponse(message, `❌ **Erreur scénario :** ${res.error}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'backup',
            description: 'Sauvegarde de serveur',
            category: 'server',
            execute: async ({ message, args }, disp) => {
                const sub = (args[0] || '').toLowerCase();
                if (sub === 'save') {
                    if (!message.guild) {
                        await disp.sanitizeResponse(message, '❌ **Cette commande doit être exécutée dans un serveur.**', 3000);
                        return;
                    }
                    await message.edit(`⏳ **Sauvegarde du serveur ${message.guild.name} en cours...**`);
                    const res = await disp.guildCloner.createBackup(message.guild.id);
                    if (res.success && res.data) {
                        await disp.sanitizeResponse(message, `🏰 **Sauvegarde terminée !** (\`${res.data.roles.length}\` rôles, \`${res.data.channels.length}\` salons).`, 4000);
                    } else {
                        await disp.sanitizeResponse(message, `❌ **Échec :** ${res.error}`, 4000);
                    }
                } else if (sub === 'list') {
                    const list = disp.guildCloner.listBackups();
                    if (list.length === 0) {
                        await disp.sanitizeResponse(message, '📁 **Aucune sauvegarde disponible.**', 3000);
                    } else {
                        const str = list.slice(0, 5).map((b, i) => `${i + 1}. **${b.data.name}** (\`${b.data.channels.length} salons\`)`).join('\n');
                        await disp.sanitizeResponse(message, `📁 **Dernières sauvegardes :**\n${str}`, 6000);
                    }
                } else {
                    await disp.sanitizeResponse(message, '⚠️ **Syntaxe :** `.backup <save|list>`', 3000);
                }
            }
        });

        this.registerCommand({
            name: 'vplay',
            description: 'Lance la lecture audio en vocal',
            category: 'voice',
            execute: async ({ message, args }, disp) => {
                const source = args.join(' ');
                if (!source || !disp.voiceStreamer) return;
                const res = await disp.voiceStreamer.play(source);
                if (res.success) {
                    await disp.sanitizeResponse(message, `🎵 **Lecture audio démarrée :** \`${source}\``, 3000);
                } else {
                    await disp.sanitizeResponse(message, `❌ **Échec lecture :** ${res.error}`, 3000);
                }
            }
        });

        this.registerCommand({
            name: 'vstop',
            description: 'Stoppe la lecture audio',
            category: 'voice',
            execute: async ({ message }, disp) => {
                if (disp.voiceStreamer) {
                    disp.voiceStreamer.stop();
                    await disp.sanitizeResponse(message, '⏹️ **Lecture audio stoppée.**', 2500);
                }
            }
        });

        this.registerCommand({
            name: 'vleave',
            description: 'Quitte le salon vocal',
            category: 'voice',
            execute: async ({ message }, disp) => {
                if (disp.voiceStreamer) {
                    await disp.voiceStreamer.leave();
                    await disp.sanitizeResponse(message, '🚪 **Déconnexion du salon vocal effectuée.**', 2500);
                }
            }
        });
    }
}
