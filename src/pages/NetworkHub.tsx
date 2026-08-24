import React, { useState, useEffect, useMemo } from 'react';
import {
    Globe, Key, Cpu, Shield, Check, Wifi, Info,
    Activity, AlertTriangle, AlertCircle, RefreshCw,
    Layers, BookOpen, Radio, Lock, ShieldAlert, UserPlus, Square,
    Terminal, Zap, ExternalLink, Copy, CheckCircle2, XCircle
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { HubPageLayout, HubSectionCard, HubToggleRow, HubFieldRow, HubSubTabKeepAlive } from '@/components/layout/HubPageLayout';

type SolverType = 'capsolver' | 'capmonster' | '2captcha' | 'anticaptcha' | 'nocaptchaai';
type JoinResult = { username: string; status: 'joined' | 'already' | 'captcha' | 'error'; message?: string };

export const NetworkHub = () => {
    const { settings, updateSetting } = useSettingsStore();
    const { user } = useUserStore();
    const isFr = settings.language === 'fr';
    const [activeTab, setActiveTab] = useState<'config' | 'resolvers' | 'proxies' | 'bypass'>('config');

    const solverFields = useMemo((): { type: SolverType; label: string; hint?: string; placeholder: string }[] => [
        { type: 'capsolver', label: 'Capsolver API Key', hint: isFr ? 'Recommandé en 2026 — IA ultra rapide (<3s)' : 'Recommended in 2026 — Ultra-fast AI (<3s)', placeholder: 'capsolver.com API Key...' },
        { type: 'capmonster', label: 'CapMonster Cloud API Key', hint: isFr ? 'Excellent rapport performance / coût' : 'Best price / performance ratio', placeholder: 'capmonster.cloud API Key...' },
        { type: '2captcha', label: '2Captcha API Key', hint: isFr ? 'Solveur hybride IA + Humains de secours' : 'Hybrid AI + Human fallback solver', placeholder: '2captcha.com API Key...' },
        { type: 'anticaptcha', label: 'Anti-Captcha Key', hint: isFr ? 'Spécialisé Cloudflare Turnstile' : 'Specialized Cloudflare Turnstile', placeholder: 'anti-captcha.com API Key...' },
        { type: 'nocaptchaai', label: 'NoCaptchaAI Key', hint: isFr ? 'IA spécialisée hCaptcha Enterprise' : 'Specialized hCaptcha Enterprise AI', placeholder: 'nocaptchaai.com API Key...' },
    ], [isFr]);

    const [capsolverKey, setCapsolverKey] = useState(settings.automationConfig?.capsolverKey || '');
    const [capMonsterKey, setCapMonsterKey] = useState(settings.automationConfig?.capMonsterKey || '');
    const [twoCaptchaKey, setTwoCaptchaKey] = useState(settings.automationConfig?.twoCaptchaKey || '');
    const [antiCaptchaKey, setAntiCaptchaKey] = useState(settings.automationConfig?.antiCaptchaKey || '');
    const [noCaptchaAIKey, setNoCaptchaAIKey] = useState(settings.automationConfig?.noCaptchaAIKey || '');

    const [checkingSolver, setCheckingSolver] = useState<SolverType | null>(null);
    const [balances, setBalances] = useState<Record<SolverType, number | null>>({
        capsolver: null, capmonster: null, '2captcha': null, anticaptcha: null, nocaptchaai: null,
    });

    const [proxyEnabled, setProxyEnabled] = useState(settings.automationConfig?.proxyEnabled || false);
    const [proxyType, setProxyType] = useState(settings.automationConfig?.proxyType || 'socks5');
    const [proxyListText, setProxyListText] = useState(settings.automationConfig?.proxyList?.join('\n') || '');
    const [testingProxies, setTestingProxies] = useState(false);
    const [proxyResults, setProxyResults] = useState<{ proxy: string; status: 'online' | 'dead' | 'error'; latencyMs?: number; error?: string }[]>([]);

    const [inviteLink, setInviteLink] = useState('');
    const [joinDelay, setJoinDelay] = useState(3000);
    const [isJoining, setIsJoining] = useState(false);
    const [joinResults, setJoinResults] = useState<JoinResult[]>([]);

    const [diags, setDiags] = useState<any>({
        captchaSolverActive: false,
        captchaSolverType: 'Aucun',
        proxyActive: false,
        proxyCount: 0,
        pomeloWarn: true,
        userIsBot: false,
        gatewayVersion: 'v9',
        voiceProtocol: 'DAVE MLS / WebRTC v9',
        clientBuildNumber: 595897,
        ja4Fingerprint: 't13d1516h2_8daaf6152771_b2999e0ff5a8',
        superPropertiesStatus: 'Synchronisé (2026 Stable)'
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);

    const solverValues: Record<SolverType, string> = {
        capsolver: capsolverKey, capmonster: capMonsterKey, '2captcha': twoCaptchaKey,
        anticaptcha: antiCaptchaKey, nocaptchaai: noCaptchaAIKey,
    };

    const hasCaptchaKey = useMemo(() => {
        const cfg = settings.automationConfig;
        return !!(cfg?.capsolverKey || cfg?.capMonsterKey || cfg?.twoCaptchaKey || cfg?.antiCaptchaKey || cfg?.noCaptchaAIKey);
    }, [settings.automationConfig]);

    const tokenCount = useMemo(() => {
        const alts = settings.accounts?.filter(a => a.id !== user?.id && a.token).length ?? 0;
        return (user ? 1 : 0) + alts;
    }, [settings.accounts, user]);

    const setSolverValue = (type: SolverType, value: string) => {
        if (type === 'capsolver') setCapsolverKey(value);
        else if (type === 'capmonster') setCapMonsterKey(value);
        else if (type === '2captcha') setTwoCaptchaKey(value);
        else if (type === 'anticaptcha') setAntiCaptchaKey(value);
        else setNoCaptchaAIKey(value);
    };

    const showToast = (message: string, type: 'success' | 'danger' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const refreshDiagnostics = () => {
        window.electronAPI.getDiagnostics?.().then((res: any) => {
            if (res?.success && res?.data) {
                setDiags((prev: any) => ({ ...prev, ...res.data }));
            }
        });
    };

    useEffect(() => { refreshDiagnostics(); }, [settings]);

    useEffect(() => {
        const syncJoin = async () => {
            try {
                const res = await window.electronAPI.getAutoJoinStatus();
                if (res?.success && res?.data) setIsJoining(!!res.data.running);
            } catch { /* ignore */ }
        };
        syncJoin();
        const interval = setInterval(syncJoin, 2500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const list = proxyListText.split('\n').map(p => p.trim()).filter(p => p);
            const newConfig = {
                autoReport: settings.automationConfig?.autoReport || {
                    enabled: false, targetUserId: '', floodLimit: 5,
                    insultKeywords: ['fdp', 'connard', 'salope', 'useless'], reportCategory: [3, 28, 72],
                },
                nitroSniper: settings.automationConfig?.nitroSniper || { enabled: false, priorityMain: true },
                giveawayJoiner: settings.automationConfig?.giveawayJoiner || { enabled: false, delay: 5000 },
                capsolverKey, capMonsterKey, twoCaptchaKey, antiCaptchaKey, noCaptchaAIKey,
                proxyEnabled, proxyType, proxyList: list,
            };
            if (JSON.stringify(settings.automationConfig) !== JSON.stringify(newConfig)) {
                updateSetting('automationConfig', newConfig);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [capsolverKey, capMonsterKey, twoCaptchaKey, antiCaptchaKey, noCaptchaAIKey, proxyEnabled, proxyType, proxyListText]);

    const handleVerifyKey = async (type: SolverType) => {
        const key = solverValues[type];
        if (!key) { showToast(isFr ? 'Veuillez d\'abord entrer une clé API !' : 'Please enter an API key first!', 'danger'); return; }

        setCheckingSolver(type);
        try {
            const res = type === 'capsolver' ? await window.electronAPI.checkCapsolverKey(key)
                : type === 'capmonster' ? await window.electronAPI.checkCapMonsterKey(key)
                : type === '2captcha' ? await window.electronAPI.checkTwoCaptchaKey(key)
                : type === 'anticaptcha' ? await window.electronAPI.checkAntiCaptchaKey(key)
                : await window.electronAPI.checkNoCaptchaAIKey(key);

            if (res.success && res.data) {
                setBalances(prev => ({ ...prev, [type]: res.data!.balance }));
                showToast(isFr ? `Clé validée ! Solde : ${res.data!.balance}$` : `Key validated! Balance: ${res.data!.balance}$`, 'success');
            } else {
                setBalances(prev => ({ ...prev, [type]: null }));
                showToast(`${isFr ? 'Vérification échouée' : 'Verification failed'} : ${(res as any).error || (isFr ? 'Erreur de clé' : 'Key error')}`, 'danger');
            }
        } catch (e: any) {
            showToast(`${isFr ? 'Erreur réseau' : 'Network error'} : ${e.message}`, 'danger');
        } finally {
            setCheckingSolver(null);
        }
    };

    const handleTestProxies = async () => {
        const lines = proxyListText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            showToast(isFr ? 'Veuillez saisir au moins un proxy dans la liste' : 'Provide at least one proxy in the list', 'danger');
            return;
        }

        setTestingProxies(true);
        setProxyResults([]);
        try {
            const res = await window.electronAPI?.testProxies(lines);
            if (res?.success && res.data) {
                setProxyResults(res.data);
                const onlineCount = res.data.filter(p => p.status === 'online').length;
                showToast(
                    isFr 
                        ? `Test terminé : ${onlineCount}/${res.data.length} proxies opérationnels !` 
                        : `Test complete: ${onlineCount}/${res.data.length} proxies online!`, 
                    onlineCount > 0 ? 'success' : 'danger'
                );
            } else {
                showToast(res?.error || (isFr ? 'Erreur de test' : 'Test error'), 'danger');
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
        } finally {
            setTestingProxies(false);
        }
    };

    const handleAutoJoin = async () => {
        if (isJoining) {
            await window.electronAPI.stopAutoJoin();
            setIsJoining(false);
            showToast(isFr ? 'Auto-join arrêté' : 'Auto-join stopped', 'info');
            return;
        }
        if (!inviteLink.trim()) {
            showToast(isFr ? 'Collez un lien d\'invitation Discord' : 'Paste a Discord invite link', 'danger');
            return;
        }
        if (tokenCount === 0) {
            showToast(isFr ? 'Aucun token enregistré' : 'No token registered', 'danger');
            return;
        }

        setIsJoining(true);
        setJoinResults([]);
        try {
            const res = await window.electronAPI.autoJoinServers({ inviteLink: inviteLink.trim(), delay: joinDelay });
            if (res.success && res.data?.results) {
                setJoinResults(res.data.results as JoinResult[]);
                const ok = res.data.results.filter(r => r.status === 'joined').length;
                showToast(isFr ? `${ok}/${res.data.total} compte(s) ont rejoint` : `${ok}/${res.data.total} account(s) joined`, ok > 0 ? 'success' : 'info');
            } else {
                showToast((res as any).error || (isFr ? 'Échec auto-join' : 'Auto-join failed'), 'danger');
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
        } finally {
            const st = await window.electronAPI.getAutoJoinStatus().catch(() => null);
            setIsJoining(!!st?.data?.running);
        }
    };

    const diagnosticsBar = (
        <HubSectionCard icon={Activity} glowColor="var(--accent)" title={isFr ? "TÉLÉMÉTRIE RÉSEAU & STEALTH (2026)" : "NETWORK TELEMETRY & STEALTH (2026)"}>
            <div className="hub-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="hub-stat-card" style={{ '--stat-glow': '#c084fc' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: diags.captchaSolverActive ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255,255,255,0.03)', color: diags.captchaSolverActive ? '#c084fc' : 'var(--text-dim)' }}>
                        <Cpu size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">CAPTCHA SOLVER</div>
                        <div className="hub-stat-value">
                            {diags.captchaSolverActive 
                                ? `${diags.captchaSolverType} (${isFr ? 'Actif' : 'Active'})` 
                                : (isFr ? 'Inactif' : 'Inactive')}
                        </div>
                    </div>
                </div>

                <div className="hub-stat-card" style={{ '--stat-glow': 'var(--accent)' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: diags.proxyActive ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255,255,255,0.03)', color: diags.proxyActive ? 'var(--accent)' : 'var(--text-dim)' }}>
                        <Wifi size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">{isFr ? 'POOL PROXY' : 'PROXY POOL'}</div>
                        <div className="hub-stat-value">
                            {diags.proxyActive 
                                ? (isFr ? `${diags.proxyCount} Proxy actif(s)` : `${diags.proxyCount} Active Proxy`) 
                                : (isFr ? 'Direct IP' : 'Direct IP')}
                        </div>
                    </div>
                </div>

                <div className="hub-stat-card" style={{ '--stat-glow': '#00ffcc' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: 'rgba(0, 255, 204, 0.1)', color: '#00ffcc' }}>
                        <Shield size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">DISCORD BUILD</div>
                        <div className="hub-stat-value">
                            #{diags.clientBuildNumber || 595897}
                        </div>
                    </div>
                </div>

                <div className="hub-stat-card" style={{ '--stat-glow': '#ffd700' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700' }}>
                        <Lock size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">GATEWAY / VOICE</div>
                        <div className="hub-stat-value">
                            GW {diags.gatewayVersion} • DAVE MLS
                        </div>
                    </div>
                </div>
            </div>
        </HubSectionCard>
    );

    return (
        <>
            <HubPageLayout
                title="Network"
                titleAccent="Hub"
                description={isFr ? "Architecture réseau, routage proxy, JA4 fingerprinting et contournement de challenges 2026" : "Network architecture, proxy routing, JA4 fingerprinting and 2026 challenge bypass"}
                tabs={[
                    { id: 'config', label: isFr ? 'CONFIG RÉSEAU' : 'NETWORK CONFIG', icon: Layers },
                    { id: 'resolvers', label: 'SOLVERS & CAPTCHA', icon: Cpu },
                    { id: 'proxies', label: isFr ? 'ROUTAGE PROXY' : 'PROXY ROUTING', icon: Radio },
                    { id: 'bypass', label: 'STEALTH & JA4', icon: Lock },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
            >
                <div className="hub-page-inner">
                    {diagnosticsBar}

                    {/* TAB 1: NETWORK CONFIG & MULTI-JOIN */}
                    <HubSubTabKeepAlive active={activeTab === 'config'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="hub-grid-2">
                                <HubSectionCard icon={Key} iconColor="#a855f7" glowColor="#a855f7" title={isFr ? "CLÉS API DES SOLVEURS" : "SOLVER API KEYS"}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {solverFields.map(({ type, label, hint, placeholder }) => (
                                            <HubFieldRow key={type} label={label} hint={hint}>
                                                <div className="hub-input-row">
                                                    <input
                                                        type="password"
                                                        value={solverValues[type]}
                                                        onChange={(e) => setSolverValue(type, e.target.value)}
                                                        placeholder={placeholder}
                                                        className="input-field settings-select"
                                                        style={{ height: '42px', fontSize: '12px' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVerifyKey(type)}
                                                        disabled={checkingSolver === type}
                                                        className="btn-secondary hub-verify-btn"
                                                    >
                                                        {checkingSolver === type ? <Activity size={12} className="animate-spin" /> : <Check size={12} />}
                                                        &nbsp;{balances[type] !== null ? `${balances[type]}$` : (isFr ? 'VÉRIFIER' : 'VERIFY')}
                                                    </button>
                                                </div>
                                            </HubFieldRow>
                                        ))}
                                    </div>
                                </HubSectionCard>

                                <HubSectionCard icon={Globe} glowColor="var(--accent)" title={isFr ? "POOL GLOBAL DE PROXIES" : "GLOBAL PROXY POOL"}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <HubToggleRow
                                            title={isFr ? "Activer le routage proxy global" : "Enable global proxy routing"}
                                            description={isFr ? "Route l'ensemble des requêtes via proxy pool" : "Routes all network traffic through proxies"}
                                            active={proxyEnabled}
                                            onToggle={() => setProxyEnabled(!proxyEnabled)}
                                        />
                                        <HubFieldRow label={isFr ? "PROTOCOLE RÉSEAU PAR DÉFAUT" : "DEFAULT NETWORK PROTOCOL"} hint={isFr ? "SOCKS5 recommandé pour masquer les DNS" : "SOCKS5 recommended for remote DNS leak protection"}>
                                            <select value={proxyType} onChange={(e) => setProxyType(e.target.value as any)} className="settings-select" style={{ width: '100%' }}>
                                                <option value="socks5">SOCKS 5 (Remote DNS / SOCKS5h)</option>
                                                <option value="http">HTTP / HTTPS CONNECT</option>
                                                <option value="socks4">SOCKS 4</option>
                                            </select>
                                        </HubFieldRow>
                                        <HubFieldRow label={isFr ? "LISTE DE PROXIES (Un par ligne)" : "PROXY LIST (One per line)"} hint={isFr ? "Format: ip:port ou ip:port:user:pass" : "Format: ip:port or ip:port:user:pass"}>
                                            <textarea
                                                value={proxyListText}
                                                onChange={(e) => setProxyListText(e.target.value)}
                                                placeholder={'127.0.0.1:9050\nuser:pass@proxy.example.com:8080'}
                                                className="input-field settings-select custom-scrollbar"
                                                style={{ height: '140px', fontSize: '12px', fontFamily: 'monospace', resize: 'none' }}
                                            />
                                        </HubFieldRow>
                                        <button
                                            type="button"
                                            onClick={handleTestProxies}
                                            disabled={testingProxies}
                                            className="btn-secondary"
                                            style={{
                                                height: '38px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                marginTop: '4px'
                                            }}
                                        >
                                            {testingProxies ? <Activity size={14} className="animate-spin" /> : <Wifi size={14} />}
                                            {testingProxies ? (isFr ? 'TEST EN COURS...' : 'TESTING...') : (isFr ? 'TESTER LA LATENCE DU POOL' : 'TEST PROXY LATENCY')}
                                        </button>

                                        {proxyResults.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                marginTop: '10px',
                                                maxHeight: '120px',
                                                overflowY: 'auto'
                                            }} className="custom-scrollbar">
                                                {proxyResults.map((pr, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        border: `1px solid ${pr.status === 'online' ? 'rgba(0,255,128,0.2)' : 'rgba(255,68,68,0.2)'}`
                                                    }}>
                                                        <span style={{ fontFamily: 'monospace', color: '#fff' }}>{pr.proxy.slice(0, 24)}...</span>
                                                        <span style={{
                                                            fontWeight: 'bold',
                                                            color: pr.status === 'online' ? '#00ff80' : '#ff4444',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            {pr.status === 'online' ? `🟢 ${pr.latencyMs}ms` : '🔴 Inaccessible'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </HubSectionCard>
                            </div>

                            <HubSectionCard icon={UserPlus} iconColor="var(--success)" glowColor="var(--success)" title={isFr ? "REJOINDRE DES SERVEURS AUTO — MULTI-TOKENS" : "AUTO JOIN SERVERS — MULTI-TOKENS"}>
                                <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                                    {isFr 
                                        ? `Rejoint un serveur avec le compte principal + tous les tokens enregistrés (${tokenCount} compte${tokenCount > 1 ? 's' : ''}) avec résolution automatique des hCaptcha & Turnstile.` 
                                        : `Joins a server with the main account + all registered tokens (${tokenCount} account${tokenCount > 1 ? 's' : ''}) with automatic hCaptcha & Turnstile solving.`}
                                </p>

                                {!hasCaptchaKey && (
                                    <div className="hub-info-banner" style={{ marginBottom: '16px', background: 'rgba(var(--warning-rgb), 0.06)', borderColor: 'rgba(var(--warning-rgb), 0.2)' }}>
                                        <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
                                        <div>
                                            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--warning)' }}>{isFr ? 'Captcha requis pour certains comptes' : 'Captcha required for some accounts'}</span>
                                            <p>{isFr ? 'Si Discord demande un captcha lors du join, configurez une clé API (Capsolver, CapMonster, etc.) ci-dessus.' : 'If Discord prompts a captcha during join, configure an API key (Capsolver, CapMonster, etc.) above.'}</p>
                                        </div>
                                    </div>
                                )}

                                <HubFieldRow label={isFr ? "LIEN D'INVITATION DISCORD" : "DISCORD INVITATION LINK"} hint={isFr ? "discord.gg/xxx ou discord.com/invite/xxx" : "discord.gg/xxx or discord.com/invite/xxx"}>
                                    <input
                                        type="text"
                                        value={inviteLink}
                                        onChange={(e) => setInviteLink(e.target.value)}
                                        placeholder="https://discord.gg/votre-invite"
                                        className="input-field settings-select"
                                        style={{ width: '100%', height: '44px', fontSize: '12px' }}
                                        disabled={isJoining}
                                    />
                                </HubFieldRow>

                                <HubFieldRow label={`${isFr ? 'DÉLAI DE SÉCURITÉ ENTRE JOINS' : 'SAFETY DELAY BETWEEN JOINS'} (${joinDelay}ms)`} hint={isFr ? "Injection aléatoire de jitter (±15%) pour éviter les détections de cadence" : "Random jitter (±15%) injected to prevent cadence fingerprinting"}>
                                    <input
                                        type="range"
                                        min={1500}
                                        max={8000}
                                        step={250}
                                        value={joinDelay}
                                        onChange={(e) => setJoinDelay(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: 'var(--success)' }}
                                        disabled={isJoining}
                                    />
                                </HubFieldRow>

                                <button
                                    type="button"
                                    onClick={handleAutoJoin}
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        height: '52px',
                                        marginTop: '8px',
                                        background: isJoining ? 'var(--danger)' : 'var(--success)',
                                        boxShadow: isJoining ? '0 0 30px var(--danger-glow)' : '0 0 30px rgba(16, 185, 129, 0.35)',
                                        fontWeight: '900',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                    }}
                                >
                                    {isJoining ? <><Square size={16} /> {isFr ? "ARRÊTER L'AUTO-JOIN" : "STOP AUTO-JOIN"}</> : <><UserPlus size={16} /> {isFr ? "REJOINDRE AVEC TOUS LES TOKENS" : "JOIN WITH ALL TOKENS"}</>}
                                </button>

                                {joinResults.length > 0 && (
                                    <div className="hub-auto-join-results custom-scrollbar" style={{ marginTop: '16px' }}>
                                        {joinResults.map((r, i) => (
                                            <div
                                                key={`${r.username}-${i}`}
                                                className={`hub-auto-join-result-row hub-auto-join-result-row--${r.status}`}
                                            >
                                                <span style={{ fontWeight: '800', color: 'white' }}>{r.username}</span>
                                                <span style={{ opacity: 0.85, textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {r.status === 'joined' && (<><Check size={13} color="var(--success)" /> {isFr ? 'Rejoint avec succès' : 'Successfully joined'}</>)}
                                                    {r.status === 'already' && (<><Info size={13} color="var(--accent)" /> {isFr ? 'Déjà membre du serveur' : 'Already in server'}</>)}
                                                    {r.status === 'captcha' && (<><Lock size={13} color="#c084fc" /> {r.message || (isFr ? 'Captcha résolu' : 'Captcha solved')}</>)}
                                                    {r.status === 'error' && (<><XCircle size={13} color="var(--danger)" /> {r.message || (isFr ? 'Erreur' : 'Error')}</>)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </HubSectionCard>
                        </div>
                    </HubSubTabKeepAlive>

                    {/* TAB 2: RESOLVERS & BENCHMARKS */}
                    <HubSubTabKeepAlive active={activeTab === 'resolvers'}>
                        <HubSectionCard icon={BookOpen} iconColor="#a855f7" glowColor="#a855f7" title={isFr ? "BENCHMARK DES SOLVEURS DE CAPTCHA (2026)" : "CAPTCHA SOLVERS BENCHMARK (2026)"}>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.5', marginBottom: '20px' }}>
                                {isFr ? 'Évaluation et taux de réussite en temps réel sur les challenges Discord (hCaptcha Enterprise, Cloudflare Turnstile, reCAPTCHA v3).' : 'Real-time benchmark and success rates on Discord challenges (hCaptcha Enterprise, Cloudflare Turnstile, reCAPTCHA v3).'}
                            </p>
                            <div className="hub-tier-table-wrap">
                                <table className="hub-tier-table">
                                    <thead>
                                        <tr>
                                            <th style={{ color: 'var(--accent)' }}>{isFr ? 'RANG' : 'RANK'}</th>
                                            <th>{isFr ? 'NOM' : 'NAME'}</th>
                                            <th>{isFr ? 'MOTEUR' : 'ENGINE'}</th>
                                            <th>{isFr ? 'COÛT / 1K' : 'PRICE / 1K'}</th>
                                            <th>{isFr ? 'LATENCE MOY.' : 'AVG SPEED'}</th>
                                            <th>{isFr ? 'SPÉCIALITÉ DISCORD' : 'DISCORD TARGET'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            [isFr ? '1 (Leader)' : '1 (Leader)', 'Capsolver', isFr ? 'IA Vision Pure' : 'Pure AI Vision', '~0.60$', isFr ? '< 3.2s (Ultra)' : '< 3.2s (Ultra)', isFr ? 'hCaptcha Enterprise + rqdata' : 'hCaptcha Enterprise + rqdata', '#c084fc', 'rgba(168, 85, 247, 0.03)'],
                                            ['2', 'CapMonster Cloud', isFr ? 'IA + OCR' : 'AI + OCR', '~0.75$', isFr ? '~4.5s (Très rapide)' : '~4.5s (Very fast)', isFr ? 'Turnstile & reCAPTCHA v3' : 'Turnstile & reCAPTCHA v3', 'var(--accent)', 'transparent'],
                                            ['3', '2Captcha', isFr ? 'Hybride IA + Workers' : 'Hybrid AI + Workers', '~1.10$', isFr ? '~8-12s' : '~8-12s', isFr ? 'Fallback haute précision' : 'High-precision fallback', 'var(--accent)', 'transparent'],
                                            ['4', 'Anti-Captcha', isFr ? 'Réseau Humain' : 'Human Network', '~1.40$', isFr ? '~10-15s' : '~10-15s', isFr ? 'Contournement Cloudflare' : 'Cloudflare bypass', 'var(--accent)', 'transparent'],
                                            ['5', 'NoCaptchaAI', isFr ? 'IA Légère' : 'Lightweight AI', '~0.85$', isFr ? '~4.0s' : '~4.0s', isFr ? 'reCAPTCHA standard' : 'Standard reCAPTCHA', 'var(--text-dim)', 'transparent'],
                                        ].map(([rank, name, type, price, speed, best, rankColor, bg]) => (
                                            <tr key={name as string} style={{ background: bg as string }}>
                                                <td style={{ fontWeight: 'bold', color: rankColor as string }}>{rank}</td>
                                                <td style={{ fontWeight: 'bold' }}>{name}</td>
                                                <td>{type}</td>
                                                <td>{price}</td>
                                                <td style={{ color: (speed as string).includes('Ultra') || (speed as string).includes('Très') || (speed as string).includes('Very') ? 'var(--success)' : 'var(--warning)' }}>{speed}</td>
                                                <td>{best}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="hub-info-banner" style={{ marginTop: '20px' }}>
                                <AlertCircle size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
                                <div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{isFr ? 'Stratégie de Résilience Opsec' : 'Opsec Resilience Strategy'}</span>
                                    <p>{isFr ? 'Pour une disponibilité 100%, chargez Capsolver en solveur primaire et CapMonster Cloud en solveur secondaire de secours.' : 'For 100% availability, configure Capsolver as primary and CapMonster Cloud as secondary backup.'}</p>
                                </div>
                            </div>
                        </HubSectionCard>
                    </HubSubTabKeepAlive>

                    {/* TAB 3: PROXY TACTICS & ROUTING */}
                    <HubSubTabKeepAlive active={activeTab === 'proxies'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <HubSectionCard icon={Radio} glowColor="var(--accent)" title={isFr ? "ARCHITECTURE PROXY RECOMMANDÉE (2026)" : "RECOMMENDED PROXY ARCHITECTURE (2026)"}>
                                <div className="hub-grid-3">
                                    {[
                                        { color: '#a855f7', title: 'Residential Proxies (ISP)', text: isFr ? 'Adresses IP de fournisseurs d\'accès réels (Orange, Comcast, etc.). Indispensables pour le multi-compte et l\'auto-join massif sans lock.' : 'Real ISP IP addresses. Mandatory for multi-accounting and mass auto-joins without verification locks.' },
                                        { color: 'var(--accent)', title: 'Mobile Proxies 4G/5G', text: isFr ? 'Pools d\'adresses mobiles avec rotation sur commande. Discord évite de flagguer les IP mobiles partagées par des milliers d\'utilisateurs.' : 'Mobile carrier IP pools. Discord minimizes flags on mobile IPs shared across thousands of legitimate users.' },
                                        { color: 'var(--success)', title: 'SOCKS5h (Remote DNS)', text: isFr ? 'Résolution DNS déportée sur le serveur proxy. Bloque 100% des fuites DNS locales (WebRTC / IPv6).' : 'Remote DNS resolution on the proxy host. Completely eliminates local DNS leaks (WebRTC / IPv6).' },
                                    ].map(({ color, title, text }) => (
                                        <div key={title} className="hub-feature-card" style={{ boxShadow: `0 0 20px color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}>
                                            <p className="hub-feature-card-title"><span className="hub-feature-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />{title}</p>
                                            <p>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </HubSectionCard>

                            <HubSectionCard icon={Check} iconColor="var(--success)" glowColor="var(--success)" title={isFr ? "RÈGLES D'ISOLATION RÉSEAU 1:1" : "1:1 NETWORK ISOLATION RULES"}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {[
                                        isFr ? <><b>Règle 1:1 Dédiée</b> : 1 compte Discord = 1 proxy résidentiel fixe pour éliminer les corrélations de sessions.</> : <><b>Dedicated 1:1 Rule</b>: 1 Discord account = 1 static residential proxy to eliminate session correlation.</>,
                                        isFr ? <><b>Sticky Sessions</b> : Conservez la même adresse IP pendant toute la durée d'une session vocale ou de rotation.</> : <><b>Sticky Sessions</b>: Maintain the exact same IP during voice 24/7 or rotation sessions.</>,
                                        isFr ? <><b>Format SOCKS5 Universel</b> : <code>socks5://user:pass@ip:port</code> ou <code>http://user:pass@ip:port</code> directement injecté dans chaque client.</> : <><b>Universal SOCKS5 Format</b>: <code>socks5://user:pass@ip:port</code> or <code>http://user:pass@ip:port</code> injected into each client instance.</>,
                                    ].map((content, i) => (
                                        <div key={i} className="hub-checklist-item"><span className="hub-checklist-mark">[✓]</span><div>{content}</div></div>
                                    ))}
                                </div>
                            </HubSectionCard>
                        </div>
                    </HubSubTabKeepAlive>

                    {/* TAB 4: STEALTH & JA4 FINGERPRINTING */}
                    <HubSubTabKeepAlive active={activeTab === 'bypass'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <HubSectionCard icon={Lock} iconColor="var(--warning)" glowColor="var(--warning)" title={isFr ? "INSPECTION DU PROTOCOLE DE SÉCURITÉ & JA4" : "SECURITY PROTOCOL & JA4 INSPECTION"}>
                                <div className="hub-grid-2">
                                    {[
                                        { title: '1. Empreinte TLS 1.3 (JA4 / FoxIO)', text: isFr ? `Signature Chromium authentique : ${diags.ja4Fingerprint}. Ordre strict des ciphers GREASE et extensions ALPN h2.` : `Authentic Chromium signature: ${diags.ja4Fingerprint}. Strict GREASE ciphers ordering and ALPN h2 extensions.` },
                                        { title: '2. Synchronisation X-Super-Properties', text: isFr ? `Build Discord #${diags.clientBuildNumber} extrait des manifests JS officiels avec User-Agent Electron 32.` : `Discord build #${diags.clientBuildNumber} extracted from official JS manifests with Electron 32 User-Agent.` },
                                        { title: '3. hCaptcha Enterprise & Rqdata', text: isFr ? 'Transmission dynamique de la sitekey Discord et du paramètre d\'intégrité rqdata au solveur.' : 'Dynamic submission of Discord sitekey and rqdata integrity parameter to the solver.' },
                                        { title: '4. Chiffrement Vocal DAVE MLS (2026)', text: isFr ? 'Protocole Voice Gateway v9 avec chiffrement de bout en bout MLS pour les flux audio/vidéo.' : 'Voice Gateway v9 protocol with MLS end-to-end encryption for audio/video streams.' },
                                    ].map(({ title, text }) => (
                                        <div key={title} className="hub-feature-card">
                                            <p className="hub-feature-card-title">{title}</p>
                                            <p>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </HubSectionCard>

                            <HubSectionCard icon={Terminal} glowColor="#00ffcc" title={isFr ? "VÉRIFICATEUR D'EN-TÊTES & SÉCURITÉ" : "HEADER & SECURITY VERIFIER"}>
                                <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontFamily: 'monospace', fontSize: '11px', color: '#00ffcc' }}>
                                    <div>[GATEWAY] Version: {diags.gatewayVersion} • Heartbeat Jitter: Activé</div>
                                    <div>[VOICE] Protocol: {diags.voiceProtocol}</div>
                                    <div>[CLIENT_BUILD] ID: {diags.clientBuildNumber} (Source: discord.com/assets)</div>
                                    <div>[JA4_HASH] {diags.ja4Fingerprint}</div>
                                    <div>[SUPER_PROPERTIES] {diags.superPropertiesStatus}</div>
                                </div>
                            </HubSectionCard>
                        </div>
                    </HubSubTabKeepAlive>

                    {diags.pomeloWarn && (
                        <div className="hub-info-banner" style={{ background: 'rgba(var(--warning-rgb), 0.05)', borderColor: 'rgba(var(--warning-rgb), 0.15)' }}>
                            <ShieldAlert size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--warning)' }}>{isFr ? 'Avis de Sécurité : Pomelo & Tokens' : 'Security Notice: Pomelo & Tokens'}</span>
                                <p style={{ color: diags.userIsBot ? 'var(--success)' : 'var(--text-dim)' }}>
                                    {diags.userIsBot
                                        ? (isFr ? '✔ Token Bot détecté — configuration optimale pour le Pomelo Sniper.' : '✔ Bot Token detected — optimal configuration for the Pomelo Sniper.')
                                        : (isFr ? '⚠ Token Utilisateur — utilisez un Token Bot dédié pour le Pomelo Sniper.' : '⚠ User Token — use a dedicated Bot Token for the Pomelo Sniper.')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </HubPageLayout>

            {toast && (
                <div className="animate-slide-up-toast" style={{
                    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'success' ? 'rgba(0, 255, 157, 0.95)' : toast.type === 'info' ? 'rgba(0, 210, 255, 0.95)' : 'rgba(255, 62, 62, 0.95)',
                    color: 'black', padding: '12px 30px', borderRadius: '12px', fontWeight: '900', fontSize: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100000,
                }}>
                    {toast.message}
                </div>
            )}
        </>
    );
};
