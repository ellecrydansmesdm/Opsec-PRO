import React, { useState, useEffect, useRef } from 'react';
import { 
    Zap, Play, Square, Sparkles, Target, Clock, Globe, Terminal, 
    Volume2, VolumeX, Activity, MessageSquare, ShieldCheck, HelpCircle,
    UserPlus, Eye, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { DoubleChannelSelector } from '../ui/DoubleChannelSelector';
import { useSettingsStore } from '@/store/useSettingsStore';
import { audioService, SoundEvent } from '@/services/AudioService';
import { HubSectionCard, HubToggleRow, HubFieldRow } from '@/components/layout/HubPageLayout';

interface SpamSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const SpamSystem = ({ showToast }: SpamSystemProps) => {
    const { settings, updateSetting } = useSettingsStore();
    const [selectedTargets, setSelectedTargets] = useState<{id: string, name: string}[]>([]);
    const [phrases, setPhrases] = useState('');
    const [delay, setDelay] = useState(1000);
    const [jitter, setJitter] = useState(true);
    const [maxMessages, setMaxMessages] = useState(0);
    const [proxies, setProxies] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    
    // Formatting States
    const [bigTextMode, setBigTextMode] = useState(false);
    const [replyMode, setReplyMode] = useState(false);
    const [spamSingleMessage, setSpamSingleMessage] = useState(false);
    
    // Sniper Mode States
    const [sniperMode, setSniperMode] = useState(false);
    const [sniperId, setSniperId] = useState('');

    const [sentCount, setSentCount] = useState(0);
    const [localLogs, setLocalLogs] = useState<string[]>([]);
    const [chartData, setChartData] = useState<{time: string, count: number}[]>([]);
    const [showProxyTooltip, setShowProxyTooltip] = useState(false);
    const [showJitterTooltip, setShowJitterTooltip] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);



    const addLocalLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLocalLogs(prev => [...prev.slice(-4), `[${time}] ${msg}`]);
    };

    const morphPhrases = () => {
        const list = phrases.split('\n').filter(p => p.trim() !== '');
        const morphed = list.map(p => {
            let nData = p;
            if (Math.random() > 0.7) nData = nData.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');
            nData = nData.replace(/e/g, '3').replace(/a/g, '4').replace(/o/g, '0').replace(/s/g, '$');
            return nData + (Math.random() > 0.5 ? ' !' : '');
        });
        setPhrases(morphed.join('\n'));
        addLocalLog("IA : Variantes générées");
    };

    const handleToggleSpam = async () => {
        const isFr = settings.language === 'fr';
        if (isRunning) {
            await window.electronAPI.stopSpam();
            setIsRunning(false);
            audioService.play('spam_stop');
            addLocalLog(isFr ? "⏹️ SESSION TERMINÉE" : "⏹️ SESSION ENDED");
            return;
        }

        if (selectedTargets.length === 0) {
            if (showToast) showToast(isFr ? 'Sélectionnez au moins une cible !' : 'Select at least one target!', 'danger');
            addLocalLog(isFr ? "❌ ERREUR : Aucune cible" : "❌ ERROR: No targets");
            return;
        }

        let phrasesList: string[] = [];
        if (spamSingleMessage) {
            const trimmedPhrases = phrases.trim();
            if (trimmedPhrases.length === 0) {
                if (showToast) showToast(isFr ? 'Entrez un message !' : 'Enter a message!', 'danger');
                return;
            }
            phrasesList = [trimmedPhrases];
        } else {
            phrasesList = phrases.split('\n').filter(p => p.trim() !== '');
            if (phrasesList.length === 0) {
                if (showToast) showToast(isFr ? 'Entrez au moins un message !' : 'Enter at least one message!', 'danger');
                return;
            }
        }

        // 1. Sniper Prefix logic (Apply first)
        if (sniperMode && sniperId.trim()) {
            const mention = `<@${sniperId.trim()}> `;
            phrasesList = phrasesList.map(p => mention + p);
            addLocalLog(isFr ? `🎯 SNIPER ACTIF : Cible ${sniperId}` : `🎯 SNIPER ACTIVE: Target ${sniperId}`);
        }

        // 2. Automatic H1 Prefixing (Apply last to ensure it's at the very start)
        if (bigTextMode) {
            phrasesList = phrasesList.map(p => p.startsWith('# ') ? p : `# ${p}`);
        }

        const accountsToUse = settings.accounts.filter(acc => selectedAccounts.includes(acc.id));
        if (accountsToUse.length === 0) {
            if (showToast) showToast(isFr ? 'Sélectionnez au moins un token !' : 'Select at least one token!', 'danger');
            addLocalLog(isFr ? "❌ ERREUR : Aucun token sélectionné" : "❌ ERROR: No tokens selected");
            return;
        }

        setIsRunning(true);
        setSentCount(0);
        setChartData([]);
        audioService.play('spam_start');
        addLocalLog(isFr ? `▶️ LANCEMENT SUR ${selectedTargets.length} CIBLE(S)` : `▶️ LAUNCHING ON ${selectedTargets.length} TARGET(S)`);
        
        try {
            const res = await window.electronAPI.startSpam({
                channelIds: selectedTargets.map(t => t.id),
                texts: phrasesList,
                delay,
                jitter,
                maxMessages,
                proxies: proxies.split('\n').filter(p => p.trim() !== ''),
                accounts: accountsToUse,
                replyMode,
                // UI Recovery fields
                uiPhrases: phrases,
                uiSelectedTargets: selectedTargets,
                uiSelectedAccounts: selectedAccounts,
                uiBigTextMode: bigTextMode,
                uiSniperMode: sniperMode,
                uiSniperId: sniperId,
                uiSpamSingleMessage: spamSingleMessage
            });
            if (!res.success) {
                if (showToast) showToast(res.error || (isFr ? 'Erreur de lancement' : 'Failed to start'), 'danger');
                setIsRunning(false);
                audioService.play('spam_stop');
            }
        } catch (err: any) {
            addLocalLog(isFr ? `💀 ERREUR : ${err.message}` : `💀 ERROR: ${err.message}`);
            setIsRunning(false);
            audioService.play('spam_stop');
        }
    };

    useEffect(() => {
        if (window.electronAPI) {
            const checkSpamStatus = async () => {
                try {
                    const res = await window.electronAPI.getSpamStatus();
                    if (res && res.success && res.data) {
                        if (res.data.running) {
                            setIsRunning(true);
                            setSentCount(res.data.count);
                            const cfg = res.data.config;
                            if (cfg) {
                                if (cfg.uiPhrases !== undefined) setPhrases(cfg.uiPhrases);
                                if (cfg.uiSelectedTargets !== undefined) setSelectedTargets(cfg.uiSelectedTargets);
                                if (cfg.uiSelectedAccounts !== undefined) setSelectedAccounts(cfg.uiSelectedAccounts);
                                if (cfg.uiBigTextMode !== undefined) setBigTextMode(cfg.uiBigTextMode);
                                if (cfg.uiSniperMode !== undefined) setSniperMode(cfg.uiSniperMode);
                                if (cfg.uiSniperId !== undefined) setSniperId(cfg.uiSniperId);
                                if (cfg.delay !== undefined) setDelay(cfg.delay);
                                if (cfg.jitter !== undefined) setJitter(cfg.jitter);
                                if (cfg.maxMessages !== undefined) setMaxMessages(cfg.maxMessages);
                                if (cfg.replyMode !== undefined) setReplyMode(cfg.replyMode);
                                if (cfg.proxies !== undefined) setProxies(cfg.proxies.join('\n'));
                                if (cfg.uiSpamSingleMessage !== undefined) setSpamSingleMessage(cfg.uiSpamSingleMessage);
                            }
                        }
                    }
                } catch (e) {}
            };
            checkSpamStatus();
        }
    }, []);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onLog((log: any) => {
            if (isRunning) {
                if (log.msg.includes('[SUCCESS]')) {
                    setSentCount(prev => {
                        const next = prev + 1;
                        setChartData(cData => [...cData.slice(-10), { time: new Date().toLocaleTimeString(), count: next }]);
                        return next;
                    });
                } else if (log.msg.includes('Spam terminé')) {
                    setIsRunning(false);
                    audioService.play('spam_campaign_end');
                } else if (log.msg.includes('Spam interrompu')) {
                    setIsRunning(false);
                    audioService.play('spam_stop');
                }
            }
        });
        return () => unsubscribe();
    }, [isRunning]);

    return (
        <HubSectionCard icon={Zap} glowColor={isRunning ? "var(--danger)" : "var(--accent)"} title="Social Utilities : Spam Pro" className="animate-fade-in">
            <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                {settings.language === 'fr' ? 'PROTOCOLE DE SATURATION MULTI-CIBLES' : 'MULTI-TARGET FLOOD PROTOCOL'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                {/* Left Panel: Targeting & Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ padding: '25px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                        <label className="caption" style={{ display: 'block', marginBottom: '15px', fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                            {settings.language === 'fr' ? 'SÉLECTION DES CIBLES' : 'TARGET SELECTION'}
                        </label>
                        <DoubleChannelSelector 
                            allowMultiple
                            selectedIds={selectedTargets.map(t => t.id)}
                            selectedAccountIds={selectedAccounts}
                            onSelect={(id, name) => {
                                if (!selectedTargets.find(t => t.id === id)) {
                                    setSelectedTargets([...selectedTargets, { id, name }]);
                                }
                            }}
                            onRemove={(id) => setSelectedTargets(selectedTargets.filter(t => t.id !== id))}
                        />
                        {selectedTargets.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
                                {selectedTargets.map(t => (
                                    <div key={t.id} style={{ padding: '8px 14px', background: 'rgba(0, 210, 255, 0.08)', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}>
                                        <span style={{ color: 'var(--accent)' }}>{t.name}</span>
                                        <button onClick={() => setSelectedTargets(selectedTargets.filter(x => x.id !== t.id))} style={{ color: 'white', opacity: 0.6, border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: '1' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '25px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                {settings.language === 'fr' ? 'MESSAGES PERSONNALISÉS' : 'CUSTOM MESSAGES'}
                            </label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                                    <Upload size={14} /> {settings.language === 'fr' ? 'IMPORTER TXT' : 'IMPORT TXT'}
                                    <input type="file" accept=".txt" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const text = await file.text();
                                            const cleanText = text.replace(/\r\n/g, '\n').trim();
                                            setPhrases(prev => prev ? prev + '\n' + cleanText : cleanText);
                                            addLocalLog(settings.language === 'fr' ? `TXT importé : ${file.name}` : `TXT imported: ${file.name}`);
                                            e.target.value = '';
                                        }
                                    }} />
                                </label>
                                <button onClick={morphPhrases} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                    <Sparkles size={14} /> {settings.language === 'fr' ? 'IA MORPH' : 'AI MORPH'}
                                </button>
                            </div>
                        </div>
                        <textarea value={phrases} onChange={e => setPhrases(e.target.value)} placeholder={spamSingleMessage ? (settings.language === 'fr' ? "Votre message à spammer en boucle..." : "Your message to spam in a loop...") : (settings.language === 'fr' ? "Un message par ligne..." : "One message per line...")} style={{ width: '100%', height: '110px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '10px', padding: '15px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', lineHeight: '1.5' }} />
                        
                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '12px' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{settings.language === 'fr' ? 'MESSAGE UNIQUE EN BOUCLE' : 'SPAM SINGLE MESSAGE BLOCK'}</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>{settings.language === 'fr' ? 'Spamme le texte entier comme un seul bloc' : 'Spams the entire text as a single block'}</p>
                            </div>
                            <div onClick={() => { setSpamSingleMessage(!spamSingleMessage); }} className={`nighty-toggle ${spamSingleMessage ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '12px' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{settings.language === 'fr' ? 'MODE TITRE GEANT (H1)' : 'GIANT TITLE MODE (H1)'}</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>{settings.language === 'fr' ? 'Ajoute "# " devant chaque message' : 'Prepends "# " to each message'}</p>
                            </div>
                            <div onClick={() => setBigTextMode(!bigTextMode)} className={`nighty-toggle ${bigTextMode ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '12px' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{settings.language === 'fr' ? 'MODE RÉPONSE (REPLY MODE)' : 'REPLY MODE'}</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>
                                    {settings.language === 'fr' ? "Répond au dernier message d'un autre utilisateur dans le salon" : "Replies to the last message of another user in the channel"}
                                </p>
                            </div>
                            <div onClick={() => setReplyMode(!replyMode)} className={`nighty-toggle ${replyMode ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Controls & Sniper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {/* Multi-Token Account Selection */}
                    <div style={{ padding: '25px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                {settings.language === 'fr' ? `SÉLECTION DES TOKENS (${selectedAccounts.length})` : `TOKEN SELECTION (${selectedAccounts.length})`}
                            </label>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setSelectedAccounts(settings.accounts.map(acc => acc.id));
                                }} 
                                className="btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '9px', height: '24px' }}
                            >
                                {settings.language === 'fr' ? 'TOUS LES TOKENS' : 'ALL TOKENS'}
                            </button>
                        </div>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }} className="custom-scrollbar">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {settings.accounts.map(acc => (
                                    <div 
                                        key={acc.id} 
                                        onClick={() => {
                                            setSelectedAccounts(prev => prev.includes(acc.id) ? prev.filter(a => a !== acc.id) : [...prev, acc.id]);
                                        }}
                                        style={{ 
                                            padding: '8px 12px', 
                                            background: selectedAccounts.includes(acc.id) ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255,255,255,0.02)', 
                                            border: `1px solid ${selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--border)'}`,
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: '0.2s',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--text-dim)', flexShrink: 0 }}></div>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.username}</span>
                                    </div>
                                ))}
                                {settings.accounts.length === 0 && (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '10px', opacity: 0.4, fontSize: '10px' }}>
                                        {settings.language === 'fr' ? "Aucun compte configuré. Connectez-vous sur l'application." : "No accounts configured. Log in on the application."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sniper Mode Config */}
                    <div style={{ padding: '25px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--danger-glow)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Target size={16} color="var(--danger)" />
                                <span className="caption" style={{ color: 'var(--danger)', fontWeight: '900' }}>SNIPER AUTO-PING</span>
                            </div>
                            <div onClick={() => setSniperMode(!sniperMode)} className={`nighty-toggle ${sniperMode ? 'active' : ''}`} style={{ '--accent': 'var(--danger)' } as any}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>
                        
                        <div style={{ position: 'relative', opacity: sniperMode ? 1 : 0.4, transition: '0.3s' }}>
                            <UserPlus size={14} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input 
                                type="text" 
                                disabled={!sniperMode}
                                placeholder={settings.language === 'fr' ? "ID de la cible à mentionner..." : "Target ID to mention..."} 
                                value={sniperId}
                                onChange={e => setSniperId(e.target.value)}
                                style={{ width: '100%', padding: '15px 15px 15px 45px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', fontSize: '12px', outline: 'none' }}
                            />
                        </div>
                        <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '10px' }}>
                            {sniperMode 
                                ? (settings.language === 'fr' ? "⚡ Chaque phrase sera précédée d'une mention pour forcer la notification." : "⚡ Each sentence will be prepended with a mention to force notifications.")
                                : (settings.language === 'fr' ? "Inactif : Le spam utilisera les phrases brutes." : "Inactive: Spam will use raw messages.")
                            }
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <HubFieldRow label={settings.language === 'fr' ? "DÉLAI (MS)" : "DELAY (MS)"}>
                            <input type="number" value={delay} onChange={e => setDelay(Number(e.target.value))} className="input-field settings-select" style={{ width: '100%', fontWeight: '900', fontSize: '18px', color: 'var(--accent)' }} />
                        </HubFieldRow>
                        <div className="settings-item-row hub-toggle-row" style={{ position: 'relative' }}>
                            <div className="hub-toggle-row-text" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <p className="hub-toggle-row-title">Anti-Ban Jitter</p>
                                    <div 
                                        onMouseEnter={() => setShowJitterTooltip(true)}
                                        onMouseLeave={() => setShowJitterTooltip(false)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '50%',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            fontSize: '9px',
                                            color: 'var(--text-dim)',
                                            cursor: 'help',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        ?
                                    </div>
                                </div>
                                <p className="hub-toggle-row-desc">{settings.language === 'fr' ? 'Variation aléatoire du délai' : 'Random delay variation'}</p>
                            </div>
                            
                            {showJitterTooltip && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 10px)',
                                    left: '15px',
                                    width: '260px',
                                    background: '#0a0a0f',
                                    border: '1px solid var(--accent)',
                                    padding: '12px 15px',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px var(--accent-glow)',
                                    zIndex: 1000,
                                    fontSize: '10px',
                                    lineHeight: '1.4',
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    pointerEvents: 'none'
                                }}>
                                    <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>ANTI-BAN JITTER</strong>
                                    {settings.language === 'fr' 
                                        ? "Le Jitter ajoute une légère variation aléatoire de délai (+0 à +50ms) et sélectionne des phrases au hasard. Cela simule un rythme humain et évite que les filtres automatiques de Discord ne détectent et bannissent votre compte pour spam régulier."
                                        : "Jitter adds a slight random delay variation (+0 to +50ms) and shuffles sentences. This simulates a human rhythm and prevents Discord's automated filters from detecting and banning your account."
                                    }
                                </div>
                            )}

                            <div
                                onClick={() => setJitter(!jitter)}
                                className={`nighty-toggle ${jitter ? 'active' : ''}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="nighty-toggle-handle" />
                            </div>
                        </div>
                    </div>

                    <div className="settings-item-row hub-field-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={14} color="var(--accent)" />
                                <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.6 }}>{settings.language === 'fr' ? 'MESSAGES ENVOYÉS' : 'SENT MESSAGES'}</span>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: isRunning ? 'var(--danger)' : 'var(--accent)' }}>{sentCount}</span>
                        </div>
                        <div style={{ height: '50px', width: '100%', opacity: isRunning ? 1 : 0.2 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <Area type="monotone" dataKey="count" stroke={isRunning ? 'var(--danger)' : 'var(--accent)'} fill={isRunning ? 'rgba(255, 62, 62, 0.1)' : 'rgba(0, 210, 255, 0.1)'} strokeWidth={2.5} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <button type="button" onClick={handleToggleSpam} className="btn-primary" style={{ width: '100%', height: '56px', marginTop: '12px', background: isRunning ? 'var(--danger)' : 'var(--accent)', boxShadow: isRunning ? '0 0 30px var(--danger-glow)' : '0 0 30px var(--accent-glow)', fontWeight: '900' }}>
                            {isRunning 
                                ? (settings.language === 'fr' ? 'ARRÊTER LE NUKE' : 'STOP FLOOD') 
                                : (settings.language === 'fr' ? 'LANCER LE NUKE' : 'START FLOOD')
                            }
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={12} /> {settings.language === 'fr' ? 'MODE :' : 'MODE:'} {isRunning ? (settings.language === 'fr' ? 'AGRESSIF' : 'AGGRESSIVE') : 'STABLE'}</span>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Terminal size={12} /> {localLogs[localLogs.length - 1] || (settings.language === 'fr' ? 'SCAN EN ATTENTE' : 'WAITING FOR SESSION')}</span>
                </div>
            </div>
        </HubSectionCard>
    );
};
