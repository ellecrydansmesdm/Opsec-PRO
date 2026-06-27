import React, { useState, useEffect, useMemo } from 'react';
import {
    Globe, Key, Cpu, Shield, Check, Wifi,
    Activity, AlertTriangle, AlertCircle, RefreshCw,
    Layers, BookOpen, Radio, Lock, ShieldAlert, UserPlus, Square
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
        { type: 'capsolver', label: 'Capsolver API Key', hint: isFr ? 'Recommandé en 2025/2026 — IA ultra rapide' : 'Recommended in 2025/2026 — Ultra-fast AI', placeholder: 'capsolver.com Key...' },
        { type: 'capmonster', label: 'CapMonster.cloud API Key', placeholder: isFr ? 'Clé CapMonster (excellent rapport Q/P)...' : 'CapMonster Key (excellent value/price)...' },
        { type: '2captcha', label: '2Captcha API Key', placeholder: isFr ? 'Clé 2Captcha (humains, très fiable)...' : '2Captcha Key (humans, highly reliable)...' },
        { type: 'anticaptcha', label: 'Anti-Captcha Key', placeholder: isFr ? 'Clé Anti-Captcha...' : 'Anti-Captcha Key...' },
        { type: 'nocaptchaai', label: 'NoCaptchaAI Key', placeholder: isFr ? 'Clé NoCaptchaAI...' : 'NoCaptchaAI Key...' },
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
    const [proxyType, setProxyType] = useState(settings.automationConfig?.proxyType || 'http');
    const [proxyListText, setProxyListText] = useState(settings.automationConfig?.proxyList?.join('\n') || '');

    const [inviteLink, setInviteLink] = useState('');
    const [joinDelay, setJoinDelay] = useState(3000);
    const [isJoining, setIsJoining] = useState(false);
    const [joinResults, setJoinResults] = useState<JoinResult[]>([]);

    const [diags, setDiags] = useState<any>({
        captchaSolverActive: false, captchaSolverType: 'Aucun',
        proxyActive: false, proxyCount: 0, pomeloWarn: true, userIsBot: false,
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
            if (res.success && res.data) setDiags(res.data);
        });
    };

    useEffect(() => { refreshDiagnostics(); }, [settings]);

    useEffect(() => {
        const syncJoin = async () => {
            try {
                const res = await window.electronAPI.getAutoJoinStatus();
                if (res.success && res.data) setIsJoining(!!res.data.running);
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
        <HubSectionCard icon={Activity} glowColor="var(--accent)" title={isFr ? "DIAGNOSTICS RÉSEAU" : "NETWORK DIAGNOSTICS"}>
            <div className="hub-stat-grid">
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
                        <div className="hub-stat-label caption">{isFr ? 'RÉSEAU PROXY' : 'PROXY NETWORK'}</div>
                        <div className="hub-stat-value">
                            {diags.proxyActive 
                                ? (isFr ? `${diags.proxyCount} Proxy chargé(s)` : `${diags.proxyCount} Proxy loaded`) 
                                : (isFr ? 'Rotation inactive' : 'Rotation inactive')}
                        </div>
                    </div>
                </div>
                <div className="hub-stat-card" style={{ '--stat-glow': diags.userIsBot ? 'var(--success)' : 'var(--warning)' } as React.CSSProperties}>
                    <div className="hub-stat-icon" style={{ background: diags.userIsBot ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)', color: diags.userIsBot ? 'var(--success)' : 'var(--warning)' }}>
                        <Shield size={18} />
                    </div>
                    <div>
                        <div className="hub-stat-label caption">{isFr ? 'STATUT COMPTE' : 'ACCOUNT STATUS'}</div>
                        <div className="hub-stat-value">
                            {diags.userIsBot 
                                ? (isFr ? 'Sécurisé (Bot Token)' : 'Secure (Bot Token)') 
                                : (isFr ? 'Limité (User Token)' : 'Limited (User Token)')}
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
                description={isFr ? "Stratégie fingerprinting, proxies et bypass captcha 2025/2026" : "Fingerprinting strategy, proxies, and captcha bypass 2025/2026"}
                tabs={[
                    { id: 'config', label: isFr ? 'CONFIG RÉSEAU' : 'NETWORK CONFIG', icon: Layers },
                    { id: 'resolvers', label: 'RESOLVERS', icon: Cpu },
                    { id: 'proxies', label: isFr ? 'TACTIQUES PROXY' : 'PROXY TACTICS', icon: Radio },
                    { id: 'bypass', label: 'STEALTH & BYPASS', icon: Lock },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
            >
                <div className="hub-page-inner">
                    {diagnosticsBar}

                    <HubSubTabKeepAlive active={activeTab === 'config'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="hub-grid-2">
                                <HubSectionCard icon={Key} iconColor="#a855f7" glowColor="#a855f7" title={isFr ? "CONFIG CAPTCHA SOLVERS" : "CAPTCHA SOLVERS CONFIG"}>
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

                                <HubSectionCard icon={Globe} glowColor="var(--accent)" title={isFr ? "RÉSEAU DE ROTATION PROXY" : "PROXY ROTATION NETWORK"}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <HubToggleRow
                                            title={isFr ? "Activer le modulateur proxy" : "Enable proxy modulator"}
                                            description={isFr ? "Route l'ensemble des requêtes via proxy" : "Routes all requests through proxies"}
                                            active={proxyEnabled}
                                            onToggle={() => setProxyEnabled(!proxyEnabled)}
                                        />
                                        <HubFieldRow label={isFr ? "PROTOCOLE RÉSEAU" : "NETWORK PROTOCOL"}>
                                            <select value={proxyType} onChange={(e) => setProxyType(e.target.value as any)} className="settings-select" style={{ width: '100%' }}>
                                                <option value="http">HTTP / HTTPS</option>
                                                <option value="socks4">SOCKS 4</option>
                                                <option value="socks5">SOCKS 5</option>
                                            </select>
                                        </HubFieldRow>
                                        <HubFieldRow label={isFr ? "LISTE DE PROXIES (Un par ligne)" : "PROXY LIST (One per line)"} hint={isFr ? "IP:PORT ou IP:PORT:USER:PASS" : "IP:PORT or IP:PORT:USER:PASS"}>
                                            <textarea
                                                value={proxyListText}
                                                onChange={(e) => setProxyListText(e.target.value)}
                                                placeholder={'IP:PORT\nIP:PORT:USER:PASS'}
                                                className="input-field settings-select custom-scrollbar"
                                                style={{ height: '180px', fontSize: '12px', fontFamily: 'monospace', resize: 'none' }}
                                            />
                                        </HubFieldRow>
                                    </div>
                                </HubSectionCard>
                            </div>

                            <HubSectionCard icon={UserPlus} iconColor="var(--success)" glowColor="var(--success)" title={isFr ? "REJOINDRE DES SERVEURS AUTO — MULTI-TOKENS" : "AUTO JOIN SERVERS — MULTI-TOKENS"}>
                                <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                                    {isFr 
                                        ? `Rejoint un serveur avec le compte principal + tous les tokens enregistrés (${tokenCount} compte${tokenCount > 1 ? 's' : ''}).` 
                                        : `Joins a server with the main account + all registered tokens (${tokenCount} account${tokenCount > 1 ? 's' : ''}).`}
                                </p>

                                {!hasCaptchaKey && (
                                    <div className="hub-info-banner" style={{ marginBottom: '16px', background: 'rgba(var(--warning-rgb), 0.06)', borderColor: 'rgba(var(--warning-rgb), 0.2)' }}>
                                        <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
                                        <div>
                                            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--warning)' }}>{isFr ? 'Captcha requis pour certains comptes' : 'Captcha required for some accounts'}</span>
                                            <p>{isFr ? 'Si Discord demande un captcha lors du join, une clé API Captcha (Capsolver, CapMonster, etc.) doit être configurée ci-dessus.' : 'If Discord prompts a captcha during join, a Captcha API Key (Capsolver, CapMonster, etc.) must be configured above.'}</p>
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

                                <HubFieldRow label={`${isFr ? 'DÉLAI ENTRE JOINS' : 'DELAY BETWEEN JOINS'} (${joinDelay}ms)`}>
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
                                    <div className="hub-auto-join-results custom-scrollbar">
                                        {joinResults.map((r, i) => (
                                            <div
                                                key={`${r.username}-${i}`}
                                                className={`hub-auto-join-result-row hub-auto-join-result-row--${r.status}`}
                                            >
                                                <span style={{ fontWeight: '800', color: 'white' }}>{r.username}</span>
                                                <span style={{ opacity: 0.75, textAlign: 'right' }}>
                                                    {r.status === 'joined' && (isFr ? '✅ Rejoint' : '✅ Joined')}
                                                    {r.status === 'already' && (isFr ? 'ℹ️ Déjà membre' : 'ℹ️ Already member')}
                                                    {r.status === 'captcha' && `🔒 ${r.message || (isFr ? 'Captcha requis' : 'Captcha required')}`}
                                                    {r.status === 'error' && `❌ ${r.message || (isFr ? 'Erreur' : 'Error')}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </HubSectionCard>
                        </div>
                    </HubSubTabKeepAlive>

                    <HubSubTabKeepAlive active={activeTab === 'resolvers'}>
                        <HubSectionCard icon={BookOpen} iconColor="#a855f7" glowColor="#a855f7" title={isFr ? "FICHES COMPARATIVES CAPTCHAS (2025/2026)" : "CAPTCHA COMPARATIVE SHEETS (2025/2026)"}>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.5', marginBottom: '20px' }}>
                                {isFr ? 'Classement des solveurs hCaptcha, Turnstile et reCAPTCHA par pertinence pour Discord.' : 'Ranking of hCaptcha, Turnstile, and reCAPTCHA solvers by relevance for Discord.'}
                            </p>
                            <div className="hub-tier-table-wrap">
                                <table className="hub-tier-table">
                                    <thead>
                                        <tr>
                                            <th style={{ color: 'var(--accent)' }}>{isFr ? 'RANG' : 'RANK'}</th>
                                            <th>{isFr ? 'NOM' : 'NAME'}</th>
                                            <th>{isFr ? 'TYPE' : 'TYPE'}</th>
                                            <th>{isFr ? 'PRIX / 1000' : 'PRICE / 1000'}</th>
                                            <th>{isFr ? 'VITESSE' : 'SPEED'}</th>
                                            <th>{isFr ? 'MEILLEUR POUR DISCORD' : 'BEST FOR DISCORD'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            [isFr ? '1 (Principal)' : '1 (Primary)', 'Capsolver', isFr ? 'IA pure' : 'Pure AI', '~0.60$', isFr ? 'Ultra rapide' : 'Ultra fast', isFr ? 'Excellent hCaptcha & Turnstile' : 'Excellent hCaptcha & Turnstile', '#c084fc', 'rgba(168, 85, 247, 0.03)'],
                                            ['2', 'CapMonster Cloud', isFr ? 'OCR + IA' : 'OCR + AI', '~0.80$', isFr ? 'Très rapide' : 'Very fast', isFr ? 'Meilleur rapport Q/P' : 'Best value for money', 'var(--accent)', 'transparent'],
                                            ['3', '2Captcha', isFr ? 'Humains + IA' : 'Humans + AI', '~1.20$', isFr ? 'Moyen-rapide' : 'Medium-fast', isFr ? 'Très fiable sur hCaptcha' : 'Very reliable on hCaptcha', 'var(--accent)', 'transparent'],
                                            ['4', 'Anti-Captcha', isFr ? 'Humains' : 'Humans', '~1.50$', isFr ? 'Moyen' : 'Medium', isFr ? 'Bon sur Cloudflare Turnstile' : 'Good on Cloudflare Turnstile', 'var(--accent)', 'transparent'],
                                            ['5', 'NoCaptchaAI', isFr ? 'IA' : 'AI', '~0.90$', isFr ? 'Très rapide' : 'Very fast', isFr ? 'Spécialisé reCAPTCHA & hCaptcha' : 'Specialized reCAPTCHA & hCaptcha', 'var(--text-dim)', 'transparent'],
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
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{isFr ? 'Conseil Opsec' : 'Opsec Advice'}</span>
                                    <p>{isFr ? 'Pour les actions massives, chargez Capsolver en principal et CapMonster en secours.' : 'For massive actions, load Capsolver as primary and CapMonster as backup.'}</p>
                                </div>
                            </div>
                        </HubSectionCard>
                    </HubSubTabKeepAlive>

                    <HubSubTabKeepAlive active={activeTab === 'proxies'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <HubSectionCard icon={Radio} glowColor="var(--accent)" title={isFr ? "TYPES DE PROXIES CONSEILLÉS" : "RECOMMENDED PROXY TYPES"}>
                                <div className="hub-grid-3">
                                    {[
                                        { color: '#a855f7', title: 'Residential Proxies', text: isFr ? 'Les plus critiques pour éviter les détections IP. Fournis par des FAI réels. Indispensables pour le multi-compte.' : 'The most critical to avoid IP detections. Provided by real ISPs. Indispensable for multi-accounting.' },
                                        { color: 'var(--accent)', title: 'Mobile Proxies 4G/5G', text: isFr ? 'Discord n\'ose pas bloquer les IP mobiles. Idéal pour bypasser les locks téléphone.' : 'Discord doesn\'t dare block mobile IPs. Ideal to bypass phone locks.' },
                                        { color: 'var(--success)', title: 'ISP Proxies', text: isFr ? 'Compromis excellent. Adresses datacenter enregistrées sous noms de FAI.' : 'Excellent compromise. Datacenter addresses registered under ISP names.' },
                                    ].map(({ color, title, text }) => (
                                        <div key={title} className="hub-feature-card" style={{ boxShadow: `0 0 20px color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}>
                                            <p className="hub-feature-card-title"><span className="hub-feature-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />{title}</p>
                                            <p>{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </HubSectionCard>
                            <HubSectionCard icon={Check} iconColor="var(--success)" glowColor="var(--success)" title={isFr ? "STRATÉGIE DE ROTATION RECOMMANDÉE" : "RECOMMENDED ROTATION STRATEGY"}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {[
                                        isFr ? <>Règle d'or (1:1) : associez idéalement <b>1 proxy unique à 1 compte Discord</b>.</> : <>Golden rule (1:1): ideally associate <b>1 unique proxy per Discord account</b>.</>,
                                        isFr ? <>Sticky Sessions : privilégiez des sessions persistantes de 10 à 30 minutes.</> : <>Sticky Sessions: favor persistent sessions of 10 to 30 minutes.</>,
                                        isFr ? <>Planification : faites tourner vos IP toutes les 30 à 60 minutes ou en cas de rate-limit.</> : <>Scheduling: rotate your IPs every 30 to 60 minutes or in case of rate-limits.</>,
                                    ].map((content, i) => (
                                        <div key={i} className="hub-checklist-item"><span className="hub-checklist-mark">[✓]</span><div>{content}</div></div>
                                    ))}
                                </div>
                            </HubSectionCard>
                        </div>
                    </HubSubTabKeepAlive>

                    <HubSubTabKeepAlive active={activeTab === 'bypass'}>
                        <HubSectionCard icon={Lock} iconColor="var(--warning)" glowColor="var(--warning)" title={isFr ? "MÉCANISMES DE BYPASS & SÉCURITÉ DISCORD" : "BYPASS MECHANISMS & DISCORD SECURITY"}>
                            <div className="hub-grid-2">
                                {[
                                    { title: '1. Cloudflare Turnstile Bypass', text: isFr ? 'Injection du token Capsolver dans la payload websocket/HTTP. Le cookie cf_clearance avec un User-Agent identique est requis.' : 'Injection of the Capsolver token in the websocket/HTTP payload. The cf_clearance cookie with an identical User-Agent is required.' },
                                    { title: '2. hCaptcha & Rqdata Integration', text: isFr ? 'Transmission correcte de la sitekey Discord et du paramètre dynamique rqdata au solveur.' : 'Correct transmission of the Discord sitekey and dynamic rqdata parameter to the solver.' },
                                    { title: '3. Fingerprint Spoofing', text: isFr ? 'Spoofing WebGL, Canvas, AudioContext et en-têtes TLS JA3/JA4 cohérents.' : 'Spoofing WebGL, Canvas, AudioContext, and consistent JA3/JA4 TLS headers.' },
                                    { title: '4. Rate Limits & Locks', text: isFr ? 'Délais aléatoires (jitter) imitant le comportement humain.' : 'Random delays (jitter) mimicking human behavior.' },
                                ].map(({ title, text }) => (
                                    <div key={title} className="hub-feature-card">
                                        <p className="hub-feature-card-title">{title}</p>
                                        <p>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </HubSectionCard>
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
