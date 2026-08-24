import React, { useState, useEffect } from 'react';
import { 
    Shield, Zap, Gift, UserX, MessageSquare, AlertTriangle, 
    MousePointer2, Play, Square, Activity, Target, Trash2,
    Plus, Check, Info, Settings, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { audioService } from '@/services/AudioService';
import { HubSectionCard, HubToggleRow, HubFieldRow } from '@/components/layout/HubPageLayout';

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

const getCategoryName = (id: string, isFr: boolean) => {
    switch (id) {
        case 'harassment': return isFr ? 'Harcèlement' : 'Harassment';
        case 'spam': return isFr ? 'Spam / Liens Malveillants' : 'Spam / Malicious Links';
        case 'nsfw': return isFr ? 'Contenu NSFW / NSFW Sans Consentement' : 'NSFW Content / Non-Consensual NSFW';
        case 'hate': return isFr ? 'Discours Haineux' : 'Hate Speech';
        case 'self-harm': return isFr ? 'Automutilation / Suicide' : 'Self-Harm / Suicide';
        default: return id;
    }
};

export const AutomationSystem = ({ showToast }: AutomationSystemProps) => {
    const { settings, updateSetting } = useSettingsStore();
    const isFr = settings.language === 'fr';
    
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

    const handleRunNukeReaction = async () => {
        if (!reactTargetId || !reactChannelId) {
            if (showToast) showToast(isFr ? 'Cible et Salon requis !' : 'Target and Channel required!', 'danger');
            return;
        }

        const accountsToUse = settings.accounts.filter(acc => selectedAccounts.includes(acc.id));
        if (accountsToUse.length === 0) {
            if (showToast) showToast(isFr ? 'Sélectionnez au moins un token !' : 'Select at least one token!', 'danger');
            return;
        }

        setIsReacting(true);
        audioService.play('module_launch');
        try {
            const res = await (window as any).electronAPI.startAutoVote({
                messageId: reactTargetId,
                channelId: reactChannelId,
                emoji: reactEmoji,
                accounts: accountsToUse
            });
            audioService.play('module_complete');
            if (showToast) {
                showToast(
                    isFr 
                        ? `Nuke de Réactions terminé (${res.successCount} succès)` 
                        : `Reaction Nuke completed (${res.successCount} successes)`, 
                    'success'
                );
            }
        } catch (e: any) {
            audioService.play('module_failed');
            if (showToast) showToast(isFr ? `Erreur Nuke : ${e.message}` : `Nuke Error: ${e.message}`, 'danger');
        } finally {
            setIsReacting(false);
        }
    };

    const selectAllTokens = () => {
        setSelectedAccounts(settings.accounts.map(acc => acc.id));
    };

    return (
        <div className="hub-engine-grid">
            {/* AUTO-REPORT SECTION */}
            <HubSectionCard icon={UserX} iconColor="var(--danger)" glowColor="var(--danger)" title="SENTINEL GUARD : AUTO-REPORT" className="animate-fade-in">
                <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                    {isFr ? 'Surveillance permanente et signalement automatique de messages' : 'Permanent monitoring and automatic message reporting'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <HubToggleRow
                        title={isFr ? 'ACTIVER LE MODULATEUR' : 'ENABLE MODULATOR'}
                        description={isFr ? 'Surveillance permanente des messages' : 'Permanent message monitoring'}
                        active={reportEnabled}
                        onToggle={() => { 
                            const newState = !reportEnabled;
                            setReportEnabled(newState); 
                            audioService.play(newState ? 'module_launch' : 'module_stop');
                        }}
                        accent="var(--danger)"
                    />

                    <div style={{ opacity: reportEnabled ? 1 : 0.5, pointerEvents: reportEnabled ? 'all' : 'none', transition: '0.3s' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <HubFieldRow label={isFr ? 'ID DE LA CIBLE' : 'TARGET ID'}>
                                    <input 
                                        type="text" 
                                        value={reportTargetId} 
                                        onChange={e => setReportTargetId(e.target.value)} 
                                        placeholder="User ID (Snowflake)..." 
                                        className="input-field settings-select"
                                    />
                                </HubFieldRow>
                                <HubFieldRow label={isFr ? 'ID SERVEUR (Optionnel)' : 'SERVER ID (Optional)'}>
                                    <input 
                                        type="text" 
                                        value={reportServerId} 
                                        onChange={e => setReportServerId(e.target.value)} 
                                        placeholder="Server ID (Snowflake)..." 
                                        className="input-field settings-select"
                                    />
                                </HubFieldRow>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <HubFieldRow label={isFr ? 'LIMITE DE FLUX (msg/min)' : 'FLOOD LIMIT (msg/min)'}>
                                    <input 
                                        type="number" 
                                        value={floodLimit} 
                                        onChange={e => setFloodLimit(Number(e.target.value))} 
                                        className="input-field settings-select"
                                    />
                                </HubFieldRow>
                                <HubFieldRow label={isFr ? 'CATÉGORIE DISCORD' : 'DISCORD CATEGORY'}>
                                    <select 
                                        value={REPORT_CATEGORIES.find(c => JSON.stringify(c.breadcrumbs) === JSON.stringify(selectedCategory))?.id}
                                        onChange={(e) => {
                                            const cat = REPORT_CATEGORIES.find(c => c.id === e.target.value);
                                            if (cat) setSelectedCategory(cat.breadcrumbs);
                                        }}
                                        className="input-field settings-select"
                                        style={{ outline: 'none' }}
                                    >
                                        {REPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{getCategoryName(c.id, isFr)}</option>)}
                                    </select>
                                </HubFieldRow>
                            </div>

                            <HubFieldRow label={isFr ? "MOTS CLÉS D'INSULTES (Séparés par virgules)" : "INSULT KEYWORDS (Comma separated)"}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => { setUseRegex(!useRegex); }}>
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: useRegex ? 'var(--accent)' : 'var(--text-dim)' }}>
                                            {isFr ? 'MODE REGEX' : 'REGEX MODE'}
                                        </span>
                                        <div className={`nighty-toggle mini ${useRegex ? 'active' : ''}`} style={{ '--accent': 'var(--accent)' } as any}>
                                            <div className="nighty-toggle-handle"></div>
                                        </div>
                                    </div>
                                </div>
                                <textarea 
                                    value={insultKeywords} 
                                    onChange={e => setInsultKeywords(e.target.value)} 
                                    placeholder={useRegex ? (isFr ? "regex1, [a-z]+..." : "regex1, [a-z]+...") : (isFr ? "fdp, connard, useless..." : "asshole, idiot, useless...")} 
                                    style={{ width: '100%', height: '60px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', resize: 'none', fontSize: '12px' }} 
                                />
                            </HubFieldRow>

                            <HubFieldRow label={isFr ? "PROFONDEUR D'ANALYSE (Scan Historique)" : "ANALYSIS DEPTH (History Scan)"}>
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
                            </HubFieldRow>
                        </div>
                    </div>
                </div>
            </HubSectionCard>

            {/* VOTE STORM SECTION */}
            <HubSectionCard icon={Zap} glowColor="var(--accent)" title="VOTE STORM : MULTI-ACCOUNT REACTION" className="animate-fade-in">
                <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                    {isFr ? 'Ajout simultané de réactions avec tous vos tokens' : 'Simultaneous reaction addition using all your tokens'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <HubFieldRow label={isFr ? 'ID MESSAGE CIBLE' : 'TARGET MESSAGE ID'}>
                            <input 
                                type="text" 
                                value={reactTargetId} 
                                onChange={e => setReactTargetId(e.target.value)} 
                                placeholder="Message ID..." 
                                className="input-field settings-select"
                            />
                        </HubFieldRow>
                        <HubFieldRow label={isFr ? 'ID SALON CIBLE' : 'TARGET CHANNEL ID'}>
                            <input 
                                type="text" 
                                value={reactChannelId} 
                                onChange={e => setReactChannelId(e.target.value)} 
                                placeholder="Channel ID..." 
                                className="input-field settings-select"
                            />
                        </HubFieldRow>
                    </div>

                    <HubFieldRow label={isFr ? 'EMOJI DE NUKE' : 'NUKE EMOJI'}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                            <input 
                                type="text" 
                                value={reactEmoji} 
                                onChange={e => setReactEmoji(e.target.value)} 
                                style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white', textAlign: 'center', fontSize: '18px' }} 
                            />
                            <button type="button" onClick={selectAllTokens} className="btn-secondary" style={{ height: '48px', padding: '0 15px', fontSize: '11px' }}>
                                {isFr ? 'TOUS LES TOKENS' : 'ALL TOKENS'}
                            </button>
                        </div>
                    </HubFieldRow>

                    <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '10px', border: '1px solid var(--border)' }}>
                        <label className="caption" style={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.5, marginBottom: '8px', display: 'block' }}>
                            {isFr ? `SÉLECTION DES COMPTES (${selectedAccounts.length})` : `ACCOUNTS SELECTION (${selectedAccounts.length})`}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {settings.accounts.map(acc => (
                                <div 
                                    key={acc.id} 
                                    onClick={() => {
                                        setSelectedAccounts(prev => prev.includes(acc.id) ? prev.filter(a => a !== acc.id) : [...prev, acc.id]);
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
                        style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)', height: '55px', fontWeight: '900', fontSize: '16px', marginTop: '10px' }}
                    >
                        {isReacting 
                            ? (isFr ? 'VOTE STORM EN COURS...' : 'VOTING STORM IN PROGRESS...') 
                            : (isFr ? 'LANCER LE NUKE DE RÉACTION' : 'LAUNCH REACTION NUKE')}
                    </button>
                </div>
            </HubSectionCard>

            {/* SNIPERS & JOINERS */}
            <HubSectionCard icon={Gift} iconColor="#FF73FA" glowColor="#FF73FA" title="SNIPERS & JOINERS" className="animate-fade-in">
                <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                    {isFr ? 'Capture de Nitro et participation aux giveaways et drops' : 'Auto-capture of Nitro and joining giveaways/drops'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <HubToggleRow
                        title="Auto-Snipe (Nitro)"
                        description={isFr ? 'Capture auto des codes Nitro — Captcha Advisory' : 'Auto-capture Nitro codes — Captcha Advisory'}
                        active={nitroSniper}
                        onToggle={() => { setNitroSniper(!nitroSniper); }}
                        accent="#FF73FA"
                    />
                    <HubToggleRow
                        title="Giveaway & Drop Joiner"
                        description={isFr ? 'Participation automatique aux giveaways (réactions/boutons) et drops (claims)' : 'Automatic participation in giveaways (reactions/buttons) and drops (claims)'}
                        active={giveawayJoiner}
                        onToggle={() => { setGiveawayJoiner(!giveawayJoiner); }}
                        accent="#00FF87"
                    />

                    <div className="settings-item-row hub-field-row" style={{ opacity: giveawayJoiner ? 1 : 0.4 }}>
                        <label className="caption hub-field-label">{isFr ? 'DÉLAI DE PARTICIPATION (ms)' : 'JITTER DELAY (ms)'}</label>
                        <input type="range" min="1000" max="30000" step="1000" value={giveawayDelay} onChange={e => setGiveawayDelay(Number(e.target.value))} style={{ width: '100%', accentColor: '#00FF87' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5, fontWeight: 'bold' }}>
                            <span>1s</span><span>{Math.round(giveawayDelay / 1000)}s</span><span>30s</span>
                        </div>
                    </div>

                    <div className="hub-info-banner" style={{ background: 'rgba(255, 115, 250, 0.04)', borderColor: 'rgba(255, 115, 250, 0.15)' }}>
                        <Settings size={16} color="#FF73FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: 'white' }}>
                                {isFr ? 'Config Réseau / Captchas' : 'Network / Captcha Config'}
                            </span>
                            <p>
                                {isFr 
                                    ? 'Les clés Captcha et Proxies sont centralisées dans le Network Hub.' 
                                    : 'Captcha keys and Proxies are centralized in the Network Hub.'}
                            </p>
                            <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Network' })); }} className="btn-secondary" style={{ marginTop: '12px', fontSize: '10px', color: '#FF73FA', borderColor: 'rgba(255, 115, 250, 0.3)' }}>
                                {isFr ? 'OUVRIR LE NETWORK HUB' : 'OPEN NETWORK HUB'}
                            </button>
                        </div>
                    </div>
                </div>
            </HubSectionCard>
        </div>
    );
};
