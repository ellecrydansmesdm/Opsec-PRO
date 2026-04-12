import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { 
    RefreshCw, AlertTriangle, Clock, ShieldCheck, Zap, 
    Play, Square, Info, Type, FileText, Smile, Gamepad2,
    CheckCircle2, PauseCircle, Timer, BarChart3, X, Trash2
} from 'lucide-react';
import { RotatorConfig } from '../../shared/types';
import { Notification } from '@/components/ui/Notification';
import { DoubleChannelSelector } from '@/components/ui/DoubleChannelSelector';

export const Animations = () => {
    const { settings, updateSetting } = useSettingsStore();
    const { user } = useUserStore();
    const [notif, setNotif] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    
    // Real-time Pulse Stats
    const [pulseData, setPulseData] = useState<{
        nextTick: number,
        totalRotations: number,
        lastRotationTime?: number,
        pausedUsernameUntil?: number
    } | null>(null);

    const [channels, setChannels] = useState<{ servers: any[], dms: any[] }>({ servers: [], dms: [] });

    useEffect(() => {
        (window.electronAPI as any).getChannels().then((res: any) => {
            if (res.success) setChannels(res.data);
        });
    }, []);

    const currentAccount = useMemo(() => settings.accounts?.find(a => a.id === user?.id), [settings.accounts, user?.id]);
    
    const rotator = useMemo(() => currentAccount?.rotator || {
        enabled: false,
        interval: 60,
        statuses: [],
        bios: [],
        usernames: [],
        customRPCs: [],
        activities: [],
        currentStatusIndex: 0,
        currentBioIndex: 0,
        currentUsernameIndex: 0,
        currentActivityIndex: 0,
        currentClanTagIndex: 0,
        clanTags: [],
        enabledSections: {
            status: true,
            bio: true,
            username: false,
            activity: true,
            clanTag: false
        },
        stats: {
            messagesToday: 0,
            totalMessages: 0
        },
        totalRotations: 0
    }, [currentAccount]);

    useEffect(() => {
        const removePulse = (window.electronAPI as any).onRotatorPulse((data: any) => {
            setPulseData(data);
        });
        return () => removePulse();
    }, []);

    // Debounced Save to Backend Engine
    useEffect(() => {
        if (settings.accounts) {
            const timer = setTimeout(() => {
                (window.electronAPI as any).saveSettings({ accounts: settings.accounts });
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [settings.accounts]);

    const handleUpdate = (updates: Partial<RotatorConfig>) => {
        const updatedAccounts = settings.accounts?.map(acc => {
            if (acc.id === user?.id) {
                return { 
                    ...acc, 
                    rotator: { ...rotator, ...updates }
                };
            }
            return acc;
        }) || [];
        updateSetting('accounts', updatedAccounts);
    };

    const toggleSection = (section: keyof RotatorConfig['enabledSections']) => {
        const newSections = { ...rotator.enabledSections, [section]: !rotator.enabledSections[section] };
        handleUpdate({ enabledSections: newSections });
        
        if (rotator.enabled) {
            setTimeout(() => {
                (window.electronAPI as any).forceRotatorUpdate();
            }, 700); // 700ms because debounced save is 600ms
        }
    };

    const toggleRotator = async () => {
        const newState = !rotator.enabled;
        console.log(`[IDENTITY PRO] Tentative de basculement: ${newState ? 'START' : 'STOP'}`);
        
        try {
            const res = await (window.electronAPI as any).toggleRotator({ ...rotator, enabled: newState });
            if (res.success) {
                handleUpdate({ enabled: newState });
                setNotif({ 
                    message: newState ? 'Dashboard PRO activé | Heartbeat synchronisé' : 'Rotator arrêté', 
                    type: newState ? 'success' : 'info' 
                });
                console.log(`[IDENTITY PRO] Succès: Moteur ${newState ? 'en ligne' : 'hors ligne'}`);
            } else {
                setNotif({ message: `Erreur: ${res.error || 'Échec du moteur'}`, type: 'error' });
                console.error(`[IDENTITY PRO] Échec:`, res.error);
            }
        } catch (err: any) {
            setNotif({ message: `Erreur critique: ${err.message}`, type: 'error' });
            console.error(`[IDENTITY PRO] Exception:`, err);
        }
    };

    const forceUpdate = async () => {
        await (window.electronAPI as any).forceRotatorUpdate();
        setNotif({ message: 'Cycle forcé déclenché !', type: 'success' });
    };

    // Variable Resolver for Preview
    const resolvePreview = (text: string) => {
        if (!text) return '';
        const now = new Date();
        let res = text.replace(/{time}/g, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        res = res.replace(/{date}/g, now.toLocaleDateString([], { day: '2-digit', month: '2-digit' }));
        res = res.replace(/{counter}/g, (pulseData?.totalRotations || 0).toString());
        res = res.replace(/{messages_today}/g, rotator.stats?.messagesToday.toString() || '0');
        res = res.replace(/{total_messages}/g, rotator.stats?.totalMessages.toString() || '0');
        res = res.replace(/{random}/g, '✨');
        return res;
    };

    const [editingRpcIndex, setEditingRpcIndex] = useState<number | null>(null);

    // Progress Bar Calculation
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        if (!pulseData || !rotator.enabled) {
            setProgress(0);
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const total = rotator.interval * 1000;
            const remaining = pulseData.nextTick - now;
            const p = Math.max(0, Math.min(100, 100 - (remaining / total * 100)));
            setProgress(p);
        }, 100);
        return () => clearInterval(interval);
    }, [pulseData, rotator.enabled, rotator.interval]);

    // Cooldown Calculation for Username
    const [usernameCooldown, setUsernameCooldown] = useState<string | null>(null);
    useEffect(() => {
        const target = pulseData?.pausedUsernameUntil || rotator.pausedUsernameUntil;
        if (!target) {
            setUsernameCooldown(null);
            return;
        }
        const interval = setInterval(() => {
            const remaining = target - Date.now();
            if (remaining <= 0) {
                setUsernameCooldown(null);
                clearInterval(interval);
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setUsernameCooldown(`${mins}m ${secs}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [pulseData?.pausedUsernameUntil, rotator.pausedUsernameUntil]);

    return (
        <div className="page-container animate-fade-in custom-scrollbar" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', overflowY: 'auto', height: 'calc(100vh - 60px)' }}>
            
            {/* PRO Header Dashboard */}
            <div className="glass-card" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--accent-glow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <RefreshCw size={28} color="var(--accent)" className={rotator.enabled ? 'animate-spin' : ''} />
                        {rotator.enabled && <div style={{ position: 'absolute', top: -4, right: -4, width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>}
                    </div>
                <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.05em' }}>PROFILE ROTATOR <span style={{ color: 'var(--accent)' }}>PRO</span></h1>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '4px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <BarChart3 size={12} /> ROTATIONS: <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{pulseData?.totalRotations || rotator.totalRotations || 0}</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={12} /> DERNIÈRE: <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{pulseData?.lastRotationTime ? new Date(pulseData.lastRotationTime).toLocaleTimeString() : 'JAMAIS'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', marginRight: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: rotator.enabled ? 'var(--success)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                            {rotator.enabled ? 'Séquenceur Actif' : 'Système en Pause'}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'monospace' }}>
                            {rotator.enabled ? `NEXT TICK: ${Math.ceil((pulseData?.nextTick ? pulseData.nextTick - Date.now() : 0) / 1000)}s` : '--:--'}
                        </div>
                    </div>
                    <button 
                        onClick={toggleRotator} 
                        className={rotator.enabled ? 'btn-danger' : 'btn-primary'}
                        style={{ padding: '0 25px', height: '45px', borderRadius: '12px', fontSize: '12px', fontWeight: '900' }}
                    >
                        {rotator.enabled ? <><PauseCircle size={18} /> PAUSE</> : <><Play size={18} /> ACTIVER</>}
                    </button>
                </div>
            </div>

            {/* Global Progress & Velocity */}
            <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Timer size={18} color="var(--accent)" />
                        <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>Vitesse du Heartbeat : <span style={{ color: 'var(--accent)' }}>{rotator.interval}s</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={forceUpdate} className="btn-glass" style={{ fontSize: '10px', padding: '6px 12px' }}>FORCER CYCLE</button>
                    </div>
                </div>
                
                <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                        position: 'absolute', left: 0, top: 0, height: '100%', 
                        width: `${progress}%`, background: 'var(--accent)', 
                        boxShadow: '0 0 10px var(--accent)', transition: 'width 0.1s linear' 
                    }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input 
                        type="range" min="2" max="3600" step="2"
                        value={rotator.interval}
                        onChange={(e) => handleUpdate({ interval: parseInt(e.target.value) })}
                        style={{ flex: 1, accentColor: rotator.interval < 30 ? 'var(--danger)' : 'var(--accent)' }} 
                    />
                    {rotator.interval < 30 && (
                        <div className="animate-pulse" style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <AlertTriangle size={12} /> RISQUE DÉTECTION ÉLEVÉ
                        </div>
                    )}
                </div>
            </div>

            {/* Matrix of Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* 1. Custom Status */}
                <div className={`glass-card section-card ${rotator.enabledSections.status ? 'active' : 'disabled'}`} 
                     style={{ padding: '20px', borderTop: `4px solid ${rotator.enabledSections.status ? 'var(--accent)' : 'var(--text-dim)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Smile size={18} color={rotator.enabledSections.status ? 'var(--accent)' : 'var(--text-dim)'} />
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>Custom Status</span>
                        </div>
                        <div className={`mini-toggle ${rotator.enabledSections.status ? 'on' : 'off'}`} onClick={() => toggleSection('status')}>
                            {rotator.enabledSections.status ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    <textarea 
                        className="input-field rotator-input"
                        value={rotator.statuses.join('\n')}
                        onChange={(e) => handleUpdate({ statuses: e.target.value.split('\n') })}
                        placeholder="Phrases ici..."
                        style={{ height: '120px', fontSize: '11px' }}
                    />
                    <div className="variable-preview">
                        PREVIEW: {resolvePreview(rotator.statuses[rotator.currentStatusIndex % (rotator.statuses.length || 1)] || '...')}
                    </div>
                </div>

                {/* 2. Bio Section */}
                <div className={`glass-card section-card ${rotator.enabledSections.bio ? 'active' : 'disabled'}`}
                     style={{ padding: '20px', borderTop: `4px solid ${rotator.enabledSections.bio ? '#a855f7' : 'var(--text-dim)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={18} color={rotator.enabledSections.bio ? '#a855f7' : 'var(--text-dim)'} />
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>Bio / About Me</span>
                        </div>
                        <div className={`mini-toggle ${rotator.enabledSections.bio ? 'on' : 'off'}`} onClick={() => toggleSection('bio')}>
                            {rotator.enabledSections.bio ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    <textarea 
                        className="input-field rotator-input"
                        value={rotator.bios.join('\n')}
                        onChange={(e) => handleUpdate({ bios: e.target.value.split('\n') })}
                        placeholder="Bios ici..."
                        style={{ height: '120px', fontSize: '11px' }}
                    />
                    <div className="variable-preview">
                        PREVIEW: {resolvePreview(rotator.bios[rotator.currentBioIndex % (rotator.bios.length || 1)] || '...')}
                    </div>
                </div>

                {/* 3. Global Name PRO */}
                <div className={`glass-card section-card ${rotator.enabledSections.username ? 'active' : 'disabled'}`}
                     style={{ padding: '20px', position: 'relative', borderTop: `4px solid ${rotator.enabledSections.username ? 'var(--warning)' : 'var(--text-dim)'}` }}>
                    
                    {usernameCooldown && (
                        <div className="cooldown-overlay animate-fade-in">
                            <Clock size={24} className="animate-pulse" />
                            <div style={{ fontWeight: '900', fontSize: '14px' }}>COOLDOWN ACTIF</div>
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>Relance dans : {usernameCooldown}</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Type size={18} color={rotator.enabledSections.username ? 'var(--warning)' : 'var(--text-dim)'} />
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>Global Name</span>
                        </div>
                        <div className={`mini-toggle ${rotator.enabledSections.username ? 'on' : 'off'}`} onClick={() => toggleSection('username')}>
                            {rotator.enabledSections.username ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    <textarea 
                        className="input-field rotator-input"
                        value={rotator.usernames.join('\n')}
                        onChange={(e) => handleUpdate({ usernames: e.target.value.split('\n') })}
                        placeholder="Pseudos ici..."
                        style={{ height: '120px', fontSize: '11px' }}
                    />
                    <div className="variable-preview">
                        PREVIEW: {resolvePreview(rotator.usernames[rotator.currentUsernameIndex % (rotator.usernames.length || 1)] || '...')}
                    </div>
                </div>

                {/* 4. Custom RPC PRO Card */}
                <div className={`glass-card section-card ${rotator.enabledSections.activity ? 'active' : 'disabled'}`}
                     style={{ padding: '20px', borderTop: `4px solid ${rotator.enabledSections.activity ? 'var(--accent)' : 'var(--text-dim)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Gamepad2 size={18} color={rotator.enabledSections.activity ? 'var(--accent)' : 'var(--text-dim)'} />
                            <span style={{ fontSize: '13px', fontWeight: '900' }}>Custom RPC PRO</span>
                        </div>
                        <div className={`mini-toggle ${rotator.enabledSections.activity ? 'on' : 'off'}`} onClick={() => toggleSection('activity')}>
                            {rotator.enabledSections.activity ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar">
                        {rotator.customRPCs.map((rpc, i) => (
                            <div key={i} className="nav-item" style={{ 
                                padding: '10px 15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                border: i === rotator.currentActivityIndex % (rotator.customRPCs.length || 1) && rotator.enabled ? '1px solid var(--accent)' : '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {rpc.largeImage && rpc.largeImage.startsWith('http') ? <img src={rpc.largeImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Gamepad2 size={16} opacity={0.3} />}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resolvePreview(rpc.name)}</div>
                                        <div style={{ fontSize: '8px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resolvePreview(rpc.details || 'Aucun détail')}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => setEditingRpcIndex(i)} className="btn-glass" style={{ width: '30px', height: '30px', padding: 0 }}><Info size={14} /></button>
                                    <button onClick={() => {
                                        const newRPCs = rotator.customRPCs.filter((_, idx) => idx !== i);
                                        handleUpdate({ customRPCs: newRPCs });
                                    }} className="btn-glass" style={{ width: '30px', height: '30px', padding: 0, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {rotator.customRPCs.length === 0 && <p className="caption" style={{ padding: '20px', textAlign: 'center', opacity: 0.3 }}>Aucun RPC configuré.</p>}
                    </div>

                    <button 
                        onClick={() => {
                            const newRpc = { name: "Opsec PRO Activity", type: 0, showTimestamp: true, applicationId: "0" };
                            const newList = [...rotator.customRPCs, newRpc];
                            handleUpdate({ customRPCs: newList });
                            setEditingRpcIndex(newList.length - 1);
                        }}
                        className="btn-primary" 
                        style={{ width: '100%', marginTop: '15px', padding: '12px', fontSize: '10px', gap: '8px' }}
                    >
                        <Play size={12} /> AJOUTER UNE PRÉSENCE
                    </button>
                    
                    <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={14} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Stats du jour</div>
                            <div style={{ fontSize: '12px', fontWeight: '900' }}>{rotator.stats?.messagesToday || 0} MESSAGES</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total</div>
                            <div style={{ fontSize: '12px', fontWeight: '900' }}>{rotator.stats?.totalMessages || 0}</div>
                        </div>
                    </div>
                </div>

                {/* 5. Clan Tag Rotator Card */}
                <div className="glass-card animate-fade-in" style={{ padding: '30px', animationDelay: '0.4s', border: rotator.enabledSections.clanTag && rotator.enabled ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '10px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '10px', color: 'var(--accent)' }}><Zap size={20} /></div>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Clan Tag Badge</h3>
                                <p className="caption" style={{ fontSize: '9px', opacity: 0.5 }}>Discord Clan Identiy Rotation</p>
                            </div>
                        </div>
                        <div onClick={() => toggleSection('clanTag')} className={`mini-toggle ${rotator.enabledSections.clanTag ? 'on' : 'off'}`}>
                            {rotator.enabledSections.clanTag ? 'ON' : 'OFF'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label className="caption">Sélectionner les serveurs (Badge de Clan)</label>
                        <DoubleChannelSelector 
                            allowMultiple 
                            selectServerOnly={true}
                            selectedIds={rotator.clanTags}
                            onSelect={(id) => {
                                const newTags = [...rotator.clanTags, id];
                                handleUpdate({ clanTags: newTags });
                            }}
                            onRemove={(id) => {
                                const newTags = rotator.clanTags.filter(t => t !== id);
                                handleUpdate({ clanTags: newTags });
                            }}
                        />
                         {rotator.enabledSections.username && rotator.enabledSections.clanTag && (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                 <AlertTriangle size={14} color="var(--danger)" />
                                 <span style={{ fontSize: '9px', color: 'var(--danger)', fontWeight: 'bold' }}>COOLDOWN PARTAGÉ (30 min)</span>
                             </div>
                         )}
                    </div>

                    <div className="card-footer" style={{ 
                        marginTop: '20px', 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                        gap: '12px' 
                    }}>
                        {rotator.clanTags.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', opacity: 0.3, border: '1px dashed var(--border)', borderRadius: '12px', fontSize: '10px' }}>
                                AUCUN SERVEUR SÉLECTIONNÉ
                            </div>
                        )}
                        {rotator.clanTags.map((tagId, i) => {
                            const guild = channels.servers.find(s => s.id === tagId);
                            const isActive = i === rotator.currentClanTagIndex && rotator.enabled;
                            return (
                                <div 
                                    key={tagId} 
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => {
                                        const newTags = rotator.clanTags.filter(t => t !== tagId);
                                        handleUpdate({ clanTags: newTags });
                                    }} 
                                    style={{ 
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: isActive ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        {guild?.icon ? (
                                            <img src={guild.icon} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ShieldCheck size={20} opacity={0.5} />
                                            </div>
                                        )}
                                        {isActive && (
                                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '14px', height: '14px', background: 'var(--success)', borderRadius: '50%', border: '2px solid #0b0c10', boxShadow: '0 0 10px var(--success)' }}></div>
                                        )}
                                    </div>
                                    <div style={{ 
                                        fontSize: '10px', 
                                        fontWeight: '900', 
                                        textAlign: 'center', 
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        width: '100%',
                                        color: isActive ? 'var(--accent)' : 'var(--text)'
                                    }}>
                                        {guild ? guild.name.toUpperCase() : tagId.substring(0, 8)}
                                    </div>
                                    
                                    <div className="hover-overlay" style={{
                                        position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.8)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.2s ease'
                                    }}>
                                        <X size={20} color="white" strokeWidth={3} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Legend & Help Component */}
            <div className="glass-card" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {['{time}', '{date}', '{counter}', '{messages_today}', '{total_messages}'].map(v => (
                        <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ padding: '2px 6px', background: 'var(--accent-glow)', borderRadius: '4px', fontSize: '10px', color: 'var(--accent)', fontWeight: '900' }}>{v}</div>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{resolvePreview(v)}</span>
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Mots-clés activité : <span style={{ color: 'white' }}>Playing, Watching, Listening to, Competing in</span>
                </div>
            </div>

            <style>{`
                .section-card { transition: all 0.3s ease; }
                .section-card.disabled { opacity: 0.5; filter: grayscale(0.8); pointer-events: none; }
                .mini-toggle { 
                    padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 900; 
                    cursor: pointer; transition: all 0.2s; pointer-events: all;
                }
                .mini-toggle.on { background: var(--success-glow); color: var(--success); }
                .mini-toggle.off { background: rgba(255,255,255,0.05); color: var(--text-dim); }
                .rotator-input { resize: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
                .variable-preview { font-size: 9px; color: var(--text-dim); margin-top: 8px; font-family: monospace; whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis; }
                .cooldown-overlay {
                    position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 10;
                    display: flex; flexDirection: column; alignItems: center; justifyContent: center;
                    border-radius: 12px; gap: 10px; backdropFilter: blur(4px); pointer-events: all;
                }
            `}</style>

            {notif && <Notification message={notif.message} type={notif.type} onClose={() => setNotif(null)} />}

            {/* RpcEditorModal */}
            {editingRpcIndex !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative', border: '1px solid var(--accent)', background: '#0b0c10', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ padding: '10px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '10px', color: 'var(--accent)' }}><Gamepad2 size={22} /></div>
                                <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Éditer la Présence</h2>
                            </div>
                            <button onClick={() => setEditingRpcIndex(null)} className="btn-glass" style={{ width: '35px', height: '35px', padding: 0 }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="caption">Application ID (0 = Stealth)</label>
                                    <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].applicationId || "0"} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].applicationId = e.target.value;
                                        handleUpdate({ customRPCs: newList });
                                    }} style={{ fontSize: '12px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="caption">Type d'activité</label>
                                    <select className="input-field" value={rotator.customRPCs[editingRpcIndex].type} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].type = parseInt(e.target.value);
                                        handleUpdate({ customRPCs: newList });
                                    }} style={{ fontSize: '12px', background: 'var(--bg-card)' }}>
                                        <option value="0">Jouer à</option>
                                        <option value="1">Streaming</option>
                                        <option value="2">Écouter</option>
                                        <option value="3">Regarder</option>
                                        <option value="5">Participer à</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="caption">Nom de l'application</label>
                                <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].name} onChange={e => {
                                    const newList = [...rotator.customRPCs];
                                    newList[editingRpcIndex].name = e.target.value;
                                    handleUpdate({ customRPCs: newList });
                                }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label className="caption">Détails (Ligne 1)</label>
                                    <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].details || ""} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].details = e.target.value;
                                        handleUpdate({ customRPCs: newList });
                                    }} />
                                </div>
                                <div>
                                    <label className="caption">État (Ligne 2)</label>
                                    <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].state || ""} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].state = e.target.value;
                                        handleUpdate({ customRPCs: newList });
                                    }} />
                                </div>
                            </div>

                            <div>
                                <label className="caption">Image Principale (URL)</label>
                                <input type="text" className="input-field" placeholder="Lien vers une image ou asset key" value={rotator.customRPCs[editingRpcIndex].largeImage || ""} onChange={e => {
                                    const newList = [...rotator.customRPCs];
                                    newList[editingRpcIndex].largeImage = e.target.value;
                                    handleUpdate({ customRPCs: newList });
                                }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} color="var(--accent)" />
                                    <span style={{ fontSize: '12px', fontWeight: '800' }}>Afficher le Timer (Elapsed)</span>
                                </div>
                                <div onClick={() => {
                                    const newList = [...rotator.customRPCs];
                                    newList[editingRpcIndex].showTimestamp = !newList[editingRpcIndex].showTimestamp;
                                    handleUpdate({ customRPCs: newList });
                                }} className={`mini-toggle ${rotator.customRPCs[editingRpcIndex].showTimestamp ? 'on' : 'off'}`}>
                                    {rotator.customRPCs[editingRpcIndex].showTimestamp ? 'ON' : 'OFF'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                            <button onClick={() => {
                                const newRPCs = rotator.customRPCs.filter((_, idx) => idx !== editingRpcIndex);
                                handleUpdate({ customRPCs: newRPCs });
                                setEditingRpcIndex(null);
                            }} className="btn-glass" style={{ padding: '15px', color: 'var(--danger)', flex: '0 0 auto' }}>
                                <Trash2 size={18} />
                            </button>
                            <button onClick={() => setEditingRpcIndex(null)} className="btn-primary" style={{ flex: 1, padding: '15px' }}>
                                <ShieldCheck size={18} /> ENREGISTRER LA CONFIGURATION
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
