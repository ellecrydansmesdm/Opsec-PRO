import React, { useState, useEffect } from 'react';
import {
    Crosshair, Link, Server, Shield, Zap, AlertTriangle,
    Play, Square, RefreshCw, Send, CheckCircle2, XCircle,
    Copy, ExternalLink, Activity, Radio, HelpCircle, Bot
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { HubSectionCard, HubToggleRow } from '@/components/layout/HubPageLayout';
import { audioService } from '@/services/AudioService';

interface VanitySniperProps {
    showToast: (message: string, type?: 'success' | 'danger') => void;
}

export const VanitySniper: React.FC<VanitySniperProps> = ({ showToast }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    // State
    const [targetGuildId, setTargetGuildId] = useState('');
    const [guildVerification, setGuildVerification] = useState<{ checked: boolean; eligible?: boolean; name?: string; reason?: string } | null>(null);
    const [isCheckingGuild, setIsCheckingGuild] = useState(false);

    const [vanityInput, setVanityInput] = useState('');
    const [vanityCodes, setVanityCodes] = useState<string[]>(['opsec']);
    const [delayMs, setDelayMs] = useState(300);
    const [botTokensText, setBotTokensText] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [gatewayListen, setGatewayListen] = useState(true);

    const [isRunning, setIsRunning] = useState(false);
    const [checks, setChecks] = useState(0);
    const [rateLimits, setRateLimits] = useState(0);
    const [activeCode, setActiveCode] = useState<string | null>(null);
    const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
    const [showGuide, setShowGuide] = useState(true);

    // Refresh status
    const refreshStatus = async () => {
        try {
            if (window.electronAPI?.vanityStatus) {
                const res = await window.electronAPI.vanityStatus();
                if (res.success && res.data) {
                    setIsRunning(res.data.running);
                    setChecks(res.data.checks || 0);
                    setRateLimits(res.data.rateLimits || 0);
                    setActiveCode(res.data.activeCode);
                    if (res.data.claimedCodes?.length) {
                        setClaimedCodes(res.data.claimedCodes);
                    }
                }
            }
        } catch (_) {}
    };

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 1500);
        return () => clearInterval(interval);
    }, []);

    // Verify guild eligibility
    const handleVerifyGuild = async (idToVerify?: string) => {
        const id = (idToVerify || targetGuildId).trim();
        if (!id) {
            showToast(isFr ? 'Entrez un ID de serveur valide.' : 'Enter a valid server ID.', 'danger');
            return;
        }

        setIsCheckingGuild(true);
        try {
            const res = await window.electronAPI.vanityCheckGuild(id);
            if (res.success && res.data) {
                setGuildVerification({
                    checked: true,
                    eligible: res.data.eligible,
                    name: res.data.name,
                    reason: res.data.reason
                });
                if (res.data.eligible) {
                    showToast(isFr ? `Serveur validé : ${res.data.name}` : `Server verified: ${res.data.name}`);
                } else {
                    showToast(res.data.reason || (isFr ? 'Serveur non éligible.' : 'Server not eligible.'), 'danger');
                }
            }
        } catch (e: any) {
            showToast(isFr ? 'Erreur lors de la vérification.' : 'Verification failed.', 'danger');
        } finally {
            setIsCheckingGuild(false);
        }
    };

    // Add code tag
    const handleAddCode = () => {
        const clean = vanityInput.replace(/^https?:\/\/discord\.(gg|com\/invite)\//i, '').trim().toLowerCase();
        if (clean && !vanityCodes.includes(clean)) {
            setVanityCodes([...vanityCodes, clean]);
            setVanityInput('');
        }
    };

    const handleRemoveCode = (code: string) => {
        setVanityCodes(vanityCodes.filter(c => c !== code));
    };

    // Toggle Sniper
    const handleToggleSniper = async () => {
        if (isRunning) {
            audioService.play('module_stop');
            await window.electronAPI.vanityStop();
            setIsRunning(false);
            showToast(isFr ? 'Vanity Sniper arrêté.' : 'Vanity Sniper stopped.', 'danger');
            return;
        }

        if (!targetGuildId.trim()) {
            showToast(isFr ? "Veuillez renseigner l'ID du serveur cible." : 'Please provide a target server ID.', 'danger');
            return;
        }

        if (vanityCodes.length === 0) {
            showToast(isFr ? 'Veuillez ajouter au moins un code vanity à surveiller.' : 'Please add at least one vanity code.', 'danger');
            return;
        }

        const botTokens = botTokensText
            .split(/[\n,]+/)
            .map(t => t.trim())
            .filter(t => t.length > 20);

        audioService.play('module_launch');
        const res = await window.electronAPI.vanityStart({
            targetGuildId: targetGuildId.trim(),
            vanityCodes,
            delayMs,
            botTokens,
            webhookUrl: webhookUrl.trim() || undefined,
            gatewayListen
        });

        if (res.success) {
            setIsRunning(true);
            showToast(isFr ? 'Vanity Sniper Pro lancé avec succès !' : 'Vanity Sniper Pro started successfully!');
        } else {
            audioService.play('log_error_critical');
            showToast(res.error || (isFr ? 'Échec du lancement.' : 'Failed to launch.'), 'danger');
        }
    };

    const botTokensCount = botTokensText.split(/[\n,]+/).filter(t => t.trim().length > 20).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Control Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(10, 15, 25, 0.6) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isRunning ? '0 0 30px rgba(0, 229, 255, 0.2)' : 'none',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: isRunning ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isRunning ? 'rgba(0, 229, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isRunning ? '0 0 20px rgba(0, 229, 255, 0.4)' : 'none'
                    }}>
                        <Crosshair size={28} color={isRunning ? '#00e5ff' : '#6b7280'} className={isRunning ? 'animate-spin' : ''} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '0.5px', margin: 0 }}>
                                GUILD VANITY URL CLAIMER PRO
                            </h2>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                padding: '3px 8px',
                                borderRadius: '20px',
                                background: isRunning ? 'rgba(0, 229, 255, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                color: isRunning ? '#00e5ff' : '#ef4444',
                                border: `1px solid ${isRunning ? 'rgba(0, 229, 255, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                {isRunning ? (isFr ? `SNIPING ACTIF (${checks} checks)` : `ACTIVE (${checks} checks)`) : (isFr ? 'EN VEILLE' : 'STANDBY')}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-dim)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Radio size={12} color={gatewayListen ? '#10b981' : '#6b7280'} />
                                {isFr ? 'Interception Gateway 0ms :' : 'Gateway 0ms Listener :'} <strong style={{ color: gatewayListen ? '#10b981' : 'white' }}>
                                    {gatewayListen ? 'ACTIVÉE (GUILD_UPDATE)' : 'DÉSACTIVÉE'}
                                </strong>
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Bot size={12} color="#00e5ff" />
                                {isFr ? 'Scanner Découplé :' : 'Decoupled Scanner :'} <strong style={{ color: botTokensCount > 0 ? '#00e5ff' : 'var(--text-dim)' }}>
                                    {botTokensCount > 0 ? `${botTokensCount} Bot Token(s)` : 'User Agent Direct'}
                                </strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={handleToggleSniper}
                        style={{
                            padding: '12px 28px',
                            borderRadius: '12px',
                            background: isRunning ? '#ef4444' : '#00e5ff',
                            border: 'none',
                            color: isRunning ? 'white' : 'black',
                            fontSize: '12px',
                            fontWeight: '900',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isRunning ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 25px rgba(0, 229, 255, 0.4)',
                            transition: '0.2s'
                        }}
                    >
                        {isRunning ? <Square size={16} /> : <Play size={16} />}
                        <span>{isRunning ? (isFr ? 'ARRÊTER LE SNIPER' : 'STOP SNIPER') : (isFr ? 'LANCER LE SNIPER' : 'START SNIPER')}</span>
                    </button>
                </div>
            </div>

            {/* OPSEC Guide Banner */}
            {showGuide && (
                <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(0, 229, 255, 0.04)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00e5ff', fontWeight: '900', fontSize: '11px' }}>
                            <Shield size={14} />
                            <span>{isFr ? 'GUIDE OPSEC : ARCHITECTURE ULTRA-RAPIDE 2-TIERS (ZERO RISK)' : 'OPSEC GUIDE: 2-TIER ULTRA-FAST ARCHITECTURE (ZERO RISK)'}</span>
                        </div>
                        <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}>
                            {isFr ? 'Masquer' : 'Hide'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>1. Scanner Découplé (Bot Tokens)</strong>
                            {isFr 
                                ? "Collez des Bot Tokens gratuits pour scanner à 300ms sans jamais consommer le rate-limit de votre compte personnel." 
                                : "Paste free bot tokens to scan at 300ms without ever consuming your personal account's rate-limit."}
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>2. Claim 0ms sur GUILD_UPDATE</strong>
                            {isFr 
                                ? "Intercepte instantanément les changements de vanity sur la WebSocket sans attendre le tick de polling HTTP." 
                                : "Instantly intercepts vanity changes over the Discord Gateway WebSocket without waiting for HTTP poll ticks."}
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>3. Multi-Cibles & Webhook</strong>
                            {isFr 
                                ? "Surveillez jusqu'à 20 vanity URLs en simultané et recevez une alerte embed Discord dès qu'un lien est sécurisé." 
                                : "Monitor up to 20 vanity URLs simultaneously and receive an instant Discord embed alert upon claim."}
                        </div>
                    </div>
                </div>
            )}

            {/* Target Guild & Vanity Codes Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '20px' }}>
                
                {/* Left Card: Target Server Configuration */}
                <HubSectionCard icon={Server} title={isFr ? 'SERVEUR CIBLE DU CLAIM' : 'TARGET GUILD CONFIGURATION'}>
                    <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                        {isFr ? 'Spécifiez le serveur où la Vanity URL sera assignée dès sa libération' : 'Specify the server where the Vanity URL will be assigned'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder={isFr ? "ID du serveur cible (ex: 123456789012345678)..." : "Target Guild ID..."}
                                value={targetGuildId}
                                disabled={isRunning}
                                onChange={e => {
                                    setTargetGuildId(e.target.value);
                                    setGuildVerification(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px 14px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '12px'
                                }}
                            />
                            <button
                                type="button"
                                disabled={isRunning || isCheckingGuild}
                                onClick={() => handleVerifyGuild()}
                                style={{
                                    padding: '0 16px',
                                    background: 'rgba(0, 229, 255, 0.1)',
                                    border: '1px solid rgba(0, 229, 255, 0.3)',
                                    borderRadius: '10px',
                                    color: '#00e5ff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isCheckingGuild ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                                <span>{isFr ? 'VÉRIFIER' : 'VERIFY'}</span>
                            </button>
                        </div>

                        {/* Guild Verification Card */}
                        {guildVerification && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: guildVerification.eligible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                border: `1px solid ${guildVerification.eligible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '11px', color: guildVerification.eligible ? '#10b981' : '#ef4444' }}>
                                    {guildVerification.eligible ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                    <span>{guildVerification.name || (isFr ? 'Vérification terminée' : 'Verification complete')}</span>
                                </div>
                                {guildVerification.reason && (
                                    <p style={{ fontSize: '10px', color: 'var(--text-dim)', margin: 0 }}>
                                        {guildVerification.reason}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Delay Interval Slider */}
                        <div style={{
                            padding: '14px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '10px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', fontWeight: '800' }}>
                                <span className="caption">{isFr ? 'Cadence de surveillance' : 'Scan interval'}</span>
                                <span style={{ color: '#00e5ff' }}>{delayMs}ms</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="3000"
                                step="50"
                                value={delayMs}
                                disabled={isRunning}
                                onChange={e => setDelayMs(parseInt(e.target.value, 10))}
                                style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Gateway Hook Toggle */}
                        <HubToggleRow
                            title={isFr ? 'Interception Gateway (0ms)' : 'Gateway 0ms Interception'}
                            description={isFr ? 'Écoute les événements GUILD_UPDATE en temps réel pour un claim instantané' : 'Listens to real-time GUILD_UPDATE events for sub-millisecond claim'}
                            active={gatewayListen}
                            onToggle={() => setGatewayListen(!gatewayListen)}
                            accent="#00e5ff"
                        />
                    </div>
                </HubSectionCard>

                {/* Right Card: Multi-Vanity Targets & Bot Token Pool */}
                <HubSectionCard icon={Link} title={isFr ? 'CODES VANITY & BOT TOKENS POOL' : 'VANITY TARGETS & BOT TOKENS POOL'}>
                    <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                        {isFr ? 'Ajoutez les vanity URLs à surveiller et vos Bot Tokens de scanning' : 'Add vanity URLs to monitor and scanning Bot Tokens'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Vanity Code Input */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder={isFr ? "Code vanity (ex: opsec, lounge, vip)..." : "Vanity code (e.g. opsec, lounge)..."}
                                value={vanityInput}
                                disabled={isRunning}
                                onChange={e => setVanityInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCode()}
                                style={{
                                    flex: 1,
                                    padding: '12px 14px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '12px'
                                }}
                            />
                            <button
                                type="button"
                                disabled={isRunning}
                                onClick={handleAddCode}
                                style={{
                                    padding: '0 16px',
                                    background: 'rgba(0, 229, 255, 0.1)',
                                    border: '1px solid rgba(0, 229, 255, 0.3)',
                                    borderRadius: '10px',
                                    color: '#00e5ff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    cursor: 'pointer'
                                }}
                            >
                                {isFr ? 'AJOUTER' : 'ADD'}
                            </button>
                        </div>

                        {/* Active Codes Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '36px' }}>
                            {vanityCodes.map(code => {
                                const isActive = activeCode === code;
                                return (
                                    <div
                                        key={code}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            background: isActive ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${isActive ? '#00e5ff' : 'rgba(255, 255, 255, 0.1)'}`,
                                            color: isActive ? '#00e5ff' : 'white',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <span>discord.gg/{code}</span>
                                        {!isRunning && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCode(code)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bot Token Pool */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800' }}>
                                <span className="caption">{isFr ? 'BOT TOKENS POOL (ROTATION 24/7)' : 'BOT TOKENS POOL (24/7 ROTATION)'}</span>
                                <span style={{ color: botTokensCount > 0 ? '#00e5ff' : 'var(--text-dim)' }}>
                                    {botTokensCount} {isFr ? 'Token(s) actif(s)' : 'Active Token(s)'}
                                </span>
                            </div>
                            <textarea
                                placeholder={isFr ? "MTQ... (Collez un ou plusieurs Bot Tokens Discord séparés par virgules ou retours à la ligne)" : "Paste Bot Tokens separated by commas or newlines..."}
                                value={botTokensText}
                                disabled={isRunning}
                                onChange={e => setBotTokensText(e.target.value)}
                                style={{
                                    height: '65px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    resize: 'none'
                                }}
                            />
                        </div>

                        {/* Webhook URL Input */}
                        <input
                            type="text"
                            placeholder={isFr ? "Webhook URL Discord pour alertes (ex: https://discord.com/api/webhooks/...)" : "Discord Webhook URL for claim alerts..."}
                            value={webhookUrl}
                            disabled={isRunning}
                            onChange={e => setWebhookUrl(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '11px'
                            }}
                        />
                    </div>
                </HubSectionCard>
            </div>

            {/* Claimed Vanity Hall of Fame */}
            {claimedCodes.length > 0 && (
                <div style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle2 size={24} color="#10b981" />
                        <div>
                            <h4 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '900' }}>
                                {isFr ? 'VANITY URLS SÉCURISÉES AVEC SUCCÈS !' : 'VANITY URLS CLAIMED SUCCESSFULLY!'}
                            </h4>
                            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '11px' }}>
                                {isFr ? 'Les liens suivants ont été attachés à votre serveur :' : 'The following links have been claimed and attached to your server:'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {claimedCodes.map(c => (
                            <span key={c} style={{ padding: '6px 12px', borderRadius: '8px', background: '#10b981', color: 'black', fontWeight: '900', fontSize: '12px' }}>
                                discord.gg/{c}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
