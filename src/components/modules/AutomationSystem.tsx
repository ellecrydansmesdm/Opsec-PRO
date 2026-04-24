import React, { useState, useEffect } from 'react';
import { 
    Shield, Zap, Gift, UserX, MessageSquare, AlertTriangle, 
    MousePointer2, Play, Square, Activity, Target, Trash2,
    Plus, Check, Info, Settings, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { audioService } from '@/services/AudioService';
import { GradientCard } from '../ui/GradientCard';

interface AutomationSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

const REPORT_CATEGORIES = [
    { id: 'harassment', name: 'Harcèlement', breadcrumbs: [2, 21] },
    { id: 'spam', name: 'Spam / Liens Malveillants', breadcrumbs: [3, 28, 72] },
    { id: 'nsfw', name: 'Contenu NSFW / NSFW Sans Consentement', breadcrumbs: [1, 11] },
    { id: 'hate', name: 'Discours Haineux', breadcrumbs: [2, 22] },
    { id: 'self-harm', name: 'Automutilation / Suicide', breadcrumbs: [6, 61] },
];

export const AutomationSystem = ({ showToast }: AutomationSystemProps) => {
    const { settings, updateSetting } = useSettingsStore();
    
    // Auto Report State
    const [reportEnabled, setReportEnabled] = useState(settings.automationConfig?.autoReport?.enabled || false);
    const [reportTargetId, setReportTargetId] = useState(settings.automationConfig?.autoReport?.targetUserId || '');
    const [reportServerId, setReportServerId] = useState(settings.automationConfig?.autoReport?.targetGuildId || '');
    const [floodLimit, setFloodLimit] = useState(settings.automationConfig?.autoReport?.floodLimit || 5);
    const [insultKeywords, setInsultKeywords] = useState(settings.automationConfig?.autoReport?.insultKeywords?.join(', ') || 'fdp, connard, salope, useless');
    const [selectedCategory, setSelectedCategory] = useState(settings.automationConfig?.autoReport?.reportCategory || [3, 28, 72]);
    const [useRegex, setUseRegex] = useState(settings.automationConfig?.autoReport?.useRegex || false);
    const [scanDepth, setScanDepth] = useState(settings.automationConfig?.autoReport?.historyScanDepth || 50);

    // Multi-React State
    const [reactTargetId, setReactTargetId] = useState('');
    const [reactChannelId, setReactChannelId] = useState('');
    const [reactEmoji, setReactEmoji] = useState('🔥');
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isReacting, setIsReacting] = useState(false);

    // Snipers State
    const [nitroSniper, setNitroSniper] = useState(settings.automationConfig?.nitroSniper?.enabled || false);
    const [giveawayJoiner, setGiveawayJoiner] = useState(settings.automationConfig?.giveawayJoiner?.enabled || false);
    const [giveawayDelay, setGiveawayDelay] = useState(settings.automationConfig?.giveawayJoiner?.delay || 5000);
    const [capMonsterKey, setCapMonsterKey] = useState(settings.automationConfig?.capMonsterKey || '');
    const [capBalance, setCapBalance] = useState<number | null>(null);
    const [isCheckingKey, setIsCheckingKey] = useState(false);

    const playSound = (type: 'click' | 'success' | 'error' = 'click') => {
        if (settings.audioEnabled) audioService.play(type);
    };

    // --- REAL-TIME SYNC ENGINE ---
    useEffect(() => {
        const timer = setTimeout(() => {
            const newConfig = {
                autoReport: {
                    enabled: reportEnabled,
                    targetUserId: reportTargetId,
                    targetGuildId: reportServerId,
                    floodLimit: Number(floodLimit),
                    insultKeywords: insultKeywords.split(',').map(k => k.trim()).filter(k => k),
                    useRegex: useRegex,
                    historyScanDepth: Number(scanDepth),
                    reportCategory: selectedCategory
                },
                nitroSniper: {
                    enabled: nitroSniper,
                    priorityMain: true
                },
                giveawayJoiner: {
                    enabled: giveawayJoiner,
                    delay: Number(giveawayDelay)
                },
                capMonsterKey: capMonsterKey
            };
            
            // Only update if settings are actually different to avoid IPC spam
            if (JSON.stringify(settings.automationConfig) !== JSON.stringify(newConfig)) {
                updateSetting('automationConfig', newConfig);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [
        reportEnabled, reportTargetId, reportServerId, floodLimit, 
        insultKeywords, selectedCategory, useRegex, scanDepth,
        nitroSniper, giveawayJoiner, giveawayDelay, capMonsterKey
    ]);

    const handleCheckCapKey = async () => {
        if (!capMonsterKey) return;
        setIsCheckingKey(true);
        playSound();
        try {
            const res = await (window as any).electronAPI.checkCapMonsterKey(capMonsterKey);
            if (res.success) {
                setCapBalance(res.balance);
                if (showToast) showToast(`Clé valide ! Solde : ${res.balance}$`, 'success');
            } else {
                setCapBalance(null);
                if (showToast) showToast(`Erreur : ${res.error}`, 'danger');
            }
        } catch (e: any) {
            if (showToast) showToast(`Erreur de connexion : ${e.message}`, 'danger');
        } finally {
            setIsCheckingKey(false);
        }
    };

    const handleRunNukeReaction = async () => {
        if (!reactTargetId || !reactChannelId) {
            if (showToast) showToast('Cible et Salon requis !', 'danger');
            return;
        }

        const accountsToUse = settings.accounts.filter(acc => selectedAccounts.includes(acc.id));
        if (accountsToUse.length === 0) {
            if (showToast) showToast('Sélectionnez au moins un token !', 'danger');
            return;
        }

        setIsReacting(true);
        playSound('click');
        try {
            const res = await (window as any).electronAPI.startAutoVote({
                messageId: reactTargetId,
                channelId: reactChannelId,
                emoji: reactEmoji,
                accounts: accountsToUse
            });
            if (showToast) showToast(`Nuke de Réactions terminé (${res.successCount} succès)`, 'success');
        } catch (e: any) {
            if (showToast) showToast(`Erreur Nuke : ${e.message}`, 'danger');
        } finally {
            setIsReacting(false);
        }
    };

    const selectAllTokens = () => {
        setSelectedAccounts(settings.accounts.map(acc => acc.id));
        playSound();
    };

    return (
        <div className="animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
                <div style={{ padding: '15px', background: 'var(--accent-glow)', borderRadius: '14px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
                    <Shield size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px' }}>Automation Engine</h2>
                    <p className="caption" style={{ opacity: 0.5 }}>AUTO-REPORT, MULTI-REACT & SNIPERS</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
                
                {/* AUTO-REPORT SECTION */}
                <GradientCard accent="red">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--danger)' }}>
                        <UserX size={18} />
                        <span style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>SENTINEL GUARD : AUTO-REPORT</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div>
                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>ACTIVER LE MODULATEUR</span>
                                <p style={{ fontSize: '10px', opacity: 0.4 }}>Surveillance permanente des messages</p>
                            </div>
                            <div onClick={() => { 
                                const newState = !reportEnabled;
                                setReportEnabled(newState); 
                                playSound();
                            }} className={`nighty-toggle ${reportEnabled ? 'active' : ''}`} style={{ '--accent': 'var(--danger)' } as any}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ opacity: reportEnabled ? 1 : 0.5, pointerEvents: reportEnabled ? 'all' : 'none', transition: '0.3s' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>ID DE LA CIBLE</label>
                                        <input 
                                            type="text" 
                                            value={reportTargetId} 
                                            onChange={e => setReportTargetId(e.target.value)} 
                                            placeholder="User ID (Snowflake)..." 
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} 
                                        />
                                    </div>
                                    <div>
                                        <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>ID SERVEUR (Optionnel)</label>
                                        <input 
                                            type="text" 
                                            value={reportServerId} 
                                            onChange={e => setReportServerId(e.target.value)} 
                                            placeholder="Server ID (Snowflake)..." 
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>FLOOD LIMIT (msg/min)</label>
                                        <input 
                                            type="number" 
                                            value={floodLimit} 
                                            onChange={e => setFloodLimit(Number(e.target.value))} 
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} 
                                        />
                                    </div>
                                    <div>
                                        <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>CATÉGORIE DISCORD</label>
                                        <select 
                                            value={REPORT_CATEGORIES.find(c => JSON.stringify(c.breadcrumbs) === JSON.stringify(selectedCategory))?.id}
                                            onChange={(e) => {
                                                const cat = REPORT_CATEGORIES.find(c => c.id === e.target.value);
                                                if (cat) setSelectedCategory(cat.breadcrumbs);
                                                playSound();
                                            }}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', outline: 'none' }}
                                        >
                                            {REPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>MOTS CLÉS D'INSULTES (Séparés par virgules)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => { setUseRegex(!useRegex); playSound(); }}>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: useRegex ? 'var(--accent)' : 'var(--text-dim)' }}>MODE REGEX</span>
                                            <div className={`nighty-toggle mini ${useRegex ? 'active' : ''}`} style={{ '--accent': 'var(--accent)' } as any}>
                                                <div className="nighty-toggle-handle"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={insultKeywords} 
                                        onChange={e => setInsultKeywords(e.target.value)} 
                                        placeholder={useRegex ? "regex1, [a-z]+..." : "fdp, connard, useless..."} 
                                        style={{ width: '100%', height: '60px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', resize: 'none', fontSize: '12px' }} 
                                    />
                                </div>

                                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>PROFONDEUR D'ANALYSE (Scan Historique)</label>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="100" 
                                        step="10"
                                        value={scanDepth} 
                                        onChange={e => setScanDepth(Number(e.target.value))} 
                                        style={{ width: '100%', accentColor: 'var(--danger)' }} 
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', opacity: 0.5, fontWeight: 'bold' }}>
                                        <span>10 msgs</span>
                                        <span>{scanDepth} messages</span>
                                        <span>100 msgs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </GradientCard>

                {/* MULTI-REACT SECTION */}
                <GradientCard accent="cyan">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--accent)' }}>
                        <Zap size={18} />
                        <span style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>VOTE STORM : MULTI-ACCOUNT REACTION</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>ID MESSAGE CIBLE</label>
                                <input 
                                    type="text" 
                                    value={reactTargetId} 
                                    onChange={e => setReactTargetId(e.target.value)} 
                                    placeholder="Message ID..." 
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} 
                                />
                            </div>
                            <div>
                                <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>ID SALON CIBLE</label>
                                <input 
                                    type="text" 
                                    value={reactChannelId} 
                                    onChange={e => setReactChannelId(e.target.value)} 
                                    placeholder="Channel ID..." 
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} 
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>EMOJI DE NUKE</label>
                                <input 
                                    type="text" 
                                    value={reactEmoji} 
                                    onChange={e => setReactEmoji(e.target.value)} 
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', textAlign: 'center', fontSize: '18px' }} 
                                />
                            </div>
                            <button onClick={selectAllTokens} className="btn-secondary" style={{ height: '48px', padding: '0 15px', fontSize: '11px' }}>TOUS LES TOKENS</button>
                        </div>

                        <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '10px', border: '1px solid var(--border)' }}>
                            <label className="caption" style={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.5, marginBottom: '8px', display: 'block' }}>SÉLECTION DES COMPTES ({selectedAccounts.length})</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {settings.accounts.map(acc => (
                                    <div 
                                        key={acc.id} 
                                        onClick={() => {
                                            setSelectedAccounts(prev => prev.includes(acc.id) ? prev.filter(a => a !== acc.id) : [...prev, acc.id]);
                                            playSound();
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
                                            transition: '0.2s'
                                        }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--text-dim)' }}></div>
                                        {acc.username}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button 
                            disabled={isReacting}
                            onClick={handleRunNukeReaction} 
                            className="btn-primary" 
                            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)', height: '55px', fontWeight: '900', fontSize: '16px' }}
                        >
                            {isReacting ? 'VOTING STORM IN PROGRESS...' : 'LANCER LE NUKE DE RÉACTION'}
                        </button>
                    </div>
                </GradientCard>

                {/* SNIPERS & JOINERS */}
                <GradientCard accent="purple">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#FF73FA' }}>
                        <Gift size={18} />
                        <span style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>SNIPERS & JOINERS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{ padding: '10px', background: 'rgba(255, 115, 250, 0.1)', borderRadius: '10px', color: '#FF73FA' }}><Gift size={20} /></div>
                                <div>
                                    <span style={{ fontWeight: '900', fontSize: '14px' }}>NITRO SNIPER</span>
                                    <p style={{ fontSize: '10px', opacity: 0.4 }}>Capture auto des codes Nitro (Millisecondes)</p>
                                </div>
                            </div>
                            <div onClick={() => { 
                                const newState = !nitroSniper;
                                setNitroSniper(newState); 
                                playSound();
                            }} className={`nighty-toggle ${nitroSniper ? 'active' : ''}`} style={{ '--accent': '#FF73FA' } as any}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{ padding: '10px', background: 'rgba(0, 255, 135, 0.1)', borderRadius: '10px', color: '#00FF87' }}><Zap size={20} /></div>
                                <div>
                                    <span style={{ fontWeight: '900', fontSize: '14px' }}>GIVEAWAY JOINER</span>
                                    <p style={{ fontSize: '10px', opacity: 0.4 }}>Participation automatique aux concours</p>
                                </div>
                            </div>
                            <div onClick={() => { 
                                const newState = !giveawayJoiner;
                                setGiveawayJoiner(newState); 
                                playSound();
                            }} className={`nighty-toggle ${giveawayJoiner ? 'active' : ''}`} style={{ '--accent': '#00FF87' } as any}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', opacity: giveawayJoiner ? 1 : 0.4 }}>
                            <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>JITTER DELAY (ms)</label>
                            <input 
                                type="range" 
                                min="1000" 
                                max="30000" 
                                step="1000"
                                value={giveawayDelay} 
                                onChange={e => setGiveawayDelay(Number(e.target.value))} 
                                style={{ width: '100%', accentColor: '#00FF87' }} 
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', opacity: 0.5, fontWeight: 'bold' }}>
                                <span>1s</span>
                                <span>{Math.round(giveawayDelay / 1000)}s</span>
                                <span>30s</span>
                            </div>
                        </div>

                        {/* CapMonster Key Section */}
                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', border: '1px solid rgba(255, 115, 250, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <Settings size={14} color="#FF73FA" />
                                <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '1px' }}>CONFIG CAPTCHA SOLVER</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>CAPMONSTER API KEY</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="password" 
                                        value={capMonsterKey} 
                                        onChange={e => setCapMonsterKey(e.target.value)} 
                                        placeholder="Enter CapMonster.cloud key..." 
                                        style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', fontSize: '12px' }} 
                                    />
                                    <button 
                                        onClick={handleCheckCapKey}
                                        disabled={isCheckingKey || !capMonsterKey}
                                        style={{ 
                                            padding: '0 15px', 
                                            background: 'rgba(255, 115, 250, 0.1)', 
                                            border: '1px solid rgba(255, 115, 250, 0.3)', 
                                            borderRadius: '10px',
                                            color: '#FF73FA',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        {isCheckingKey ? <Activity size={12} className="animate-spin" /> : <Check size={12} />}
                                        {capBalance !== null ? `${capBalance}$` : 'VERIFIER'}
                                    </button>
                                </div>
                                
                                <div style={{ 
                                    marginTop: '10px',
                                    padding: '12px', 
                                    background: 'rgba(239, 68, 68, 0.05)', 
                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                    borderRadius: '10px',
                                    display: 'flex',
                                    gap: '12px'
                                }}>
                                    <AlertTriangle size={24} color="var(--danger)" style={{ flexShrink: 0 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--danger)' }}>CRITICAL REQUIREMENT</span>
                                        <p style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                            Si votre compte n'est pas vérifié par téléphone ou est récent, Discord <b>obligera</b> un Captcha. Sans clé CapMonster, le Sniper échouera systématiquement.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </GradientCard>
            </div>
        </div>
    );
};
