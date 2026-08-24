import React, { useState, useEffect, useMemo } from 'react';
import { 
    Terminal, MessageSquare, Shield, Zap, Search, Trash2, Eye, 
    Sparkles, Copy, Check, Filter, Layers, Info, Volume2, Activity,
    Flame, UserCheck, RefreshCw, Hash, User, Paperclip, Cpu, Command
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface InChatSystemProps {
    showToast?: (message: string, type?: 'success' | 'danger' | 'info' | any) => void;
}

type CommandCategory = 'all' | 'presence' | 'moderation' | 'intel' | 'tools' | 'voice';

export const InChatSystem: React.FC<InChatSystemProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    const [enabled, setEnabled] = useState(true);
    const [prefix, setPrefix] = useState('.');
    const [channelId, setChannelId] = useState('');
    const [snipedData, setSnipedData] = useState<any>(null);
    const [isSearchingSnipe, setIsSearchingSnipe] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CommandCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    useEffect(() => {
        if (window.electronAPI?.inChatGetStatus) {
            window.electronAPI.inChatGetStatus().then((res) => {
                if (res?.data) {
                    setEnabled(res.data.enabled);
                    setPrefix(res.data.prefix || '.');
                }
            }).catch(() => {});
        }
    }, []);

    const handleToggle = async () => {
        const next = !enabled;
        setEnabled(next);
        if (window.electronAPI?.inChatToggle) {
            await window.electronAPI.inChatToggle(next);
            showToast?.(
                next 
                    ? (isFr ? 'Commandes In-Chat activées' : 'In-Chat Commands enabled') 
                    : (isFr ? 'Commandes In-Chat désactivées' : 'In-Chat Commands disabled'),
                'success'
            );
        }
    };

    const handleSavePrefix = async (newPrefix: string) => {
        if (newPrefix === '/') {
            showToast?.(
                isFr ? 'Discord réserve le préfixe "/" pour les commandes Slash. Utilisez "." ou "!"' : 'Discord reserves "/" for Slash Commands. Use "." or "!"',
                'danger'
            );
        }
        setPrefix(newPrefix);
        if (window.electronAPI?.inChatSetPrefix) {
            await window.electronAPI.inChatSetPrefix(newPrefix);
            if (newPrefix !== '/') {
                showToast?.(
                    isFr ? `Préfixe mis à jour : ${newPrefix}` : `Prefix updated: ${newPrefix}`,
                    'success'
                );
            }
        }
    };

    const handleFetchSnipe = async () => {
        if (!channelId.trim()) return;
        setIsSearchingSnipe(true);
        try {
            const res = await window.electronAPI?.snipeGet(channelId.trim());
            if (res?.data) {
                setSnipedData(res.data);
                showToast?.(isFr ? 'Message supprimé récupéré !' : 'Deleted message found!', 'success');
            } else {
                setSnipedData(null);
                showToast?.(isFr ? 'Aucun message supprimé dans ce salon' : 'No deleted message in this channel', 'danger');
            }
        } catch (_) {
            showToast?.(isFr ? 'Erreur de récupération' : 'Fetch error', 'danger');
        } finally {
            setIsSearchingSnipe(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(text);
        showToast?.(isFr ? `Copié : ${text}` : `Copied: ${text}`, 'info');
        setTimeout(() => setCopiedCmd(null), 2000);
    };

    const rawCommandsList = useMemo(() => [
        // PRESENCE & PROFILE
        { category: 'presence', cmd: `${prefix}help`, aliases: ['.cmds', '.h'], descFr: 'Affiche le guide complet de toutes les commandes', descEn: 'Displays complete guide of all commands', syntax: `${prefix}help` },
        { category: 'presence', cmd: `${prefix}fake <type> <titre>`, aliases: ['.richpresence'], descFr: 'Définit une activité RPC (stream, play, listen, watch, compete)', descEn: 'Sets Rich Presence activity (stream, play, listen, watch, compete)', syntax: `${prefix}fake stream Opsec Live` },
        { category: 'presence', cmd: `${prefix}fake <clear|off|none>`, aliases: [], descFr: 'Supprime immédiatement l\'activité Rich Presence actuelle', descEn: 'Instantly clears current Rich Presence activity', syntax: `${prefix}fake clear` },
        { category: 'presence', cmd: `${prefix}status <texte>`, aliases: ['.status clear'], descFr: 'Définit votre statut personnalisé ou le supprime avec "clear"', descEn: 'Sets custom status or clears it with "clear"', syntax: `${prefix}status En mission Opsec` },
        { category: 'presence', cmd: `${prefix}cstatus <texte>`, aliases: [], descFr: 'Alias rapide pour changer le message de statut', descEn: 'Quick alias for custom status text', syntax: `${prefix}cstatus Working...` },
        { category: 'presence', cmd: `${prefix}online / .dnd / .idle / .invisible`, aliases: ['.online', '.dnd', '.idle', '.invisible'], descFr: 'Raccourcis instantanés de changement de statut Discord', descEn: 'Instant status switcher shortcuts', syntax: `${prefix}dnd` },
        { category: 'presence', cmd: `${prefix}afk [raison]`, aliases: [], descFr: 'Active le mode répondeur automatique avec raison personnalisée', descEn: 'Enables auto-responder AFK mode with custom reason', syntax: `${prefix}afk Je mange, retour à 20h` },
        { category: 'presence', cmd: `${prefix}unafk`, aliases: [], descFr: 'Désactive le répondeur automatique AFK', descEn: 'Disables AFK auto-responder mode', syntax: `${prefix}unafk` },
        { category: 'presence', cmd: `${prefix}hypesquad <bravery|brilliance|balance|leave|none>`, aliases: ['.hypesquad leave', '.hypesquad 0'], descFr: 'Change votre maison HypeSquad ou supprime totalement votre badge actuel', descEn: 'Switches HypeSquad house or completely deletes your active badge', syntax: `${prefix}hypesquad leave` },

        // MODERATION & CLEANUP
        { category: 'moderation', cmd: `${prefix}purge <nb>`, aliases: ['.clear', '.cl'], descFr: 'Supprime vos messages récents dans le salon actif', descEn: 'Deletes your recent messages in the active channel', syntax: `${prefix}purge 25` },
        { category: 'moderation', cmd: `${prefix}purgebots [nb]`, aliases: ['.clearbots'], descFr: 'Supprime les messages de bots dans le salon actif', descEn: 'Deletes bot messages in active channel', syntax: `${prefix}purgebots 30` },
        { category: 'moderation', cmd: `${prefix}ghostping <@user>`, aliases: ['.gp'], descFr: 'Envoie une mention puis la supprime immédiatement (<50ms zero-trace)', descEn: 'Sends a mention and deletes it immediately (<50ms zero-trace)', syntax: `${prefix}ghostping @user` },
        { category: 'moderation', cmd: `${prefix}leavegroups`, aliases: [], descFr: 'Quitte automatiquement tous les groupes de discussion privés (DMs)', descEn: 'Automatically leaves all group DMs', syntax: `${prefix}leavegroups` },

        // INTEL & SNIPERS
        { category: 'intel', cmd: `${prefix}snipe [index]`, aliases: ['.s'], descFr: 'Révèle le dernier message supprimé dans ce salon', descEn: 'Reveals the last deleted message in this channel', syntax: `${prefix}snipe` },
        { category: 'intel', cmd: `${prefix}editsnipe [index]`, aliases: ['.es'], descFr: 'Révèle le message avant sa dernière modification', descEn: 'Reveals message content prior to last edit', syntax: `${prefix}editsnipe` },
        { category: 'intel', cmd: `${prefix}clearsnipe`, aliases: [], descFr: 'Efface la mémoire tampon des messages supprimés du salon', descEn: 'Clears deleted messages buffer for channel', syntax: `${prefix}clearsnipe` },
        { category: 'intel', cmd: `${prefix}userinfo [@user]`, aliases: ['.ui'], descFr: 'Fiche détaillée sur un compte (ID, badges, date de création, avatar)', descEn: 'Detailed user profile info (ID, badges, created date, avatar)', syntax: `${prefix}userinfo @user` },
        { category: 'intel', cmd: `${prefix}avatar [@user]`, aliases: ['.av'], descFr: 'Obtient le lien HD de l\'avatar de l\'utilisateur ou du serveur', descEn: 'Fetches HD avatar URL of user or server', syntax: `${prefix}avatar @user` },
        { category: 'intel', cmd: `${prefix}banner [@user]`, aliases: [], descFr: 'Obtient le lien HD de la bannière de profil ou de serveur', descEn: 'Fetches HD profile or server banner URL', syntax: `${prefix}banner @user` },
        { category: 'intel', cmd: `${prefix}serverinfo`, aliases: ['.si'], descFr: 'Statistiques complètes du serveur (membres, boosts, owner, salons)', descEn: 'Comprehensive server stats (members, boosts, owner, channels)', syntax: `${prefix}serverinfo` },
        { category: 'intel', cmd: `${prefix}servericon`, aliases: [], descFr: 'Lien HD direct vers l\'icône du serveur', descEn: 'Direct HD link to server icon', syntax: `${prefix}servericon` },
        { category: 'intel', cmd: `${prefix}serverbanner`, aliases: [], descFr: 'Lien HD direct vers la bannière du serveur', descEn: 'Direct HD link to server banner', syntax: `${prefix}serverbanner` },
        { category: 'intel', cmd: `${prefix}firstmessage`, aliases: ['.firstmsg'], descFr: 'Lien direct vers le tout premier message du salon', descEn: 'Direct jump link to the channel\'s very first message', syntax: `${prefix}firstmessage` },

        // VOICE & STREAMING
        { category: 'voice', cmd: `${prefix}voice <join|leave|play|stop|pause|resume>`, aliases: ['.v'], descFr: 'Contrôle complet du streamer vocal 24/7 (DAVE MLS / WebRTC)', descEn: 'Full 24/7 voice streamer controls (DAVE MLS / WebRTC)', syntax: `${prefix}voice join 123456789012345678` },
        { category: 'voice', cmd: `${prefix}vplay <audio>`, aliases: [], descFr: 'Lance la lecture d\'un flux ou fichier audio dans le salon vocal', descEn: 'Plays audio stream or file in voice channel', syntax: `${prefix}vplay music.mp3` },
        { category: 'voice', cmd: `${prefix}vstop`, aliases: ['.vleave'], descFr: 'Arrête la lecture audio et quitte le salon vocal', descEn: 'Stops audio playback and disconnects voice', syntax: `${prefix}vstop` },

        // TOOLS & MACROS
        { category: 'tools', cmd: `${prefix}macro <nom|list|stop>`, aliases: ['.scenario'], descFr: 'Exécute ou interrompt un scénario macro automatisé', descEn: 'Runs or cancels an automated macro scenario', syntax: `${prefix}macro streaming_mode` },
        { category: 'tools', cmd: `${prefix}backup <save|list>`, aliases: ['.clonebackup'], descFr: 'Sauvegarde complète de la structure d\'un serveur (salons, rôles, permissions)', descEn: 'Full backup of server structure (channels, roles, permissions)', syntax: `${prefix}backup save` },
        { category: 'tools', cmd: `${prefix}calc <expression>`, aliases: ['.math'], descFr: 'Évalue en toute sécurité une expression arithmétique', descEn: 'Safely evaluates an arithmetic math expression', syntax: `${prefix}calc (150*4)/2` },
        { category: 'tools', cmd: `${prefix}bigtext <texte>`, aliases: [], descFr: 'Convertit un texte en émojis régionaux géants', descEn: 'Converts text into giant regional indicator emojis', syntax: `${prefix}bigtext OPSEC` },
        { category: 'tools', cmd: `${prefix}uptime`, aliases: [], descFr: 'Affiche le temps de fonctionnement continu de la session Opsec PRO', descEn: 'Displays continuous Opsec PRO session uptime', syntax: `${prefix}uptime` },
        { category: 'tools', cmd: `${prefix}ping`, aliases: [], descFr: 'Mesure la latence Gateway WebSocket et API REST', descEn: 'Measures Gateway WebSocket and REST API latency', syntax: `${prefix}ping` },
    ], [prefix]);

    const filteredCommands = useMemo(() => {
        return rawCommandsList.filter(item => {
            const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
            const matchesQuery = !searchQuery.trim() || 
                item.cmd.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.descFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.descEn.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesQuery;
        });
    }, [rawCommandsList, selectedCategory, searchQuery]);

    const categories: { id: CommandCategory; labelFr: string; labelEn: string; icon: any; color: string }[] = [
        { id: 'all', labelFr: 'Toutes', labelEn: 'All', icon: Layers, color: 'var(--accent)' },
        { id: 'presence', labelFr: 'Présence & Profil', labelEn: 'Presence & Profile', icon: Sparkles, color: '#c084fc' },
        { id: 'moderation', labelFr: 'Nettoyage & Sécurité', labelEn: 'Cleanup & Safety', icon: Shield, color: '#00ff80' },
        { id: 'intel', labelFr: 'Snipers & Intel', labelEn: 'Snipers & Intel', icon: Eye, color: '#00ffcc' },
        { id: 'voice', labelFr: 'Vocal 24/7', labelEn: 'Voice 24/7', icon: Volume2, color: '#ff77aa' },
        { id: 'tools', labelFr: 'Outils & Macros', labelEn: 'Tools & Macros', icon: Cpu, color: '#ffd700' },
    ];

    const GlowingIconBadge = ({ icon: Icon, color = 'var(--accent)', size = 14 }: { icon: any; color?: string; size?: number }) => (
        <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            boxShadow: `0 0 12px color-mix(in srgb, ${color} 20%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            <Icon size={size} color={color} />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Control Card */}
            <div className="card" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(138, 43, 226, 0.05) 100%)',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: enabled ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${enabled ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: enabled ? '0 0 16px rgba(0, 210, 255, 0.25)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Terminal size={24} color={enabled ? 'var(--accent)' : '#888'} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>
                                ZERO-TRACE ENGINE (31+ COMMANDES)
                            </span>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: enabled ? 'rgba(0, 255, 128, 0.15)' : 'rgba(255, 0, 80, 0.15)',
                                color: enabled ? '#00ff80' : '#ff0050',
                                fontWeight: 'bold'
                            }}>
                                {enabled ? 'ACTIVE' : 'OFF'}
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                            {isFr ? 'Commandes In-Chat Discord' : 'In-Chat Discord Dispatcher'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
                            {isFr 
                                ? 'Pilotez votre compte directement dans vos MP et salons avec auto-suppression furtive.' 
                                : 'Control your account directly inside Discord DMs and servers with stealth zero-trace deletion.'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 0, 0, 0.4)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }}>Prefix:</span>
                        <input
                            type="text"
                            value={prefix}
                            maxLength={3}
                            onChange={(e) => handleSavePrefix(e.target.value)}
                            style={{
                                width: '36px',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--accent)',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 'bold',
                                padding: '4px 0',
                                fontSize: '13px'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleToggle}
                        className={enabled ? 'btn-danger' : 'btn-primary'}
                        style={{
                            height: '40px',
                            padding: '0 20px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Zap size={14} />
                        {enabled ? (isFr ? 'Désactiver' : 'Disable') : (isFr ? 'Activer' : 'Enable')}
                    </button>
                </div>
            </div>

            {/* 3 Execution Methods Notice Banner */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '14px',
                padding: '16px'
            }}>
                {/* Method 1: DMs */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <GlowingIconBadge icon={MessageSquare} color="var(--accent)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                            {isFr ? '1. En Message Privé (MP / DM)' : '1. In Direct Messages (DM)'}
                        </span>
                        <p style={{ margin: 0, fontSize: '11px', opacity: 0.7, lineHeight: '1.4' }}>
                            {isFr 
                                ? 'Tapez directement votre commande (ex: .help ou .status AFK). Réception 100% instantanée.' 
                                : 'Type your command directly (e.g. .help or .status AFK). 100% instant execution.'}
                        </p>
                    </div>
                </div>

                {/* Method 2: Servers */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <GlowingIconBadge icon={Shield} color="#00ff80" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                            {isFr ? '2. En Serveur (Avec @Mention)' : '2. In Servers (With @Mention)'}
                        </span>
                        <p style={{ margin: 0, fontSize: '11px', opacity: 0.7, lineHeight: '1.4' }}>
                            {isFr 
                                ? 'Mentionnez-vous dans le salon (ex: @Moi .purge 10 ou @Moi .help) pour forcer Discord à relayer le message.' 
                                : 'Mention yourself in chat (e.g. @Me .purge 10 or @Me .help) to force Discord to route the packet.'}
                        </p>
                    </div>
                </div>

                {/* Method 3: Command Palette */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <GlowingIconBadge icon={Command} color="#ffd700" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                            {isFr ? '3. Command Palette (Ctrl+K)' : '3. Command Palette (Ctrl+K)'}
                        </span>
                        <p style={{ margin: 0, fontSize: '11px', opacity: 0.7, lineHeight: '1.4' }}>
                            {isFr 
                                ? 'Ouvrez Ctrl+K dans Opsec PRO pour exécuter n\'importe quelle action sans rien écrire dans Discord.' 
                                : 'Open Ctrl+K in Opsec PRO to trigger any action directly without typing into Discord.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid: Command Cheatsheet + Quick Snipe Inspector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                {/* Commands Cheatsheet */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MessageSquare size={18} color="var(--accent)" />
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                                {isFr ? `Catalogue des Commandes (${filteredCommands.length})` : `Commands Catalog (${filteredCommands.length})`}
                            </h4>
                        </div>

                        {/* Search Filter */}
                        <div style={{ position: 'relative', width: '180px' }}>
                            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder={isFr ? 'Filtrer...' : 'Search...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '30px',
                                    paddingLeft: '28px',
                                    fontSize: '11px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    color: 'white'
                                }}
                            />
                        </div>
                    </div>

                    {/* Category Filter Badges */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {categories.map((cat) => {
                            const isSel = selectedCategory === cat.id;
                            const CatIcon = cat.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: isSel ? `1px solid ${cat.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                                        background: isSel ? `color-mix(in srgb, ${cat.color} 15%, transparent)` : 'rgba(255, 255, 255, 0.02)',
                                        color: isSel ? cat.color : 'var(--text-dim)',
                                        boxShadow: isSel ? `0 0 10px color-mix(in srgb, ${cat.color} 25%, transparent)` : 'none',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <CatIcon size={12} color={isSel ? cat.color : 'var(--text-dim)'} />
                                    {isFr ? cat.labelFr : cat.labelEn}
                                </button>
                            );
                        })}
                    </div>

                    {/* Command List Scrollable */}
                    <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                        {filteredCommands.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            color: 'var(--accent)',
                                            fontFamily: 'monospace',
                                            background: 'rgba(0, 210, 255, 0.08)',
                                            padding: '2px 6px',
                                            borderRadius: '5px'
                                        }}>
                                            {item.cmd}
                                        </span>
                                        {item.syntax && item.syntax !== item.cmd && (
                                            <span style={{ fontSize: '9px', opacity: 0.4, fontFamily: 'monospace' }}>
                                                ex: {item.syntax}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', opacity: 0.75, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                        {isFr ? item.descFr : item.descEn}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleCopy(item.syntax || item.cmd)}
                                    title={isFr ? 'Copier la commande' : 'Copy command'}
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        padding: '6px',
                                        color: copiedCmd === (item.syntax || item.cmd) ? '#00ff80' : 'var(--text-dim)',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {copiedCmd === (item.syntax || item.cmd) ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Message Snipe Inspector */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Eye size={18} color="var(--accent)" />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                            {isFr ? 'Inspecteur Snipe en Direct' : 'Live Snipe Inspector'}
                        </h4>
                    </div>

                    <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>
                        {isFr 
                            ? 'Récupérez instantanément le dernier message supprimé dans n\'importe quel salon Discord.' 
                            : 'Instantly retrieve the last deleted message in any Discord channel.'}
                    </p>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder={isFr ? 'ID du Salon Discord...' : 'Discord Channel ID...'}
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                            style={{
                                flex: 1,
                                height: '40px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                padding: '0 14px',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                        />
                        <button
                            onClick={handleFetchSnipe}
                            disabled={isSearchingSnipe}
                            className="btn-primary"
                            style={{
                                height: '40px',
                                padding: '0 16px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            <Search size={14} />
                            {isFr ? 'Snipe' : 'Snipe'}
                        </button>
                    </div>

                    {snipedData ? (
                        <div style={{
                            flex: 1,
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(0, 210, 255, 0.3)',
                            borderRadius: '12px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={13} color="var(--accent)" />
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {snipedData.author?.tag}
                                    </span>
                                </div>
                                <span style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>
                                    {new Date(snipedData.deletedAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: '#fff',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '10px',
                                borderRadius: '8px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                borderLeft: '3px solid var(--accent)'
                            }}>
                                {snipedData.content || (isFr ? '*[Aucun contenu texte]*' : '*[No text content]*')}
                            </div>
                            {snipedData.attachments?.length > 0 && (
                                <div style={{ fontSize: '11px', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Paperclip size={12} color="var(--accent)" />
                                    <span>{snipedData.attachments.length} {isFr ? 'fichier(s) joint(s)' : 'attachment(s)'}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            flex: 1,
                            minHeight: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            opacity: 0.4
                        }}>
                            <Trash2 size={28} />
                            <span style={{ fontSize: '11px', marginTop: '8px' }}>
                                {isFr ? 'En attente d\'une recherche de snipe...' : 'Waiting for snipe query...'}
                            </span>
                        </div>
                    )}

                    {/* HypeSquad Badge Quick Info Box */}
                    <div style={{
                        background: 'rgba(255, 215, 0, 0.04)',
                        border: '1px solid rgba(255, 215, 0, 0.15)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <GlowingIconBadge icon={Flame} color="#ffd700" size={16} />
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                            <b style={{ color: '#ffd700' }}>{isFr ? 'Gestion HypeSquad' : 'HypeSquad Management'} :</b> {isFr ? 'Pour retirer votre badge, tapez ' : 'To remove your badge, type '}
                            <code style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>{prefix}hypesquad leave</code>
                            {isFr ? ' ou utilisez le bouton Supprimer dans Modules.' : ' or click Remove in Modules.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
