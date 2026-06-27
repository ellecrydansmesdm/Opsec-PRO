import React, { useState, useEffect, useRef } from 'react';
import { 
    Target, Zap, ShieldAlert, Activity, Search, Trash2, 
    FileText, ShieldCheck, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { audioService } from '@/services/AudioService';

interface PomeloSniperProps {
    showToast: (message: string, type: 'success' | 'danger') => void;
}

interface PomeloStatus {
    username: string;
    status: 'taken' | 'available' | 'claimed' | 'error' | 'ghost' | 'owned' | 'captcha';
    firstSeen?: number; // Timestamp
    time: string;
}

export const PomeloSniper = ({ showToast }: PomeloSniperProps) => {
    const { settings } = useSettingsStore();
    const [manualUsername, setManualUsername] = useState('');
    const [batchText, setBatchText] = useState('');
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [autoClaim, setAutoClaim] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [delay, setDelay] = useState(2500);
    const [botToken, setBotToken] = useState('');
    
    // OG Generator State
    const [generatorType, setGeneratorType] = useState('custom');
    const [generatorAmount, setGeneratorAmount] = useState(100);
    
    const [statusList, setStatusList] = useState<PomeloStatus[]>([]);
    const [isCheckingManual, setIsCheckingManual] = useState(false);
    const listEndRef = useRef<HTMLDivElement>(null);
    const [, setTick] = useState(0);

    useEffect(() => {
        // Tick every second to refresh countdowns
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Listen for live updates from the background batch process
        const unsubscribe = window.electronAPI.onPomeloUpdate((data: any) => {
            addStatus(data.username, data.status, data.firstSeen);
            if (data.status === 'available') {
                audioService.play('pomelo_username_found');
            } else if (data.status === 'claimed') {
                audioService.play('pomelo_username_claimed');
            } else if (data.status === 'error' || data.status === 'captcha') {
                audioService.play('pomelo_claim_failed');
            }
        });
        return () => unsubscribe();
    }, []);

    const addStatus = (username: string, status: PomeloStatus['status'], firstSeen?: number) => {
        const newStatus: PomeloStatus = {
            username,
            status,
            firstSeen,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setStatusList(prev => [newStatus, ...prev.slice(0, 49)]);
    };

    const getCountdown = (firstSeen?: number) => {
        const isFr = settings.language === 'fr';
        if (!firstSeen) return isFr ? 'Calcul...' : 'Calculating...';
        const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
        const targetDate = firstSeen + FOURTEEN_DAYS;
        const now = Date.now();
        const diff = targetDate - now;

        if (diff <= 0) return isFr ? 'DISPO MAINTENANT' : 'AVAILABLE NOW';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        return `${days}${isFr ? 'j' : 'd'} ${hours}h ${mins}m ${secs}s`;
    };

    const handleManualCheck = async () => {
        const isFr = settings.language === 'fr';
        if (!botToken.trim()) {
            showToast(isFr ? "Bot Token requis !" : "Bot Token required!", 'danger');
            return;
        }
        if (!manualUsername.trim()) return;
        setIsCheckingManual(true);
        try {
            const res = await window.electronAPI.checkPomelo({ username: manualUsername, botToken });
            if (res.success && res.data) {
                if (res.data.available) {
                    if (res.data.status === 'owned') {
                        addStatus(manualUsername, 'owned');
                        showToast(isFr ? `Tu possèdes déjà le pseudo ${manualUsername}.` : `You already own the username ${manualUsername}.`, 'success');
                        setIsCheckingManual(false);
                        return;
                    }
                    addStatus(manualUsername, 'available');
                    audioService.play('pomelo_username_found');
                    showToast(isFr ? `Pseudo ${manualUsername} DISPONIBLE !` : `Username ${manualUsername} AVAILABLE!`, 'success');
                    
                    if (autoClaim && password) {
                        const claimRes = await window.electronAPI.claimPomelo({ username: manualUsername, password });
                        if (claimRes.success) {
                            addStatus(manualUsername, 'claimed');
                            audioService.play('pomelo_username_claimed');
                            showToast(isFr ? `SUCCÈS : Pseudo ${manualUsername} claim avec succès !` : `SUCCESS: Username ${manualUsername} successfully claimed!`, 'success');
                        } else {
                            audioService.play('pomelo_claim_failed');
                        }
                    }
                } else if (res.data.status === 'ghost') {
                    addStatus(manualUsername, 'ghost', res.data.firstSeen);
                    showToast(isFr ? `Pseudo ${manualUsername} en COOLDOWN (Ghost).` : `Username ${manualUsername} is in COOLDOWN (Ghost).`, 'success');
                } else {
                    addStatus(manualUsername, 'taken');
                    showToast(isFr ? `Pseudo ${manualUsername} déjà pris.` : `Username ${manualUsername} is already taken.`, 'danger');
                }
            } else {
                audioService.play('pomelo_claim_failed');
                showToast(res.error || (isFr ? "Erreur lors du check" : "Error checking username"), 'danger');
            }
        } finally {
            setIsCheckingManual(false);
        }
    };

    const handleBatchToggle = async () => {
        const isFr = settings.language === 'fr';
        if (isBatchRunning) {
            audioService.play('module_stop');
            await window.electronAPI.stopPomeloBatch();
            setIsBatchRunning(false);
            showToast(isFr ? "Batch check arrêté" : "Batch check stopped", 'danger');
        } else {
            if (!botToken.trim()) {
                showToast(isFr ? "Bot Token requis !" : "Bot Token required!", 'danger');
                return;
            }

            let usernames: string[] = [];
            if (generatorType === 'custom') {
                usernames = batchText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
                if (usernames.length === 0) {
                    showToast(isFr ? "Veuillez entrer une liste de pseudos !" : "Please enter a list of usernames!", 'danger');
                    return;
                }
            }

            if (autoClaim && !password) {
                showToast(isFr ? "Mot de passe requis pour l'Auto-Claim !" : "Password required for Auto-Claim!", 'danger');
                return;
            }

            setIsBatchRunning(true);
            audioService.play('module_launch');
            showToast(
                generatorType === 'custom' 
                    ? (isFr ? `Batch lancé : ${usernames.length} pseudos` : `Batch started: ${usernames.length} usernames`)
                    : (isFr ? `Générateur ${generatorType.toUpperCase()} lancé` : `Generator ${generatorType.toUpperCase()} started`), 
                'success'
            );
            
            const res = await window.electronAPI.startPomeloBatch({ 
                usernames, 
                delay, 
                autoClaim, 
                password,
                botToken,
                generator: generatorType
            });

            if (res.success && res.data?.claimed) {
                addStatus(res.data.claimed, 'claimed');
                audioService.play('pomelo_username_claimed');
                showToast(isFr ? `SNIPED : ${res.data.claimed} a été récupéré !` : `SNIPED: ${res.data.claimed} claimed successfully!`, 'success');
            }
            
            setIsBatchRunning(false);
        }
    };

    return (
        <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ padding: '15px', background: 'rgba(0, 210, 255, 0.1)', borderRadius: '15px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
                        <Target size={28} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' }}>Pomelo Sniper (Username)</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                            <ShieldCheck size={10} color="var(--accent)" />
                            <p className="caption" style={{ fontSize: '9.5px', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'none' }}>
                                {settings.language === 'fr' 
                                    ? "Token Bot (Obligatoire) : Requis pour interroger l'API Discord."
                                    : "Bot Token (Mandatory): Required to query the Discord API."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={14} style={{ opacity: 0.5 }} />
                        <input 
                            type="password" 
                            placeholder={settings.language === 'fr' ? "Bot Token (Requis)" : "Bot Token (Required)"}
                            value={botToken} 
                            onChange={e => setBotToken(e.target.value)} 
                            style={{ width: '130px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', fontSize: '11px', outline: 'none' }} 
                        />
                    </div>
                    <div className="glass-card" style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={14} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{settings.language === 'fr' ? 'INTERVALLE (ms)' : 'INTERVAL (ms)'}</span>
                        <input 
                            type="number" 
                            className="no-arrows"
                            value={delay} 
                            onChange={e => setDelay(Number(e.target.value))} 
                            style={{ width: '60px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--accent)', fontWeight: '900', textAlign: 'center', outline: 'none' }} 
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                {/* Left: Input & Config */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* Manual Target */}
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                        <label className="caption" style={{ display: 'block', marginBottom: '15px', fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                            {settings.language === 'fr' ? 'CIBLE MANUELLE' : 'MANUAL TARGET'}
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                <input 
                                    type="text" 
                                    placeholder={settings.language === 'fr' ? "Username à sniper..." : "Username to check..."} 
                                    value={manualUsername}
                                    onChange={e => setManualUsername(e.target.value.toLowerCase())}
                                    style={{ width: '100%', padding: '14px 15px 14px 45px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', fontSize: '13px', outline: 'none' }}
                                />
                            </div>
                            <button 
                                onClick={handleManualCheck}
                                disabled={isCheckingManual || !manualUsername}
                                className="btn-primary" 
                                style={{ width: '120px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}
                            >
                                {isCheckingManual ? <RefreshCw className="animate-spin" size={16} /> : (settings.language === 'fr' ? "VÉRIFIER" : "CHECK")}
                            </button>
                        </div>
                    </div>

                    {/* Batch Mode */}
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                                {settings.language === 'fr' ? 'MODE BATCH (MULTI-CHECK)' : 'BATCH MODE (MULTI-CHECK)'}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                                <FileText size={12} />
                                <span style={{ fontSize: '9px', fontWeight: 'bold' }}>
                                    {settings.language === 'fr' ? 'GÉNÉRATEUR OU MANUEL' : 'GENERATOR OR MANUAL'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Generator Selection */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <select 
                                value={generatorType} 
                                onChange={e => setGeneratorType(e.target.value)}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', fontSize: '11px', outline: 'none' }}
                            >
                                <option value="custom">{settings.language === 'fr' ? 'Liste Personnalisée (Manuel)' : 'Custom List (Manual)'}</option>
                                <option value="3l">{settings.language === 'fr' ? 'Générateur : 3 Lettres (Backend)' : 'Generator: 3 Letters (Backend)'}</option>
                                <option value="3c">{settings.language === 'fr' ? 'Générateur : 3 Caract. (Backend)' : 'Generator: 3 Char. (Backend)'}</option>
                                <option value="4l">{settings.language === 'fr' ? 'Générateur : 4 Lettres (Backend)' : 'Generator: 4 Letters (Backend)'}</option>
                                <option value="4c">{settings.language === 'fr' ? 'Générateur : 4 Caract. (Backend)' : 'Generator: 4 Char. (Backend)'}</option>
                            </select>
                        </div>
                        
                        {generatorType === 'custom' ? (
                            <textarea 
                                value={batchText} 
                                onChange={e => setBatchText(e.target.value)} 
                                placeholder={settings.language === 'fr' ? "pseudo1\npseudo2\npseudo3..." : "username1\nusername2\nusername3..."} 
                                style={{ width: '100%', flex: 1, minHeight: '120px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '12px', padding: '15px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'monospace' }} 
                            />
                        ) : (
                            <div style={{ flex: 1, minHeight: '120px', background: 'rgba(0, 210, 255, 0.03)', border: '1px dotted rgba(0, 210, 255, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center' }}>
                                <Sparkles size={24} color="var(--accent)" />
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                                    {settings.language === 'fr' ? 'Génération Backend Automatique' : 'Automatic Backend Generation'}
                                </span>
                                <p style={{ fontSize: '10px', color: 'var(--text-dim)', maxWidth: '240px', lineHeight: '1.4' }}>
                                    {settings.language === 'fr' 
                                        ? `Le serveur va générer, mélanger (shuffle) et scanner la totalité des pseudos à ${generatorType === '3l' ? '3 lettres' : generatorType === '3c' ? '3 caractères' : generatorType === '4l' ? '4 lettres' : '4 caractères'}.`
                                        : `The backend will automatically generate, shuffle, and scan all usernames of ${generatorType === '3l' ? '3 letters' : generatorType === '3c' ? '3 characters' : generatorType === '4l' ? '4 letters' : '4 characters'}.`
                                    }
                                </p>
                            </div>
                        )}
                        <button 
                            onClick={handleBatchToggle}
                            className="btn-primary" 
                            style={{ width: '100%', marginTop: '15px', background: isBatchRunning ? 'var(--danger)' : 'var(--accent)', boxShadow: isBatchRunning ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)' }}
                        >
                            {isBatchRunning ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                            <span style={{ marginLeft: '10px' }}>
                                {isBatchRunning 
                                    ? (settings.language === 'fr' ? 'ARRÊTER LE SCAN' : 'STOP SCAN') 
                                    : (settings.language === 'fr' ? 'LANCER LE SCAN MASS' : 'START MASS SCAN')
                                }
                            </span>
                        </button>
                    </div>
                </div>

                {/* Right: Security & Radar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* Auto-Claim Logic */}
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--danger-glow)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck size={16} color="var(--danger)" />
                                <span className="caption" style={{ color: 'var(--danger)', fontWeight: '900' }}>
                                    {settings.language === 'fr' ? 'AUTO-CLAIM (VOL PSEUDO)' : 'AUTO-CLAIM (USERNAME SNIPER)'}
                                </span>
                            </div>
                            <div onClick={() => setAutoClaim(!autoClaim)} className={`nighty-toggle ${autoClaim ? 'active' : ''}`} style={{ '--accent': 'var(--danger)' } as any}>
                                <div className="nighty-toggle-handle"></div>
                            </div>
                        </div>

                        <div style={{ position: 'relative', opacity: autoClaim ? 1 : 0.3, transition: '0.3s' }}>
                            <ShieldAlert size={14} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                disabled={!autoClaim}
                                placeholder={settings.language === 'fr' ? "Mot de passe Discord (Requis pour claim)..." : "Discord Password (Required for claim)..."} 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '14px 45px 14px 45px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', fontSize: '12px', outline: 'none' }}
                            />
                            <div 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </div>
                        </div>
                        <p style={{ fontSize: '9px', opacity: 0.4, marginTop: '10px', lineHeight: '1.4' }}>
                            <AlertCircle size={10} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                            {autoClaim 
                                ? (settings.language === 'fr' ? "SÉCURITÉ : Ton pass est utilisé uniquement pour la requête PATCH locale." : "SECURITY: Your password is only used for the local PATCH request.")
                                : (settings.language === 'fr' ? "GARDER PSEUDO : Le bot ne modifiera pas ton profil." : "SAFE MODE: The bot will not modify your profile.")
                            }
                        </p>
                    </div>

                    {/* Live Radar Console */}
                    <div style={{ flex: 1, padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="caption" style={{ fontSize: '9px', fontWeight: '900', opacity: 0.6 }}>
                                {settings.language === 'fr' ? 'RADAR DE DÉTECTION EN DIRECT' : 'LIVE DETECTION RADAR'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }}></div>
                                <span style={{ fontSize: '9px', fontWeight: 'bold' }}>SCANNING</span>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {statusList.length === 0 ? (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                                        <Activity size={32} style={{ marginBottom: '10px' }} />
                                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                                            {settings.language === 'fr' ? 'AUCUNE ACTIVITÉ RADAR' : 'NO RADAR ACTIVITY'}
                                        </span>
                                    </div>
                                ) : (
                                    statusList.map((item, idx) => (
                                        <motion.div 
                                            key={`${item.username}-${idx}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '10px 15px', 
                                                background: 'rgba(255,255,255,0.02)', 
                                                borderRadius: '10px', 
                                                marginBottom: '8px',
                                                border: `1px solid ${item.status === 'available' ? 'rgba(0, 255, 128, 0.1)' : item.status === 'claimed' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '10px', opacity: 0.3, fontFamily: 'monospace' }}>{item.time}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: item.status === 'available' ? 'var(--success)' : item.status === 'claimed' ? '#ffd700' : 'white' }}>
                                                    {item.username}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <div style={{ 
                                                    padding: '4px 8px', 
                                                    background: item.status === 'available' ? 'rgba(0, 255, 128, 0.1)' : item.status === 'claimed' ? 'rgba(255, 215, 0, 0.1)' : item.status === 'ghost' ? 'rgba(255, 165, 0, 0.1)' : item.status === 'owned' ? 'rgba(0, 160, 255, 0.1)' : item.status === 'captcha' ? 'rgba(255, 191, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                                    borderRadius: '6px',
                                                    fontSize: '9px',
                                                    fontWeight: '900',
                                                    color: item.status === 'available' ? 'var(--success)' : item.status === 'claimed' ? '#ffd700' : item.status === 'ghost' ? '#ffa500' : item.status === 'owned' ? '#00a0ff' : item.status === 'captcha' ? '#ffbf00' : 'var(--danger)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    {item.status === 'claimed' && <Sparkles size={10} />}
                                                    {item.status === 'ghost' && <Clock size={10} />}
                                                    {item.status === 'owned' && <ShieldCheck size={10} />}
                                                    {item.status === 'captcha' && <AlertCircle size={10} />}
                                                    {item.status.toUpperCase()}
                                                </div>
                                                {item.status === 'ghost' && (
                                                    <span style={{ fontSize: '8px', color: '#ffa500', fontWeight: 'bold', opacity: 0.8 }}>
                                                        {settings.language === 'fr' ? 'Libération :' : 'Release:'} {getCountdown(item.firstSeen)}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {statusList.length > 0 && (
                            <button 
                                onClick={() => setStatusList([])}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '9px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Trash2 size={10} /> {settings.language === 'fr' ? 'VIDER LE RADAR' : 'CLEAR RADAR'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
