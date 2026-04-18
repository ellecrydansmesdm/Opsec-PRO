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
    
    // Sniper Mode States
    const [sniperMode, setSniperMode] = useState(false);
    const [sniperId, setSniperId] = useState('');

    const [sentCount, setSentCount] = useState(0);
    const [localLogs, setLocalLogs] = useState<string[]>([]);
    const [chartData, setChartData] = useState<{time: string, count: number}[]>([]);
    const [showProxyTooltip, setShowProxyTooltip] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const playSound = (key: string) => {
        if (!settings.audioEnabled) return;
        const eventMap: Record<string, SoundEvent> = {
            'start': 'success',
            'stop': 'error',
            'morph': 'click',
            'click': 'click'
        };
        audioService.play((eventMap[key] || key) as SoundEvent);
    };

    const addLocalLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLocalLogs(prev => [...prev.slice(-4), `[${time}] ${msg}`]);
    };

    const morphPhrases = () => {
        playSound('morph');
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
        if (isRunning) {
            await window.electronAPI.stopSpam();
            setIsRunning(false);
            playSound('stop');
            addLocalLog("⏹️ SESSION TERMINÉE");
            return;
        }

        if (selectedTargets.length === 0) {
            if (showToast) showToast('Sélectionnez au moins une cible !', 'danger');
            addLocalLog("❌ ERREUR : Aucune cible");
            return;
        }

        let phrasesList = phrases.split('\n').filter(p => p.trim() !== '');
        if (phrasesList.length === 0) {
            if (showToast) showToast('Entrez au moins un message !', 'danger');
            return;
        }

        // 1. Sniper Prefix logic (Apply first)
        if (sniperMode && sniperId.trim()) {
            const mention = `<@${sniperId.trim()}> `;
            phrasesList = phrasesList.map(p => mention + p);
            addLocalLog(`🎯 SNIPER ACTIF : Cible ${sniperId}`);
        }

        // 2. Automatic H1 Prefixing (Apply last to ensure it's at the very start)
        if (bigTextMode) {
            phrasesList = phrasesList.map(p => p.startsWith('# ') ? p : `# ${p}`);
        }

        setIsRunning(true);
        setSentCount(0);
        setChartData([]);
        playSound('start');
        addLocalLog(`▶️ LANCEMENT SUR ${selectedTargets.length} CIBLE(S)`);
        
        try {
            await window.electronAPI.startSpam({
                channelIds: selectedTargets.map(t => t.id),
                texts: phrasesList,
                delay,
                jitter,
                maxMessages,
                proxies: proxies.split('\n').filter(p => p.trim() !== '')
            });
        } catch (err: any) {
            addLocalLog(`💀 ERREUR : ${err.message}`);
        } finally {
            setIsRunning(false);
            addLocalLog("⏹️ MISSION TERMINÉE");
        }
    };

    useEffect(() => {
        const unsubscribe = window.electronAPI.onLog((log: any) => {
            if (isRunning && log.msg.includes('[SUCCESS]')) {
                setSentCount(prev => {
                    const next = prev + 1;
                    setChartData(cData => [...cData.slice(-10), { time: new Date().toLocaleTimeString(), count: next }]);
                    return next;
                });
            }
        });
        return () => unsubscribe();
    }, [isRunning]);

    return (
        <div className="glass-card animate-fade-in" style={{ 
            padding: '35px', 
            position: 'relative', 
            background: `rgba(10, 10, 15, ${settings.themeOpacity})`,
            borderLeft: `5px solid min(100%, ${isRunning ? 'var(--danger)' : 'var(--accent)'})`, 
            transition: 'all 0.3s ease' 
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        padding: '15px', 
                        background: isRunning ? 'var(--danger-glow)' : 'rgba(0, 255, 65, 0.1)', 
                        borderRadius: '14px', 
                        color: isRunning ? 'var(--danger)' : 'var(--accent)', 
                        boxShadow: `0 0 20px ${isRunning ? 'var(--danger-glow)' : 'rgba(0, 255, 65, 0.2)'}` 
                    }}>
                        <Zap size={24} className={isRunning ? "animate-pulse" : ""} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' }}>Social Utilities : Spam Pro</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                            <Activity size={10} />
                            <p className="caption" style={{ fontSize: '9px', fontWeight: 'bold' }}>PROTOCOLE DE SATURATION MULTI-CIBLES</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                {/* Left Panel: Targeting & Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ padding: '25px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                        <label className="caption" style={{ display: 'block', marginBottom: '15px', fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>SÉLECTION DES CIBLES</label>
                        <DoubleChannelSelector 
                            allowMultiple
                            selectedIds={selectedTargets.map(t => t.id)}
                            onSelect={(id, name) => {
                                if (!selectedTargets.find(t => t.id === id)) {
                                    setSelectedTargets([...selectedTargets, { id, name }]);
                                    playSound('click');
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
                            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>MESSAGES PERSONNALISÉS</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                                    <Upload size={14} /> IMPORTER TXT
                                    <input type="file" accept=".txt" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const text = await file.text();
                                            // Handle potential Windows/Linux newlines properly and append
                                            const cleanText = text.replace(/\r\n/g, '\n').trim();
                                            setPhrases(prev => prev ? prev + '\n' + cleanText : cleanText);
                                            addLocalLog(`TXT importé : ${file.name}`);
                                            playSound('click');
                                            // Reset the input value so the same file could be selected again if needed
                                            e.target.value = '';
                                        }
                                    }} />
                                </label>
                                <button onClick={morphPhrases} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                    <Sparkles size={14} /> IA MORPH
                                </button>
                            </div>
                        </div>
                        <textarea value={phrases} onChange={e => setPhrases(e.target.value)} placeholder="Un message par ligne..." style={{ width: '100%', height: '110px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '10px', padding: '15px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', lineHeight: '1.5' }} />
                        
                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '12px' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>MODE TITRE GEANT (H1)</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>Ajoute "# " devant chaque message</p>
                            </div>
                            <div onClick={() => setBigTextMode(!bigTextMode)} className={`nighty-toggle ${bigTextMode ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Controls & Sniper */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
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
                                placeholder="ID de la cible à mentionner..." 
                                value={sniperId}
                                onChange={e => setSniperId(e.target.value)}
                                style={{ width: '100%', padding: '15px 15px 15px 45px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', fontSize: '12px', outline: 'none' }}
                            />
                        </div>
                        <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '10px' }}>
                            {sniperMode ? "⚡ Chaque phrase sera précédée d'une mention pour forcer la notification." : "Inactif : Le spam utilisera les phrases brutes."}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <span className="caption" style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-dim)', letterSpacing: '1px' }}>DÉLAI (ms)</span>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                                <input 
                                    type="number" 
                                    value={delay} 
                                    onChange={e => setDelay(Number(e.target.value))} 
                                    className="no-arrows"
                                    style={{ 
                                        width: '100%', 
                                        background: 'none', 
                                        border: 'none', 
                                        color: 'var(--accent)', 
                                        fontWeight: '900', 
                                        fontSize: '22px', 
                                        outline: 'none',
                                        fontFamily: 'var(--font-tech)' 
                                    }} 
                                />
                                <Clock size={14} style={{ opacity: 0.3 }} />
                            </div>
                        </div>
                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '9px', fontWeight: 'bold' }}>ANTI-BAN</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>JITTER MODE</p>
                            </div>
                            <div onClick={() => setJitter(!jitter)} className={`nighty-toggle ${jitter ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={14} color="var(--accent)" />
                                    <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.6 }}>MESSAGES ENVOYÉS</span>
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
                        </div>

                        <button 
                            onClick={handleToggleSpam}
                            className="btn-primary" 
                            style={{ 
                                width: '100%', 
                                height: '70px', 
                                background: isRunning ? 'var(--danger)' : 'var(--accent)',
                                boxShadow: isRunning ? '0 0 30px var(--danger-glow)' : '0 0 30px var(--accent-glow)',
                                fontSize: '18px',
                                fontWeight: '900',
                                textTransform: 'uppercase'
                            }}
                        >
                            {isRunning ? 'ARRÊTER LE NUKE' : 'LANCER LE NUKE'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={14} color={isRunning ? 'var(--danger)' : 'var(--accent)'} />
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>MODE : {isRunning ? 'AGRESSIF' : 'STABLE'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={14} color="var(--accent)" />
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>{localLogs[localLogs.length - 1] || 'SCAN EN ATTENTE'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.3 }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRunning ? 'var(--danger)' : 'var(--accent)' }}></div>
                    <span style={{ fontSize: '9px', fontWeight: '900' }}>OPSEC PRO ENGINE</span>
                </div>
            </div>
        </div>
    );
};
