import React, { useState, useEffect, useRef } from 'react';
import { 
    Target, Zap, ShieldAlert, Activity, Search, Trash2, 
    FileText, ShieldCheck, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [manualUsername, setManualUsername] = useState('');
    const [batchText, setBatchText] = useState('');
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [autoClaim, setAutoClaim] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [delay, setDelay] = useState(2500);
    
    // OG Generator State
    const [generatorType, setGeneratorType] = useState('3l');
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
        // Listen for live updates from the backend batch process
        const unsubscribe = window.electronAPI.onPomeloUpdate((data: any) => {
            addStatus(data.username, data.status, data.firstSeen);
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
        if (!firstSeen) return 'Calcul...';
        const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
        const targetDate = firstSeen + FOURTEEN_DAYS;
        const now = Date.now();
        const diff = targetDate - now;

        if (diff <= 0) return 'DISPO MAINTENANT';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        return `${days}j ${hours}h ${mins}m ${secs}s`;
    };

    const handleManualCheck = async () => {
        if (!manualUsername.trim()) return;
        setIsCheckingManual(true);
        try {
            const res = await window.electronAPI.checkPomelo(manualUsername);
            if (res.success && res.data) {
                if (res.data.available) {
                    if (res.data.status === 'owned') {
                        addStatus(manualUsername, 'owned');
                        showToast(`Tu possèdes déjà le pseudo ${manualUsername}.`, 'success');
                        setIsCheckingManual(false);
                        return;
                    }
                    addStatus(manualUsername, 'available');
                    showToast(`Pseudo ${manualUsername} DISPONIBLE !`, 'success');
                    
                    if (autoClaim && password) {
                        const claimRes = await window.electronAPI.claimPomelo({ username: manualUsername, password });
                        if (claimRes.success) {
                            addStatus(manualUsername, 'claimed');
                            showToast(`SUCCÈS : Pseudo ${manualUsername} claim avec succès !`, 'success');
                        }
                    }
                } else if (res.data.status === 'ghost') {
                    addStatus(manualUsername, 'ghost', res.data.firstSeen);
                    showToast(`Pseudo ${manualUsername} en COOLDOWN (Ghost).`, 'success');
                } else {
                    addStatus(manualUsername, 'taken');
                    showToast(`Pseudo ${manualUsername} déjà pris.`, 'danger');
                }
            } else {
                showToast(res.error || "Erreur lors du check", 'danger');
            }
        } finally {
            setIsCheckingManual(false);
        }
    };

    const handleBatchToggle = async () => {
        if (isBatchRunning) {
            await window.electronAPI.stopPomeloBatch();
            setIsBatchRunning(false);
            showToast("Batch check arrêté", 'danger');
        } else {
            const usernames = batchText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
            if (usernames.length === 0) {
                showToast("Veuillez entrer une liste de pseudos !", 'danger');
                return;
            }

            if (autoClaim && !password) {
                showToast("Mot de passe requis pour l'Auto-Claim !", 'danger');
                return;
            }

            setIsBatchRunning(true);
            showToast(`Batch lancé : ${usernames.length} pseudos`, 'success');
            
            const res = await window.electronAPI.startPomeloBatch({ 
                usernames, 
                delay, 
                autoClaim, 
                password 
            });

            if (res.success && res.data?.claimed) {
                addStatus(res.data.claimed, 'claimed');
                showToast(`SNIPED : ${res.data.claimed} a été récupéré !`, 'success');
            }
            
            setIsBatchRunning(false);
        }
    };

    const handleGenerateOG = () => {
        if (generatorAmount > 1000) {
            showToast('⚠️ Limite de sécurité : Max 1000 par clic pour éviter le Token Ban.', 'danger');
            return;
        }

        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789_.';
        
        const generateStr = (length: number, chars: string) => {
            let res = '';
            for (let i = 0; i < length; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        };

        const newBatches = new Set<string>();
        let attempts = 0;
        
        while (newBatches.size < generatorAmount && attempts < generatorAmount * 3) {
            let str = '';
            if (generatorType === '3l') str = generateStr(3, letters);
            else if (generatorType === '3c') str = generateStr(3, alphanum);
            else if (generatorType === '4l') str = generateStr(4, letters);
            else if (generatorType === '4c') str = generateStr(4, alphanum);
            else if (generatorType === '2c') str = generateStr(2, alphanum);
            
            // Discord rule: no consecutive dots, no dots at edges
            if (!str.includes('..') && !str.startsWith('.') && !str.endsWith('.')) {
                newBatches.add(str);
            }
            attempts++;
        }

        const addedArr = Array.from(newBatches);
        setBatchText(prev => prev ? prev + '\n' + addedArr.join('\n') : addedArr.join('\n'));
        showToast(`🎲 ${addedArr.length} pseudos générés et ajoutés au Batch !`, 'success');
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                            <Activity size={10} />
                            <p className="caption" style={{ fontSize: '9px', fontWeight: 'bold' }}>PROTOCOLE DE DÉTECTION ET CAPTURE DE PSEUDOS OG</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={14} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>INTERVALLE (ms)</span>
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
                        <label className="caption" style={{ display: 'block', marginBottom: '15px', fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>CIBLE MANUELLE</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                <input 
                                    type="text" 
                                    placeholder="Username à sniper..." 
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
                                {isCheckingManual ? <RefreshCw className="animate-spin" size={16} /> : "VÉRIFIER"}
                            </button>
                        </div>
                    </div>

                    {/* Batch Mode */}
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>MODE BATCH (MULTI-CHECK)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                                <FileText size={12} />
                                <span style={{ fontSize: '9px', fontWeight: 'bold' }}>GÉNÉRATEUR OU MANUEL</span>
                            </div>
                        </div>
                        
                        {/* OG Generator Hub */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <select 
                                value={generatorType} 
                                onChange={e => setGeneratorType(e.target.value)}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', fontSize: '11px', outline: 'none' }}
                            >
                                <option value="3l">3 Lettres</option>
                                <option value="3c">3 Caract.</option>
                                <option value="4l">4 Lettres</option>
                                <option value="4c">4 Caract.</option>
                                <option value="2c">2 Caract.</option>
                            </select>
                            
                            <input 
                                type="number" 
                                value={generatorAmount}
                                onChange={e => setGeneratorAmount(Number(e.target.value))}
                                className="no-arrows"
                                style={{ width: '50px', background: 'rgba(0,0,0,0.4)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', fontSize: '11px', outline: 'none', textAlign: 'center', fontWeight: 'bold' }}
                            />
                            
                            <button 
                                onClick={handleGenerateOG}
                                style={{ padding: '0 15px', background: 'rgba(0, 210, 255, 0.1)', color: 'var(--accent)', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 210, 255, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 210, 255, 0.1)'}
                            >
                                <Sparkles size={14} /> GÉNÉRER
                            </button>
                        </div>
                        
                        <textarea 
                            value={batchText} 
                            onChange={e => setBatchText(e.target.value)} 
                            placeholder="pseudo1
pseudo2
pseudo3..." 
                            style={{ width: '100%', flex: 1, minHeight: '120px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '12px', padding: '15px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'monospace' }} 
                        />
                        <button 
                            onClick={handleBatchToggle}
                            className="btn-primary" 
                            style={{ width: '100%', marginTop: '15px', background: isBatchRunning ? 'var(--danger)' : 'var(--accent)', boxShadow: isBatchRunning ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)' }}
                        >
                            {isBatchRunning ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                            <span style={{ marginLeft: '10px' }}>{isBatchRunning ? 'ARRÊTER LE BATCH' : 'LANCER LE SCAN MASS'}</span>
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
                                <span className="caption" style={{ color: 'var(--danger)', fontWeight: '900' }}>AUTO-CLAIM (VOL PSEUDO)</span>
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
                                placeholder="Mot de passe Discord (Requis pour claim)..." 
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
                            {autoClaim ? "SÉCURITÉ : Ton pass est utilisé uniquement pour la requête PATCH locale." : "GARDER PSEUDO : Le bot ne modifiera pas ton profil."}
                        </p>
                    </div>

                    {/* Live Radar Console */}
                    <div style={{ flex: 1, padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="caption" style={{ fontSize: '9px', fontWeight: '900', opacity: 0.6 }}>RADAR DE DÉTECTION EN DIRECT</span>
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
                                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>AUCUNE ACTIVITÉ RADAR</span>
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
                                                        Libération : {getCountdown(item.firstSeen)}
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
                                <Trash2 size={10} /> VIDER LE RADAR
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
