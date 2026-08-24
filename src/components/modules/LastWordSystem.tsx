import React, { useState, useEffect, useRef } from 'react';
import { 
    Swords, Play, Square, Sparkles, Target, Clock, MessageSquare, 
    ShieldCheck, Trophy, Flame, Zap, UserPlus, Volume2, Activity,
    CornerDownLeft, Hash, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DoubleChannelSelector } from '../ui/DoubleChannelSelector';
import { useSettingsStore } from '@/store/useSettingsStore';
import { audioService } from '@/services/AudioService';
import { HubSectionCard, HubToggleRow, HubFieldRow } from '@/components/layout/HubPageLayout';

const MotionDiv = motion.div as any;

interface LastWordSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const LastWordSystem: React.FC<LastWordSystemProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    const [selectedTargets, setSelectedTargets] = useState<{ id: string; name: string }[]>([]);
    const [phrases, setPhrases] = useState(
        "t'as cru t'allais avoir le dernier mot ?\nrespire un coup et lâche l'affaire\nje gagne tous les cardios\ncontinue de taper pour rien\ntu fatigues déjà ?\nOpsec PRO sur ton crâne"
    );
    const [delay, setDelay] = useState(120);
    const [jitter, setJitter] = useState(true);
    const [bigTextMode, setBigTextMode] = useState(true);
    const [replyMode, setReplyMode] = useState(true);
    const [sniperMode, setSniperMode] = useState(false);
    const [sniperId, setSniperId] = useState('');
    const [useMultiTokens, setUseMultiTokens] = useState(false);
    const [maxResponses, setMaxResponses] = useState(0);
    const [autoStopIdle, setAutoStopIdle] = useState(30); // seconds

    const [isRunning, setIsRunning] = useState(false);
    const [replyCount, setReplyCount] = useState(0);
    const [liveFeed, setLiveFeed] = useState<{ id: string; author: string; content: string; time: string }[]>([]);
    const [duelsWon, setDuelsWon] = useState(0);

    useEffect(() => {
        // Fetch initial status
        if (window.electronAPI && window.electronAPI.getLastWordStatus) {
            window.electronAPI.getLastWordStatus().then(res => {
                if (res.success && res.data) {
                    setIsRunning(res.data.running);
                    setReplyCount(res.data.responseCount || 0);
                }
            }).catch(() => {});
        }

        // Event listener for live replies
        const unsubReply = window.electronAPI?.onLastWordReply?.((data) => {
            setReplyCount(data.count);
            setLiveFeed(prev => [
                { id: Math.random().toString(), author: data.author, content: data.content, time: data.time },
                ...prev.slice(0, 7)
            ]);
            audioService.play('action_btn_secondary');
        });

        const unsubWon = window.electronAPI?.onLastWordDuelWon?.(() => {
            setDuelsWon(prev => prev + 1);
            setIsRunning(false);
            audioService.play('account_login_success');
            if (showToast) {
                showToast(isFr ? '🏆 Duel Cardio Gagné ! L\'adversaire a abandonné.' : '🏆 Cardio Duel Won! Opponent forfeited.', 'success');
            }
        });

        return () => {
            if (unsubReply) unsubReply();
            if (unsubWon) unsubWon();
        };
    }, [isFr, showToast]);

    const morphPhrases = () => {
        const list = phrases.split('\n').filter(p => p.trim() !== '');
        const morphed = list.map(p => {
            let n = p;
            if (Math.random() > 0.6) {
                n = n.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');
            }
            n = n.replace(/e/g, '3').replace(/a/g, '4').replace(/o/g, '0');
            return n + (Math.random() > 0.5 ? ' ⚡' : '');
        });
        setPhrases(morphed.join('\n'));
        audioService.play('action_btn_primary');
        if (showToast) showToast(isFr ? 'Variantes IA générées avec succès !' : 'AI Variants generated!', 'success');
    };

    const handleToggle = async () => {
        if (isRunning) {
            await window.electronAPI.stopLastWord();
            setIsRunning(false);
            audioService.play('module_stop');
            if (showToast) showToast(isFr ? 'Last Word désactivé' : 'Last Word stopped', 'danger');
            return;
        }

        if (selectedTargets.length === 0) {
            audioService.play('log_error_critical');
            if (showToast) showToast(isFr ? 'Sélectionnez un salon, MP ou groupe cible !' : 'Select a target channel or DM!', 'danger');
            return;
        }

        const phrasesList = phrases.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        if (phrasesList.length === 0) {
            audioService.play('log_error_critical');
            if (showToast) showToast(isFr ? 'Configurez au moins une phrase de réplique !' : 'Enter at least one reply phrase!', 'danger');
            return;
        }

        const targetId = selectedTargets[0].id;
        audioService.play('module_launch');
        setIsRunning(true);
        setLiveFeed([]);

        const res = await window.electronAPI.startLastWord({
            channelId: targetId,
            phrases: phrasesList,
            replyMode,
            bigTextMode,
            sniperMode,
            sniperId: sniperId.trim() || undefined,
            delay,
            jitter,
            maxResponses,
            autoStopAfterIdleMs: autoStopIdle * 1000,
            useMultiTokens
        });

        if (!res.success) {
            setIsRunning(false);
            audioService.play('log_error_critical');
            if (showToast) showToast(res.error || (isFr ? 'Erreur de démarrage' : 'Start failed'), 'danger');
        } else {
            if (showToast) showToast(isFr ? '⚔️ Mode Cardio actif — vous aurez le dernier mot !' : '⚔️ Cardio mode active — you will have the last word!', 'success');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Telemetry */}
            <div className="hub-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="hub-stat-card" style={{ '--stat-glow': '#00d2ff' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: isRunning ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255,255,255,0.03)', color: isRunning ? '#00d2ff' : 'var(--text-dim)' }}>
                        <Flame size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">{isFr ? 'STATUT CARDIO' : 'CARDIO STATUS'}</div>
                        <div className="hub-stat-value">{isRunning ? (isFr ? 'En combat ⚔️' : 'Dueling ⚔️') : (isFr ? 'En veille' : 'Standby')}</div>
                    </div>
                </div>

                <div className="hub-stat-card" style={{ '--stat-glow': '#62ff41' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: 'rgba(98, 255, 65, 0.12)', color: '#62ff41' }}>
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">{isFr ? 'RÉPLIQUES ENVOYÉES' : 'REPLIES SENT'}</div>
                        <div className="hub-stat-value">{replyCount}</div>
                    </div>
                </div>

                <div className="hub-stat-card" style={{ '--stat-glow': '#eab308' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#eab308' }}>
                        <Trophy size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">{isFr ? 'DUELS CARDIO GAGNÉS' : 'DUELS WON'}</div>
                        <div className="hub-stat-value">{duelsWon}</div>
                    </div>
                </div>
            </div>

            {/* Target & Duel Config */}
            <HubSectionCard icon={Target} glowColor="var(--accent)" title={isFr ? "CIBLE DU CARDIO & OPTIONS DE DUEL" : "CARDIO TARGET & DUEL OPTIONS"}>
                <div style={{ marginBottom: '16px' }}>
                    <div className="caption" style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
                        {isFr ? "Sélectionnez le salon textuel, le MP ou le groupe où vous voulez avoir le dernier mot :" : "Select the target channel, DM or group to hold the last word:"}
                    </div>
                    <DoubleChannelSelector 
                        currentId={selectedTargets[0]?.id}
                        onSelect={(id, name) => setSelectedTargets([{ id, name }])}
                    />
                </div>

                <HubToggleRow 
                    title={isFr ? "Mode Titre Géant (# Markdown)" : "Giant Title Mode (# Markdown)"}
                    description={isFr ? "Ajoute automatiquement le préfixe Markdown pour rendre vos messages gigantesques." : "Prepends # to make your reply text huge and visually dominant."}
                    active={bigTextMode}
                    onToggle={() => setBigTextMode(!bigTextMode)}
                />

                <HubToggleRow 
                    title={isFr ? "Mode Réponse Directe (Reply / Quote)" : "Direct Reply Mode (Reply / Quote)"}
                    description={isFr ? "Répond en citant directement le dernier message de l'adversaire." : "Replies directly quoting the opponent's last message."}
                    active={replyMode}
                    onToggle={() => setReplyMode(!replyMode)}
                />

                <HubToggleRow 
                    title={isFr ? "Multi-Tokens Vault (Rotation de Comptes)" : "Multi-Tokens Vault (Account Rotation)"}
                    description={isFr ? "Fait tourner vos comptes secondaires pour répondre et dérouter l'adversaire." : "Rotates responses across your Vault tokens to overwhelm the opponent."}
                    active={useMultiTokens}
                    onToggle={() => setUseMultiTokens(!useMultiTokens)}
                />

                <HubToggleRow 
                    title={isFr ? "Anti-Détection Jitter" : "Anti-Detection Jitter"}
                    description={isFr ? "Introduit de légères micro-variations aléatoires de délai pour éviter les rate limits." : "Randomizes latency to look natural and evade strict rate-limit flags."}
                    active={jitter}
                    onToggle={() => setJitter(!jitter)}
                />

                <HubToggleRow 
                    title={isFr ? "Cible Spécifique (Mention Sniper)" : "Specific Target (Mention Sniper)"}
                    description={isFr ? "Mentionne ou ne répond qu'à un utilisateur précis (ID Discord)." : "Mentions or filters responses strictly for a specific Discord User ID."}
                    active={sniperMode}
                    onToggle={() => setSniperMode(!sniperMode)}
                />

                {sniperMode && (
                    <HubFieldRow label={isFr ? "ID Discord de l'Adversaire" : "Opponent Discord User ID"}>
                        <input 
                            type="text" 
                            className="input-base"
                            placeholder="ex: 948274928174928174"
                            value={sniperId}
                            onChange={(e) => setSniperId(e.target.value)}
                            style={{ maxWidth: '300px' }}
                        />
                    </HubFieldRow>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                    <HubFieldRow label={isFr ? "Délai de réplique (ms)" : "Reply delay (ms)"}>
                        <input 
                            type="number" 
                            className="input-base"
                            value={delay}
                            onChange={(e) => setDelay(Math.max(20, Number(e.target.value)))}
                            min={20}
                            max={5000}
                        />
                    </HubFieldRow>

                    <HubFieldRow label={isFr ? "Victoire par KO / Inactivité (s)" : "Forfeit / Idle Win (s)"}>
                        <input 
                            type="number" 
                            className="input-base"
                            value={autoStopIdle}
                            onChange={(e) => setAutoStopIdle(Math.max(5, Number(e.target.value)))}
                            min={5}
                            max={300}
                        />
                    </HubFieldRow>

                    <HubFieldRow label={isFr ? "Limite de répliques (0 = infini)" : "Max replies (0 = inf)"}>
                        <input 
                            type="number" 
                            className="input-base"
                            value={maxResponses}
                            onChange={(e) => setMaxResponses(Math.max(0, Number(e.target.value)))}
                            min={0}
                        />
                    </HubFieldRow>
                </div>
            </HubSectionCard>

            {/* Phrases & Live Activity Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <HubSectionCard icon={MessageSquare} glowColor="#c084fc" title={isFr ? "PHRASES DE RÉPLIQUE (CYCLIQUES / ALÉATOIRES)" : "REPLY PHRASES (CYCLIC / RANDOM)"}>
                    <textarea 
                        className="input-base"
                        style={{ width: '100%', height: '160px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}
                        value={phrases}
                        onChange={(e) => setPhrases(e.target.value)}
                        placeholder="Une phrase par ligne..."
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button 
                            className="btn-secondary" 
                            onClick={morphPhrases}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Sparkles size={14} color="var(--accent)" />
                            {isFr ? "Variantes IA" : "AI Morph"}
                        </button>
                    </div>
                </HubSectionCard>

                <HubSectionCard icon={Activity} glowColor="#62ff41" title={isFr ? "FLUX CARDIO EN DIRECT" : "LIVE CARDIO FEED"}>
                    <div style={{ 
                        height: '160px', 
                        overflowY: 'auto', 
                        background: 'rgba(0,0,0,0.35)', 
                        borderRadius: '10px', 
                        padding: '10px 12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        {liveFeed.length === 0 ? (
                            <div style={{ margin: 'auto', color: 'var(--text-dim)', fontSize: '11px', textAlign: 'center' }}>
                                {isRunning ? (isFr ? 'En attente d\'un message de l\'adversaire...' : 'Waiting for opponent message...') : (isFr ? 'Aucune réplique en cours' : 'No active replies')}
                            </div>
                        ) : (
                            liveFeed.map(feed => (
                                <div key={feed.id} style={{ fontSize: '11px', display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace' }}>[{feed.time}]</span>
                                    <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>vs {feed.author}:</span>
                                    <span style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{feed.content}</span>
                                </div>
                            ))
                        )}
                    </div>
                </HubSectionCard>
            </div>

            {/* Launch Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button 
                    onClick={handleToggle}
                    className={isRunning ? "btn-danger" : "btn-primary"}
                    style={{ 
                        minWidth: '280px', 
                        padding: '16px 36px', 
                        fontSize: '14px', 
                        fontWeight: '800', 
                        letterSpacing: '1px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '12px',
                        boxShadow: isRunning ? '0 0 30px rgba(255, 68, 68, 0.4)' : '0 0 30px rgba(0, 210, 255, 0.4)'
                    }}
                >
                    {isRunning ? (
                        <>
                            <Square size={18} fill="currentColor" />
                            {isFr ? "ARRÊTER LE CARDIO" : "STOP LAST WORD"}
                        </>
                    ) : (
                        <>
                            <Swords size={18} />
                            {isFr ? "GARDER LE DERNIER MOT (START)" : "HOLD LAST WORD (START)"}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
