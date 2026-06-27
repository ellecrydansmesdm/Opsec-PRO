import React, { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { 
    RefreshCw, AlertTriangle, Clock, ShieldCheck, Zap, 
    Play, Info, Type, FileText, Smile, Gamepad2,
    PauseCircle, Timer, BarChart3, X, Trash2
} from 'lucide-react';
import { RotatorConfig } from '../../shared/types';
import { Notification } from '@/components/ui/Notification';
import { DoubleChannelSelector } from '@/components/ui/DoubleChannelSelector';
import { NitroBadge, BoostBadge } from '@/components/DiscordBadge';

// Safety Gauge risk level resolver
const getRiskLevel = (interval: number, language: 'en' | 'fr') => {
    const isFr = language === 'fr';
    if (interval >= 60) {
        return {
            label: isFr ? 'SÛR (Faible Risque)' : 'SAFE (Low Risk)',
            color: '#23a55a',
            bg: 'rgba(35, 165, 90, 0.12)',
            border: 'rgba(35, 165, 90, 0.3)',
            barWidth: '100%',
            pulse: false
        };
    }
    if (interval >= 15) {
        return {
            label: isFr ? 'MODÉRÉ' : 'MODERATE',
            color: '#f0b232',
            bg: 'rgba(240, 178, 50, 0.12)',
            border: 'rgba(240, 178, 50, 0.3)',
            barWidth: '75%',
            pulse: false
        };
    }
    if (interval >= 2) {
        return {
            label: isFr ? 'RISQUÉ (Spam Modéré)' : 'RISKY (Moderate Spam)',
            color: '#f57731',
            bg: 'rgba(245, 119, 49, 0.12)',
            border: 'rgba(245, 119, 49, 0.3)',
            barWidth: '50%',
            pulse: false
        };
    }
    if (interval >= 0.5) {
        return {
            label: isFr ? 'DANGER ÉLEVÉ (Détection Rapide)' : 'HIGH DANGER (Fast Detection)',
            color: '#f23f43',
            bg: 'rgba(242, 63, 67, 0.15)',
            border: 'rgba(242, 63, 67, 0.4)',
            barWidth: '25%',
            pulse: false
        };
    }
    return {
        label: isFr ? 'CRITIQUE (BAN DISCORD IMMINENT)' : 'CRITICAL (IMMINENT DISCORD BAN)',
        color: '#ff003c',
        bg: 'rgba(255, 0, 60, 0.2)',
        border: '#ff003c',
        barWidth: '10%',
        pulse: true
    };
};

// Formatter for ticking elapsed timer
const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 
        ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Isolated sub-component to prevent whole-page re-renders on elapsed timer tick
const StopwatchSpan = ({ isEnabled, currentActivityIndex, language }: { isEnabled: boolean, currentActivityIndex: number, language: 'en' | 'fr' }) => {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        setElapsedTime(0);
    }, [currentActivityIndex, isEnabled]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isEnabled) {
            intervalId = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isEnabled, currentActivityIndex]);

    return (
        <span>{formatElapsed(elapsedTime)} {language === 'fr' ? 'écoulés' : 'elapsed'}</span>
    );
};

const HeartbeatProgressBar = ({ pulseData, rotatorEnabled, rotatorInterval }: { pulseData: any, rotatorEnabled: boolean, rotatorInterval: number }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        if (!pulseData || !rotatorEnabled) {
            setProgress(0);
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const total = rotatorInterval * 1000;
            const remaining = pulseData.nextTick - now;
            const p = Math.max(0, Math.min(100, 100 - (remaining / total * 100)));
            setProgress(p);
        }, 100);
        return () => clearInterval(interval);
    }, [pulseData, rotatorEnabled, rotatorInterval]);

    return (
        <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
                position: 'absolute', left: 0, top: 0, height: '100%', 
                width: `${progress}%`, background: 'var(--accent)', 
                boxShadow: '0 0 10px var(--accent)', transition: 'width 0.1s linear' 
            }}></div>
        </div>
    );
};

const UsernameCooldownOverlay = ({ pulseData, rotatorPausedUsernameUntil, isFr }: { pulseData: any, rotatorPausedUsernameUntil?: number, isFr: boolean }) => {
    const [cooldown, setCooldown] = useState<string | null>(null);
    useEffect(() => {
        const target = pulseData?.pausedUsernameUntil || rotatorPausedUsernameUntil;
        if (!target) {
            setCooldown(null);
            return;
        }
        const interval = setInterval(() => {
            const remaining = target - Date.now();
            if (remaining <= 0) {
                setCooldown(null);
                clearInterval(interval);
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setCooldown(`${mins}m ${secs}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [pulseData?.pausedUsernameUntil, rotatorPausedUsernameUntil]);

    if (!cooldown) return null;

    return (
        <div className="cooldown-overlay animate-fade-in">
            <Clock size={24} className="animate-pulse" color="var(--warning)" />
            <div style={{ fontWeight: '900', fontSize: '14px', color: 'white' }}>{isFr ? 'COOLDOWN ACTIF' : 'ACTIVE COOLDOWN'}</div>
            <div style={{ fontSize: '11px', opacity: 0.8, color: 'var(--text-dim)' }}>{isFr ? 'Relance dans :' : 'Retry in:'} {cooldown}</div>
        </div>
    );
};

const getClanTagText = (guild?: { name?: string; guildTag?: string }) => {
    if (guild?.guildTag) {
        const tag = guild.guildTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (tag.length > 0) return tag.slice(0, 4);
    }
    const cleaned = (guild?.name || 'OPSEC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 4) || 'CLAN';
};

const getAccountCreationDate = (userId: string | undefined | null, language: 'en' | 'fr') => {
    if (!userId) {
        return language === 'fr' ? '23 juin 2021' : 'Jun 23, 2021';
    }
    try {
        const idBin = BigInt(userId);
        const timestampMs = Number((idBin >> 22n) + 1420070400000n);
        const date = new Date(timestampMs);
        
        if (language === 'fr') {
            const months = [
                'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 
                'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
            ];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        } else {
            const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        }
    } catch (e) {
        return language === 'fr' ? '23 juin 2021' : 'Jun 23, 2021';
    }
};

export const IdentitySettings = () => {
    const { settings, updateSetting } = useSettingsStore();
    const { user, setUser } = useUserStore();
    const isFr = settings.language === 'fr';
    const [notif, setNotif] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [liveAvatarURL, setLiveAvatarURL] = useState<string | null>(null);
    const [liveBannerURL, setLiveBannerURL] = useState<string | null>(null);
    
    // Real-time Pulse Stats
    const [pulseData, setPulseData] = useState<{
        nextTick: number,
        totalRotations: number,
        lastRotationTime?: number,
        pausedUsernameUntil?: number
    } | null>(null);

    const [channels, setChannels] = useState<{ servers: any[], dms: any[] }>({ servers: [], dms: [] });

    useEffect(() => {
        window.electronAPI.getChannels().then((res: any) => {
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
        totalRotations: 0,
        hypesquadHouse: 0
    }, [currentAccount]);

    useEffect(() => {
        const removePulse = window.electronAPI.onRotatorPulse((data: any) => {
            setPulseData(data);
        });
        return () => removePulse();
    }, []);

    // Live profile refresh for mockup avatar & banner
    useEffect(() => {
        const refreshProfile = async () => {
            try {
                const res = await window.electronAPI.getUserData();
                if (res.success && res.data) {
                    setLiveAvatarURL(res.data.avatarURL);
                    setLiveBannerURL(res.data.bannerURL || null);
                    setUser(res.data);
                }
            } catch {
                /* keep cached values */
            }
        };

        refreshProfile();
        const interval = setInterval(refreshProfile, 15_000);
        return () => clearInterval(interval);
    }, [user?.id, setUser]);

    const previewAvatarURL = liveAvatarURL || user?.avatarURL || currentAccount?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Debounced Save to Backend Engine
    useEffect(() => {
        if (settings.accounts) {
            const timer = setTimeout(() => {
                window.electronAPI.saveSettings({ accounts: settings.accounts });
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
        const newRotationState = !rotator.enabledSections[section];
        const newSections = { ...rotator.enabledSections, [section]: newRotationState };
        handleUpdate({ enabledSections: newSections });
        
        if (newRotationState && rotator.enabled) {
            setTimeout(() => {
                window.electronAPI.forceRotatorUpdate();
            }, 1000); 
        }
    };

    const toggleRotator = async () => {
        const newState = !rotator.enabled;
        console.log(`[IDENTITY PRO] Tentative de basculement: ${newState ? 'START' : 'STOP'}`);
        
        try {
            const res = await window.electronAPI.toggleRotator({ ...rotator, enabled: newState });
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
        if (!rotator.enabled) {
            setNotif({ message: 'Activez d\'abord le système pour forcer un cycle !', type: 'info' });
            return;
        }
        await window.electronAPI.forceRotatorUpdate();
        setNotif({ message: 'Cycle d\'identité forcé avec succès !', type: 'success' });
    };

    // Variable Resolver for Preview
    const resolvePreview = React.useCallback((text: string) => {
        if (!text) return '';
        const now = new Date();
        let res = text.replace(/{time}/g, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        res = res.replace(/{date}/g, now.toLocaleDateString([], { day: '2-digit', month: '2-digit' }));
        res = res.replace(/{counter}/g, (pulseData?.totalRotations || 0).toString());
        res = res.replace(/{messages_today}/g, rotator.stats?.messagesToday.toString() || '0');
        res = res.replace(/{total_messages}/g, rotator.stats?.totalMessages.toString() || '0');
        res = res.replace(/{random}/g, '✨');
        return res;
    }, [pulseData?.totalRotations, rotator.stats?.messagesToday, rotator.stats?.totalMessages]);

    // Real-time custom status from rotator or live client user presence
    const previewStatusText = useMemo(() => {
        if (rotator.enabled) {
            return rotator.statuses.length > 0 
                ? resolvePreview(rotator.statuses[rotator.currentStatusIndex % rotator.statuses.length]) 
                : null;
        }
        // Find custom status in client presence activities (type 4 is CUSTOM_STATUS)
        const customAct = user?.activities?.find(a => a.type === 4);
        return customAct ? customAct.state || customAct.name : null;
    }, [rotator.enabled, rotator.statuses, rotator.currentStatusIndex, user?.activities, resolvePreview]);

    // Real-time biography
    const previewBioText = useMemo(() => {
        if (rotator.enabled) {
            return rotator.bios.length > 0 
                ? resolvePreview(rotator.bios[rotator.currentBioIndex % rotator.bios.length]) 
                : null;
        }
        return user?.bio || null;
    }, [rotator.enabled, rotator.bios, rotator.currentBioIndex, user?.bio, resolvePreview]);

    // Real-time activity (game or RPC)
    const previewActivity = useMemo(() => {
        if (rotator.enabled) {
            return rotator.customRPCs.length > 0 
                ? rotator.customRPCs[rotator.currentActivityIndex % rotator.customRPCs.length] 
                : null;
        }
        // Find the first activity that is not a custom status (type !== 4)
        const gameAct = user?.activities?.find(a => a.type !== 4);
        return gameAct ? {
            name: gameAct.name,
            details: gameAct.details,
            state: gameAct.state,
            largeImage: (gameAct as any).largeImage || undefined
        } : null;
    }, [rotator.enabled, rotator.customRPCs, rotator.currentActivityIndex, user?.activities]);

    const [editingRpcIndex, setEditingRpcIndex] = useState<number | null>(null);

    // Real-time ticking progress and username cooldown overlays are now isolated in sub-components

    // Real-time ticking elapsed timer stopwatch for RPC Mockup is now isolated in StopwatchSpan

    return (
        <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
            
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
                                <Clock size={12} /> {settings.language === 'fr' ? 'DERNIÈRE:' : 'LAST:'} <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{pulseData?.lastRotationTime ? new Date(pulseData.lastRotationTime).toLocaleTimeString() : (settings.language === 'fr' ? 'JAMAIS' : 'NEVER')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: rotator.enabled ? 'var(--success)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                            {rotator.enabled ? (settings.language === 'fr' ? 'Séquenceur Actif' : 'Rotator Active') : (settings.language === 'fr' ? 'Système en Pause' : 'System Paused')}
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
                        {rotator.enabled ? <><PauseCircle size={18} /> PAUSE</> : <><Play size={18} /> {settings.language === 'fr' ? 'ACTIVER' : 'ENABLE'}</>}
                    </button>
                </div>
            </div>

            {/* Dual Column Layout */}
            <div className="rotator-content-grid" style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: '25px', alignItems: 'start' }}>
                
                {/* Left Column: Settings and Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* Global Progress & Velocity */}
                    <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Timer size={18} color="var(--accent)" />
                                <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>
                                    {settings.language === 'fr' ? 'Intervalle du Heartbeat :' : 'Heartbeat Interval:'} <span style={{ color: 'var(--accent)' }}>{rotator.interval}s</span> <span style={{ fontSize: '11px', opacity: 0.5 }}>({(rotator.interval * 1000).toLocaleString()} ms)</span>
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={forceUpdate} className="btn-force-cycle">
                                    <RefreshCw size={12} />
                                    {settings.language === 'fr' ? 'FORCER CYCLE' : 'FORCE CYCLE'}
                                </button>
                            </div>
                        </div>
                        
                        {/* Heartbeat progress bar */}
                        <HeartbeatProgressBar pulseData={pulseData} rotatorEnabled={rotator.enabled} rotatorInterval={rotator.interval} />

                        {/* High precision input & presets & risk gauge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)' }}>{settings.language === 'fr' ? 'INTERVALLE (SEC) :' : 'INTERVAL (SEC):'}</label>
                                    <input 
                                        type="number" 
                                        min="0.05" 
                                        step="0.05"
                                        value={rotator.interval}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            handleUpdate({ interval: isNaN(val) ? 2 : val });
                                        }}
                                        style={{ 
                                            background: 'rgba(0,0,0,0.45)', 
                                            border: '1.5px solid rgba(255,255,255,0.08)', 
                                            color: 'white', 
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            fontSize: '12px', 
                                            fontWeight: '900', 
                                            width: '100px', 
                                            textAlign: 'center',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        className="settings-select"
                                    />
                                </div>
                                
                                <div className="preset-chip-row">
                                    {[0.5, 2, 30, 60].map((preset) => (
                                        <button
                                            key={preset}
                                            onClick={() => handleUpdate({ interval: preset })}
                                            className={`preset-chip ${rotator.interval === preset ? 'active' : ''}`}
                                        >
                                            {preset}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Risk Gauge */}
                            {(() => {
                                const risk = getRiskLevel(rotator.interval, settings.language);
                                return (
                                    <div 
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '8px',
                                            padding: '12px 16px', 
                                            background: risk.bg, 
                                            border: `1.5px solid ${risk.border}`, 
                                            borderRadius: '10px', 
                                            color: risk.color,
                                            transition: 'all 0.3s ease'
                                        }} 
                                        className={risk.pulse ? 'animate-pulse' : ''}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertTriangle size={15} />
                                                <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.05em' }}>{settings.language === 'fr' ? 'RISQUE DE DÉTECTION :' : 'DETECTION RISK:'} {risk.label}</span>
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: '900' }}>{settings.language === 'fr' ? 'NIVEAU' : 'LEVEL'} {
                                                rotator.interval >= 60 ? '1/5' :
                                                rotator.interval >= 15 ? '2/5' :
                                                rotator.interval >= 2 ? '3/5' :
                                                rotator.interval >= 0.5 ? '4/5' : '5/5'
                                            }</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: risk.barWidth, background: risk.color, boxShadow: `0 0 8px ${risk.color}`, transition: 'width 0.3s ease' }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Visual Badges Configuration */}
                    <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={18} color="var(--accent)" />
                            <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>
                                {settings.language === 'fr' ? 'Configuration des Badges Visuels' : 'Visual Badges Configuration'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                    {settings.language === 'fr' ? 'Date d\'Abonnement Nitro :' : 'Nitro Subscription Date:'}
                                </label>
                                <input
                                    type="date"
                                    value={settings.nitroStartDate ? new Date(settings.nitroStartDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => updateSetting('nitroStartDate', e.target.value || null)}
                                    style={{
                                        background: 'rgba(0,0,0,0.45)',
                                        border: '1.5px solid rgba(255,255,255,0.08)',
                                        color: 'white',
                                        padding: '10px 15px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    className="settings-select"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                    {settings.language === 'fr' ? 'Date de Premier Boost :' : 'First Server Boost Date:'}
                                </label>
                                <input
                                    type="date"
                                    value={settings.boostStartDate ? new Date(settings.boostStartDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => updateSetting('boostStartDate', e.target.value || null)}
                                    style={{
                                        background: 'rgba(0,0,0,0.45)',
                                        border: '1.5px solid rgba(255,255,255,0.08)',
                                        color: 'white',
                                        padding: '10px 15px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    className="settings-select"
                                />
                            </div>
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
                                placeholder={isFr ? "Phrases ici (une par ligne)..." : "Phrases here (one per line)..."}
                                style={{ height: '120px', fontSize: '11px', background: 'rgba(0,0,0,0.25)', color: 'white' }}
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
                                placeholder={isFr ? "Bios ici (une par ligne)..." : "Bios here (one per line)..."}
                                style={{ height: '120px', fontSize: '11px', background: 'rgba(0,0,0,0.25)', color: 'white' }}
                            />
                            <div className="variable-preview">
                                PREVIEW: {resolvePreview(rotator.bios[rotator.currentBioIndex % (rotator.bios.length || 1)] || '...')}
                            </div>
                        </div>

                        {/* 3. Global Name PRO */}
                        <div className={`glass-card section-card ${rotator.enabledSections.username ? 'active' : 'disabled'}`}
                             style={{ padding: '20px', position: 'relative', borderTop: `4px solid ${rotator.enabledSections.username ? 'var(--warning)' : 'var(--text-dim)'}` }}>
                            
                            <UsernameCooldownOverlay pulseData={pulseData} rotatorPausedUsernameUntil={rotator.pausedUsernameUntil} isFr={isFr} />

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
                                placeholder={isFr ? "Pseudos ici (un par ligne)..." : "Usernames here (one per line)..."}
                                style={{ height: '120px', fontSize: '11px', background: 'rgba(0,0,0,0.25)', color: 'white' }}
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
                                                <div style={{ fontSize: '8px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resolvePreview(rpc.details || (isFr ? 'Aucun détail' : 'No details'))}</div>
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
                                {rotator.customRPCs.length === 0 && <p className="caption" style={{ padding: '20px', textAlign: 'center', opacity: 0.3 }}>{isFr ? 'Aucun RPC configuré.' : 'No RPC configured.'}</p>}
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
                                <Play size={12} /> {isFr ? 'AJOUTER UNE PRÉSENCE' : 'ADD RICH PRESENCE'}
                            </button>
                            
                            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BarChart3 size={14} color="var(--accent)" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{isFr ? 'Stats du jour' : "Today's stats"}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '900' }}>{rotator.stats?.messagesToday || 0} MESSAGES</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total</div>
                                    <div style={{ fontSize: '12px', fontWeight: '900' }}>{rotator.stats?.totalMessages || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Clan Tag Rotator Card */}
                        <div className="glass-card animate-fade-in" style={{ padding: '20px', border: rotator.enabledSections.clanTag && rotator.enabled ? '1px solid var(--accent)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '6px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '8px', color: 'var(--accent)' }}><Zap size={16} /></div>
                                    <div>
                                        <h3 style={{ fontSize: '13px', fontWeight: '800' }}>Clan Tag Badge</h3>
                                        <p className="caption" style={{ fontSize: '8px', opacity: 0.5 }}>Discord Clan Identity Rotation</p>
                                    </div>
                                </div>
                                <div onClick={() => toggleSection('clanTag')} className={`mini-toggle ${rotator.enabledSections.clanTag ? 'on' : 'off'}`}>
                                    {rotator.enabledSections.clanTag ? 'ON' : 'OFF'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label className="caption">{isFr ? 'Serveurs pour le Clan Tag (Primary Guild)' : 'Servers for Clan Tag (Primary Guild)'}</label>
                                <DoubleChannelSelector 
                                    allowMultiple 
                                    selectServerOnly={true}
                                    serverFilter={(s) => (s.premiumTier >= 2) || (s.features && s.features.includes('CLAN'))}
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
                                        <span style={{ fontSize: '9px', color: 'var(--danger)', fontWeight: 'bold' }}>{isFr ? 'COOLDOWN PARTAGÉ (30 min)' : 'SHARED COOLDOWN (30 min)'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-footer" style={{ 
                                marginTop: '10px', 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                                gap: '12px' 
                            }}>
                                {rotator.clanTags.length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', opacity: 0.3, border: '1px dashed var(--border)', borderRadius: '12px', fontSize: '10px' }}>
                                        {isFr ? 'AUCUN SERVEUR SÉLECTIONNÉ' : 'NO SERVER SELECTED'}
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
                </div>

                {/* Right Column: Live Discord Popout Mockup (Sticky) */}
                <div style={{ position: 'sticky', top: '10px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                    
                    {/* Mockup Card Container */}
                    <div style={{ 
                        background: '#1e1f22', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '16px', 
                        overflow: 'hidden', 
                        boxShadow: '0 15px 45px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)', 
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        color: '#dbdee1',
                        fontFamily: '"gg sans", "Noto Sans", sans-serif'
                    }}>
                        {/* Premium Discord Nitro banner styling */}
                        <div style={{ 
                            height: '100px', 
                            background: (() => {
                                if (liveBannerURL) {
                                    return `url(${liveBannerURL}) center/cover no-repeat`;
                                }
                                if (user?.bannerColor) {
                                    return user.bannerColor;
                                }
                                if (user?.accentColor) {
                                    return '#' + user.accentColor.toString(16).padStart(6, '0');
                                }
                                return '#2b2d31'; // standard dark discord banner
                            })(), 
                            position: 'relative' 
                        }}>
                        </div>

                        {/* Avatar & Badges Row (Below Banner) */}
                        <div style={{ position: 'relative', height: '55px', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            {/* Profile Avatar & Status indicator */}
                            <div style={{ position: 'relative', marginTop: '-45px' }}>
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: '50%', 
                                    border: '6px solid #1e1f22', 
                                    background: '#2b2d31',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className="item-hover"
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <img 
                                        src={previewAvatarURL} 
                                        alt="avatar" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        key={previewAvatarURL}
                                    />
                                </div>
                                
                                {/* Live status bubble indicator */}
                                <div 
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: '2px', 
                                        right: '2px', 
                                        width: '18px', 
                                        height: '18px', 
                                        borderRadius: '50%', 
                                        border: '4px solid #1e1f22', 
                                        background: (() => {
                                            const status = user?.status || 'offline';
                                            if (status === 'online') return '#23a55a';
                                            if (status === 'idle') return '#f0b232';
                                            if (status === 'dnd') return '#f23f43';
                                            return '#80848e';
                                        })(),
                                        boxShadow: user?.status === 'online' || user?.status === 'dnd' || user?.status === 'idle' 
                                            ? `0 0 8px ${(() => {
                                                const s = user?.status;
                                                if (s === 'online') return '#23a55a';
                                                if (s === 'idle') return '#f0b232';
                                                if (s === 'dnd') return '#f23f43';
                                                return '#80848e';
                                            })()}40` 
                                            : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    className={rotator.enabled ? 'animate-pulse' : ''}
                                >
                                    {user?.status === 'dnd' && (
                                        <div style={{ width: '6px', height: '2px', background: '#1e1f22', borderRadius: '1px' }}></div>
                                    )}
                                    {user?.status === 'idle' && (
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            boxShadow: '-2px -2px 0 0 #1e1f22', 
                                            position: 'absolute', 
                                            top: '2px', 
                                            left: '2px',
                                            background: 'transparent'
                                        }}></div>
                                    )}
                                </div>
                            </div>

                            {/* SVG Badges Overlay */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '4px',
                                background: 'transparent',
                                border: 'none',
                                padding: '4px 0',
                                marginBottom: '12px',
                                alignItems: 'center'
                            }}>
                                {/* HypeSquad Badge */}
                                {(() => {
                                    const hasHypeSquad = user?.badges?.some(b => b.includes('hypesquad'));
                                    if (!hasHypeSquad) return null;
                                    
                                    const isBravery = user?.badges?.some(b => b.includes('house 1') || b.includes('bravery'));
                                    const isBrilliance = user?.badges?.some(b => b.includes('house 2') || b.includes('brilliance'));
                                    const isBalance = user?.badges?.some(b => b.includes('house 3') || b.includes('balance'));
                                    
                                    let color = '#9c84ef'; // Default house color
                                    if (isBrilliance) color = '#f57731';
                                    if (isBalance) color = '#23a55a';
                                    
                                    return (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}>
                                            <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4zm0 6l4.5 4.5H7.5L12 8z" />
                                        </svg>
                                    );
                                })()}

                                {/* Active Developer Badge */}
                                {user?.badges?.some(b => b.includes('active developer')) && (
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#5865F2" style={{ filter: 'drop-shadow(0 0 4px #5865F280)' }}>
                                        <path d="M12 3L4 9v6l8 6 8-6V9l-8-6zm0 14.5L7 13.7V10.3l5 3.8 5-3.8v3.4l-5 3.8z" />
                                    </svg>
                                )}

                                {/* Nitro Badge */}
                                {settings.nitroStartDate && (
                                    <NitroBadge startDate={settings.nitroStartDate} language={settings.language} />
                                )}

                                {/* Boost Badge */}
                                {settings.boostStartDate && (
                                    <BoostBadge startDate={settings.boostStartDate} language={settings.language} />
                                )}
                            </div>
                        </div>

                        {/* Mockup Profile Content Area */}
                        <div style={{ 
                            padding: '16px', 
                            background: '#1e1f22', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '14px',
                        }}>
                            
                            {/* Username section */}
                            <div style={{ background: 'rgba(17, 18, 20, 0.45)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                        {rotator.enabledSections.username && rotator.usernames.length > 0 
                                            ? resolvePreview(rotator.usernames[rotator.currentUsernameIndex % rotator.usernames.length])
                                            : (user?.displayName || currentAccount?.username || user?.username || 'Fahd')}
                                    </span>
                                    
                                    {/* Clan Tag badge */}
                                    {rotator.enabledSections.clanTag && rotator.clanTags.length > 0 && (() => {
                                        const activeClanGuild = channels.servers.find(s => s.id === rotator.clanTags[rotator.currentClanTagIndex % rotator.clanTags.length]);
                                        return (
                                            <span className="discord-clan-tag">
                                                {activeClanGuild?.icon ? (
                                                    <img src={activeClanGuild.icon} alt="" className="discord-clan-tag-icon" />
                                                ) : (
                                                    <span className="discord-clan-tag-fallback">
                                                        {getClanTagText(activeClanGuild).charAt(0)}
                                                    </span>
                                                )}
                                                <span className="discord-clan-tag-text">
                                                    {getClanTagText(activeClanGuild)}
                                                </span>
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div style={{ fontSize: '11px', color: '#b5bac1', marginTop: '2px', fontWeight: '600' }}>
                                    @{(currentAccount?.username || user?.username || 'ellecrydansmesdm').split('#')[0]}
                                </div>
                            </div>

                            {/* Inner Body Content Cards */}
                            <div style={{ 
                                background: '#111214', 
                                padding: '12px', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px' 
                            }}>
                                
                                {/* Custom Status Section */}
                                {previewStatusText && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '9px', fontWeight: '900', color: '#949ba4', letterSpacing: '0.5px' }}>{settings.language === 'fr' ? 'STATUT PERSONNALISÉ' : 'CUSTOM STATUS'}</div>
                                        <div style={{ fontSize: '11px', color: '#dbdee1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Smile size={13} color="#949ba4" style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {previewStatusText}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {previewStatusText && (previewBioText || previewActivity) && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }}></div>
                                )}

                                {/* About me / Bio Section */}
                                {previewBioText && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '9px', fontWeight: '900', color: '#949ba4', letterSpacing: '0.5px' }}>{settings.language === 'fr' ? 'À PROPOS DE MOI' : 'ABOUT ME'}</div>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            color: '#dbdee1', 
                                            lineHeight: '1.4', 
                                            whiteSpace: 'pre-wrap', 
                                            maxHeight: '100px',
                                            overflowY: 'auto'
                                        }} className="custom-scrollbar">
                                            {previewBioText}
                                        </div>
                                    </div>
                                )}

                                {previewBioText && previewActivity && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }}></div>
                                )}

                                {/* Rich Presence Section */}
                                {previewActivity && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ fontSize: '9px', fontWeight: '900', color: '#949ba4', letterSpacing: '0.5px' }}>{settings.language === 'fr' ? 'ACTIVITÉ' : 'ACTIVITY'}</div>
                                            <div style={{ 
                                                background: 'rgba(0,0,0,0.15)', 
                                                border: '1px solid rgba(255,255,255,0.02)', 
                                                borderRadius: '8px', 
                                                padding: '10px',
                                                display: 'flex',
                                                gap: '10px',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                                                    <div style={{ 
                                                        width: '44px', 
                                                        height: '44px', 
                                                        borderRadius: '8px', 
                                                        background: 'rgba(255,255,255,0.03)', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        {previewActivity.largeImage && (previewActivity.largeImage.startsWith('http') || previewActivity.largeImage.startsWith('https')) ? (
                                                            <img src={previewActivity.largeImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <Gamepad2 size={22} opacity={0.3} color="var(--accent)" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {resolvePreview(previewActivity.name)}
                                                    </div>
                                                    {previewActivity.details && (
                                                        <div style={{ fontSize: '10px', color: '#b5bac1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {resolvePreview(previewActivity.details)}
                                                        </div>
                                                    )}
                                                    {previewActivity.state && (
                                                        <div style={{ fontSize: '10px', color: '#b5bac1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {resolvePreview(previewActivity.state)}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Real-time Ticking Timer stopwatch */}
                                                    {('showTimestamp' in previewActivity && previewActivity.showTimestamp !== false) && (
                                                        <div style={{ fontSize: '9px', color: '#dbdee1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                                                            <Clock size={8} />
                                                            <StopwatchSpan isEnabled={rotator.enabled && rotator.enabledSections.activity} currentActivityIndex={rotator.currentActivityIndex} language={settings.language} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }}></div>
                                    </>
                                )}

                                {/* Fallback when nothing is enabled */}
                                {!previewStatusText && !previewBioText && !previewActivity && (
                                    <div style={{ fontSize: '10px', color: '#949ba4', textAlign: 'center', padding: '15px 0', fontStyle: 'italic' }}>
                                        {settings.language === 'fr' ? 'Aucun élément dynamique actif.' : 'No dynamic elements active.'}
                                    </div>
                                )}

                                {/* Discord Member Since mock details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#949ba4', letterSpacing: '0.5px' }}>{settings.language === 'fr' ? 'MEMBRE DISCORD DEPUIS' : 'DISCORD MEMBER SINCE'}</div>
                                    <div style={{ fontSize: '11px', color: '#dbdee1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#dbdee1' }}></div>
                                        </div>
                                        <span>{getAccountCreationDate(user?.id || currentAccount?.id, settings.language)}</span>
                                    </div>
                                </div>

                                {/* Fallback when nothing is enabled */}
                                {!rotator.enabledSections.status && !rotator.enabledSections.bio && !rotator.enabledSections.activity && (
                                    <div style={{ fontSize: '10px', color: '#949ba4', textAlign: 'center', padding: '15px 0', fontStyle: 'italic' }}>
                                        {settings.language === 'fr' ? 'Aucun élément dynamique actif.' : 'No dynamic elements active.'}
                                    </div>
                                )}

                            </div>

                            {/* Secure Monospace client footer */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '6px', 
                                background: 'rgba(0, 210, 255, 0.05)', 
                                border: '1px solid rgba(0, 210, 255, 0.15)',
                                padding: '6px 12px', 
                                borderRadius: '8px',
                                color: 'var(--accent)',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                letterSpacing: '1px',
                                boxShadow: '0 0 10px rgba(0, 210, 255, 0.1)'
                            }}>
                                🛡️ SECURE DISCORD CLIENT BY OPSEC PRO
                            </div>

                        </div>

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
                .section-card.disabled { opacity: 0.75; }
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
                @media (max-width: 1100px) {
                    .rotator-content-grid {
                        grid-template-columns: 1fr !important;
                    }
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
                                <h2 style={{ fontSize: '18px', fontWeight: '900' }}>{isFr ? 'Éditer la Présence' : 'Edit Presence'}</h2>
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
                                    <label className="caption">{isFr ? "Type d'activité" : "Activity Type"}</label>
                                    <select className="input-field" value={rotator.customRPCs[editingRpcIndex].type} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].type = parseInt(e.target.value);
                                        handleUpdate({ customRPCs: newList });
                                    }} style={{ fontSize: '12px', background: 'var(--bg-card)' }}>
                                        <option value="0">{isFr ? 'Jouer à' : 'Playing'}</option>
                                        <option value="1">{isFr ? 'Streaming' : 'Streaming'}</option>
                                        <option value="2">{isFr ? 'Écouter' : 'Listening to'}</option>
                                        <option value="3">{isFr ? 'Regarder' : 'Watching'}</option>
                                        <option value="5">{isFr ? 'Participer à' : 'Competing in'}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="caption">{isFr ? "Nom de l'application" : "Application Name"}</label>
                                <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].name} onChange={e => {
                                    const newList = [...rotator.customRPCs];
                                    newList[editingRpcIndex].name = e.target.value;
                                    handleUpdate({ customRPCs: newList });
                                }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label className="caption">{isFr ? 'Détails (Ligne 1)' : 'Details (Line 1)'}</label>
                                    <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].details || ""} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].details = e.target.value;
                                        handleUpdate({ customRPCs: newList });
                                    }} />
                                </div>
                                <div>
                                    <label className="caption">{isFr ? 'État (Ligne 2)' : 'State (Line 2)'}</label>
                                    <input type="text" className="input-field" value={rotator.customRPCs[editingRpcIndex].state || ""} onChange={e => {
                                        const newList = [...rotator.customRPCs];
                                        newList[editingRpcIndex].state = e.target.value;
                                        handleUpdate({ customRPCs: newList });
                                    }} />
                                </div>
                            </div>

                            <div>
                                <label className="caption">{isFr ? 'Image Principale (URL)' : 'Main Image (URL)'}</label>
                                <input type="text" className="input-field" placeholder={isFr ? "Lien vers une image ou asset key" : "Link to image or asset key"} value={rotator.customRPCs[editingRpcIndex].largeImage || ""} onChange={e => {
                                    const newList = [...rotator.customRPCs];
                                    newList[editingRpcIndex].largeImage = e.target.value;
                                    handleUpdate({ customRPCs: newList });
                                }} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} color="var(--accent)" />
                                    <span style={{ fontSize: '12px', fontWeight: '800' }}>{isFr ? 'Afficher le Timer (Temps écoulé)' : 'Show Timer (Elapsed)'}</span>
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
                                <ShieldCheck size={18} /> {isFr ? 'ENREGISTRER LA CONFIGURATION' : 'SAVE CONFIGURATION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
