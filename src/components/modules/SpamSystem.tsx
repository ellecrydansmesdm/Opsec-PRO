import React, { useState, useEffect, useRef } from 'react';
import { 
    Zap, Play, Square, Sparkles, Target, Settings, Globe, Terminal, 
    Volume2, VolumeX, Activity, MessageSquare, ShieldCheck, HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { DoubleChannelSelector } from '../ui/DoubleChannelSelector';

const sounds = {
    start: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.2 }),
    stop: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3'], volume: 0.2 }),
    click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.1 }),
    morph: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3'], volume: 0.2 })
};

interface SpamSystemProps {
    showToast?: (message: string, type: 'success' | 'danger') => void;
}

export const SpamSystem = ({ showToast }: SpamSystemProps) => {
    const [selectedTargets, setSelectedTargets] = useState<{id: string, name: string}[]>([]);
    const [phrases, setPhrases] = useState('Opsec Pro est en ligne.\nCible identifiée.\nConnexion sécurisée.');
    const [delay, setDelay] = useState(1000);
    const [jitter, setJitter] = useState(true);
    const [maxMessages, setMaxMessages] = useState(0);
    const [proxies, setProxies] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [localLogs, setLocalLogs] = useState<string[]>([]);
    const [chartData, setChartData] = useState<{time: string, count: number}[]>([]);
    const [showProxyTooltip, setShowProxyTooltip] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const playSound = (key: keyof typeof sounds) => {
        if (!isMuted) sounds[key].play();
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
            if (showToast) showToast('Veuillez sélectionner au moins une cible pour lancer le Nuke !', 'danger');
            addLocalLog("❌ ERREUR : Aucune cible");
            return;
        }
        const phrasesList = phrases.split('\n').filter(p => p.trim() !== '');
        if (phrasesList.length === 0) return;

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
        <div className="glass-card animate-fade-in" style={{ padding: '35px', position: 'relative', background: 'rgba(10, 10, 15, 0.98)', borderLeft: `5px solid ${isRunning ? 'var(--accent)' : 'var(--accent)'}`, transition: '0.3s' }}>
            <style>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
            `}</style>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '15px', background: 'rgba(0, 255, 65, 0.1)', borderRadius: '14px', color: 'var(--accent)', boxShadow: '0 0 20px rgba(0, 255, 65, 0.2)' }}>
                        <Zap size={24} className={isRunning ? "animate-pulse" : ""} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' }}>Social Utilities : Spam Pro</h2>
                        <p className="caption" style={{ opacity: 0.5, fontSize: '9px', fontWeight: 'bold' }}>SÉCURITÉ OPTIMISÉE & MULTI-CIBLES</p>
                    </div>
                </div>
                <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.4 }}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '35px' }}>
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
                                    <div key={t.id} style={{ padding: '8px 14px', background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.3)', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}>
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
                            <button onClick={morphPhrases} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                <Sparkles size={14} /> IA MORPH
                            </button>
                        </div>
                        <textarea value={phrases} onChange={e => setPhrases(e.target.value)} placeholder="Un message par ligne..." style={{ width: '100%', height: '110px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '10px', padding: '15px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', lineHeight: '1.5' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <span className="caption" style={{ fontSize: '9px', fontWeight: 'bold' }}>DÉLAI (MS)</span>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                                <input type="number" placeholder="1000" value={delay} onChange={e => setDelay(Number(e.target.value))} style={{ width: '100%', background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '18px', outline: 'none' }} />
                                <Settings size={14} style={{ opacity: 0.3 }} />
                            </div>
                        </div>
                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span className="caption" style={{ fontSize: '9px', fontWeight: 'bold' }}>VARIATION</span>
                                <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '2px' }}>ANTI-BAN PROTECT</p>
                            </div>
                            <div onClick={() => setJitter(!jitter)} className={`nighty-toggle ${jitter ? 'active' : ''}`}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Globe size={14} color="var(--accent)" />
                            <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>PROXIES (IP:PORT)</label>
                            
                            {/* Infobulle Cyberpunk Stable React-Managed */}
                            <div 
                                style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '4px', cursor: 'pointer' }}
                                onMouseEnter={() => setShowProxyTooltip(true)}
                                onMouseLeave={() => setShowProxyTooltip(false)}
                            >
                                <HelpCircle size={12} style={{ opacity: showProxyTooltip ? 1 : 0.4 }} className="transition-opacity text-accent" />
                                
                                <div style={{
                                    visibility: showProxyTooltip ? 'visible' : 'hidden',
                                    opacity: showProxyTooltip ? 1 : 0,
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '0',
                                    marginBottom: '10px',
                                    width: '260px',
                                    padding: '15px',
                                    background: '#0a0a0f',
                                    border: '1px solid var(--accent)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '11px',
                                    lineHeight: '1.5',
                                    zIndex: 1000,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,65,0.1)',
                                    transition: 'all 0.2s ease-in-out',
                                    pointerEvents: 'none'
                                }}>
                                    <b style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px', fontSize: '9px' }}>ROTATION D'IP AUTOMATIQUE</b>
                                    Ça permet d'utiliser d'autres adresses IP que la tienne. Le bot va changer d'IP tous les 15 messages pour rester totalement invisible. Ton IP perso est ainsi protégée !
                                    <div style={{ position: 'absolute', top: '100%', left: '10px', border: '6px solid transparent', borderTopColor: 'var(--accent)' }}></div>
                                </div>
                            </div>
                        </div>
                        <textarea value={proxies} placeholder="Ex: 127.0.0.1:8080" onChange={e => setProxies(e.target.value)} style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '11px', resize: 'none', outline: 'none', fontFamily: 'monospace' }} />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '20px' }}>
                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={14} color="var(--accent)" />
                                    <span className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>DÉBIT ACTIVITÉ</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--accent)' }}>{sentCount} envois</span>
                            </div>
                            <div style={{ height: '45px', width: '100%', opacity: isRunning ? 1 : 0.2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="rgba(0, 255, 65, 0.08)" strokeWidth={2.5} isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <button 
                            onClick={handleToggleSpam}
                            className="btn-primary" 
                            style={{ 
                                width: '100%', 
                                height: '65px', 
                                background: isRunning ? 'var(--danger)' : 'var(--accent)',
                                boxShadow: isRunning ? '0 0 30px var(--danger-glow)' : '0 0 30px var(--accent-glow)',
                                fontSize: '16px',
                                fontWeight: '900',
                                letterSpacing: '2px',
                                textTransform: 'uppercase'
                            }}
                        >
                            {isRunning ? 'ARRÊTER LE NUKE' : 'LANCER LE NUKE'}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={14} color="var(--accent)" />
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>PROTOCOLE : {isRunning ? 'ÉTABLI' : 'STABLE'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={14} color="var(--accent)" />
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>{localLogs[localLogs.length - 1] || 'SCAN EN ATTENTE'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRunning ? 'var(--accent)' : '#ff4141', boxShadow: '0 0 10px currentColor' }}></div>
                    <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.4 }}>OPSEC PRO v1.1.0</span>
                </div>
            </div>
        </div>
    );
};
