import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, RefreshCw, Trash2, 
    Activity, ShieldCheck, Zap, AlertTriangle, Search, ChevronDown, UserCircle,
    Lock, Unlock, Copy, UserPlus, Info
} from 'lucide-react';
import { useUserStore } from "@/store/useUserStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { motion, AnimatePresence } from 'framer-motion';
import { SelectionModal } from '../ui/SelectionModal';

// --- Custom Group Dropdown ---
const GroupDropdown = ({ groups, selectedId, onSelect, onRefresh, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';
    
    const selectedGroup = groups.find((g: any) => g.id === selectedId);
    const displayPlaceholder = placeholder || (isFr ? "-- Choisir un groupe --" : "-- Select a group --");
    
    const filteredGroups = useMemo(() => {
        return groups.filter((g: any) => 
            g.name.toLowerCase().includes(search.toLowerCase()) || 
            g.id.includes(search)
        );
    }, [groups, search]);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', 
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)', 
                    borderRadius: '10px', padding: '12px 15px', fontSize: '12px', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                    transition: '0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={14} style={{ opacity: 0.5 }} />
                    <span style={{ fontWeight: '600' }}>{selectedGroup ? selectedGroup.name : displayPlaceholder}</span>
                </div>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ 
                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, 
                            background: '#0a0a0f', border: '1px solid var(--border)', borderRadius: '12px',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden'
                        }}
                    >
                        <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}>
                            <Search size={12} style={{ opacity: 0.4 }} />
                            <input 
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isFr ? "Rechercher un groupe..." : "Search a group..."}
                                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '11px' }}
                            />
                            {onRefresh && (
                                <button 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setIsRefreshing(true);
                                        await onRefresh();
                                        setTimeout(() => setIsRefreshing(false), 800);
                                    }}
                                    style={{ 
                                        background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isRefreshing ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                        transition: '0.3s'
                                    }}
                                    title={isFr ? "Rafraîchir les groupes" : "Refresh groups"}
                                >
                                    <RefreshCw size={14} className={isRefreshing ? "spin-animation" : ""} />
                                </button>
                            )}
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredGroups.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', opacity: 0.4 }}>{isFr ? "Aucun groupe trouvé" : "No group found"}</div>
                            ) : (
                                filteredGroups.map((g: any) => (
                                    <div 
                                        key={g.id}
                                        onClick={() => { onSelect(g.id); setIsOpen(false); }}
                                        style={{ 
                                            padding: '10px 15px', color: 'white', fontSize: '12px', cursor: 'pointer',
                                            background: selectedId === g.id ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                            display: 'flex', alignItems: 'center', gap: '12px', transition: '0.1s'
                                        }}
                                        className="item-hover"
                                    >
                                        <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {g.icon ? <img src={g.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={10} opacity={0.3} />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '700' }}>{g.name}</span>
                                            <span style={{ fontSize: '9px', opacity: 0.4 }}>{g.id}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const GroupSystem = ({ showToast }: { showToast: (m: string, t: 'success' | 'danger') => void }) => {
    const { user } = useUserStore();
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';
    
    // Group Spammer State
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [names, setNames] = useState<string>('');
    const [delay, setDelay] = useState(2000);
    const [isRenaming, setIsRenaming] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    
    // Sentinel Mode State
    const [isSentinelActive, setIsSentinelActive] = useState(false);
    const [partnerToken, setPartnerToken] = useState('');
    const [partnerTag, setPartnerTag] = useState<string | null>(null);
    const [protectedGroups, setProtectedGroups] = useState<string[]>([]);
    const [groupLinks, setGroupLinks] = useState<{[key: string]: string}>({});
    const [isConnectingSentinel, setIsConnectingSentinel] = useState(false);
    const [isRefreshingSentinel, setIsRefreshingSentinel] = useState(false);
    const [shieldedGroups, setShieldedGroups] = useState<string[]>([]);

    // Advanced Tools State
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [isCloning, setIsCloning] = useState(false);
    const [isMassAdding, setIsMassAdding] = useState(false);
    const [showMassAddModal, setShowMassAddModal] = useState(false);
    const [selectedMassAddGroup, setSelectedMassAddGroup] = useState('');
    const [massAddDelay, setMassAddDelay] = useState(2000);
    const [selectedShieldGroup, setSelectedShieldGroup] = useState('');

    useEffect(() => {
        if (window.electronAPI) {
            loadGroups();
            loadFriends();
            checkSentinelStatus();
            
            // Log for the user when they switch to this tab
            (window as any).electronAPI.logInfo?.(isFr ? "Acces au module Group Pro - Systemes operationnels." : "Access to Group Pro module - Operational systems.", 'info');
            
            // Log specific sentinel status if active
            const logStatus = async () => {
                const res = await (window as any).electronAPI.sentinelStatus();
                if (res && res.success && res.data?.active) {
                    (window as any).electronAPI.logInfo?.(isFr ? `[Sentinel] Protection Duo active avec ${res.data.partner}` : `[Sentinel] Duo Protection active with ${res.data.partner}`, 'success');
                }
            };
            logStatus();

            // Restore active Group Rename spammer state from background
            const checkRenameStatus = async () => {
                try {
                    const res = await (window as any).electronAPI.groupRenameStatus();
                    if (res && res.success && res.data && res.data.active) {
                        setIsRenaming(true);
                        setSelectedGroup(res.data.channelId || '');
                        setNames(res.data.names.join('\n'));
                        setDelay(res.data.delay);
                        if (res.data.accountIds) {
                            setSelectedAccounts(res.data.accountIds);
                        }
                    }
                } catch (e) {}
            };
            checkRenameStatus();
        }
    }, []);

    // Auto-select user's main token if no tokens are selected
    useEffect(() => {
        if (user && selectedAccounts.length === 0) {
            setSelectedAccounts([user.id]);
        }
    }, [user]);

    const loadFriends = async () => {
        try {
            const res = await (window as any).electronAPI.getFriendsList();
            if (res && res.success && Array.isArray(res.data)) {
                setFriends(res.data);
            } else if (Array.isArray(res)) {
                setFriends(res);
            }
        } catch (e) {}
    };

    const loadGroups = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api && api.getGroupsList) {
                const res = await api.getGroupsList();
                if (res && res.success && Array.isArray(res.data)) {
                    setGroups(res.data);
                } else if (Array.isArray(res)) {
                    setGroups(res);
                }
            }
        } catch (e) {
            console.error("[GroupPro] Load Error:", e);
        }
    };

    const checkSentinelStatus = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api && api.sentinelStatus) {
                const res = await api.sentinelStatus();
                if (res && res.success && res.data) {
                    setIsSentinelActive(!!res.data.active);
                    setProtectedGroups(res.data.groups || []);
                    setPartnerTag(res.data.partner || null);
                    // Update shielded groups if available from status
                    if (res.data.shielded) setShieldedGroups(res.data.shielded);
                }
            }
        } catch (e) {
            console.error("[GroupPro] Status Error:", e);
        }
    };

    // --- SPAMMER LOGIC ---
    const handleStartSpam = async () => {
        if (!selectedGroup) return showToast(isFr ? 'Sélectionnez un groupe !' : 'Select a group!', 'danger');
        const nameList = names.split('\n').filter((n: string) => n.trim() !== '');
        if (nameList.length === 0) return showToast(isFr ? 'Entrez au moins un nom !' : 'Enter at least one name!', 'danger');

        const accountsToUse = settings.accounts.filter(acc => selectedAccounts.includes(acc.id));
        if (accountsToUse.length === 0) {
            return showToast(isFr ? 'Sélectionnez au moins un token !' : 'Select at least one token!', 'danger');
        }

        setIsRenaming(true);
        try {
            const res = await (window as any).electronAPI.startGroupRename({
                channelId: selectedGroup,
                names: nameList,
                delay,
                accounts: accountsToUse
            });
            if (!res.success) {
                showToast(res.error || (isFr ? 'Erreur inconnue' : 'Unknown error'), 'danger');
                setIsRenaming(false);
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
            setIsRenaming(false);
        }
    };

    const handleStopSpam = async () => {
        try {
            await (window as any).electronAPI.stopGroupRename();
            setIsRenaming(false);
        } catch (e) {
            setIsRenaming(false);
        }
    };

    // --- SENTINEL LOGIC ---
    const handleToggleSentinel = async () => {
        if (isSentinelActive) {
            try {
                await (window as any).electronAPI.stopSentinel();
                setIsSentinelActive(false);
                setPartnerTag(null);
                showToast(isFr ? 'Protection Sentinel désactivée.' : 'Sentinel protection disabled.', 'success');
            } catch (e) {}
        } else {
            if (!partnerToken) return showToast(isFr ? 'Entrez un token partenaire !' : 'Enter a partner token!', 'danger');
            if (protectedGroups.length === 0) return showToast(isFr ? 'Sélectionnez au moins un groupe !' : 'Select at least one group!', 'danger');

            setIsConnectingSentinel(true);
            try {
                const res = await (window as any).electronAPI.startSentinel({
                    partnerToken,
                    groupIds: protectedGroups,
                    groupLinks: groupLinks
                });
                setIsConnectingSentinel(false);

                if (res && res.success) {
                    setIsSentinelActive(true);
                    const status = await (window as any).electronAPI.sentinelStatus();
                    if (status.success) setPartnerTag(status.data.partner);
                    showToast(isFr ? 'SENTINEL ACTIVÉE !' : 'SENTINEL ACTIVATED!', 'success');
                } else {
                    showToast(res?.error || (isFr ? 'Erreur de connexion' : 'Connection error'), 'danger');
                }
            } catch (e: any) {
                setIsConnectingSentinel(false);
                showToast(e.message, 'danger');
            }
        }
    };

    const toggleGroupProtection = (id: string) => {
        setProtectedGroups(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleShield = async (id: string) => {
        const isCurrentlyShielded = shieldedGroups.includes(id);
        setShieldedGroups((prev: string[]) => 
            isCurrentlyShielded ? prev.filter((x: string) => x !== id) : [...prev, id]
        );
        
        try {
            const res = await (window as any).electronAPI.toggleSentinelShield(id, !isCurrentlyShielded);
            if (!res.success) {
                showToast(res.error || (isFr ? 'Erreur Bouclier' : 'Shield error'), 'danger');
                // Revert UI state if error
                setShieldedGroups((prev: string[]) => 
                    isCurrentlyShielded ? [...prev, id] : prev.filter((x: string) => x !== id)
                );
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
        }
    };

    const handleCloneGroup = async (id: string) => {
        if (!id) return;
        setIsCloning(true);
        try {
            const res = await (window as any).electronAPI.cloneGroup(id);
            if (res.success) {
                showToast(isFr ? 'Groupe cloné avec succès !' : 'Group cloned successfully!', 'success');
                loadGroups();
            } else {
                showToast(res.error || (isFr ? 'Échec du clonage' : 'Cloning failed'), 'danger');
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
        } finally {
            setIsCloning(false);
        }
    };

    const handleMassAdd = async (userIds: string[]) => {
        if (!selectedMassAddGroup) return showToast(isFr ? 'Sélectionnez un groupe !' : 'Select a group!', 'danger');
        if (userIds.length === 0) return;

        setIsMassAdding(true);
        setShowMassAddModal(false);
        try {
            const res = await (window as any).electronAPI.massAddRecipients(
                selectedMassAddGroup, 
                userIds, 
                massAddDelay
            );
            if (res.success) {
                showToast(isFr ? `${res.count} amis ajoutés !` : `${res.count} friends added!`, 'success');
            } else {
                showToast(res.error || (isFr ? 'Échec du Mass Add' : 'Mass Add failed'), 'danger');
            }
        } catch (e: any) {
            showToast(e.message, 'danger');
        } finally {
            setIsMassAdding(false);
        }
    };

    if (!user) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
            className="custom-scrollbar"
        >
            <div className="hub-raid-grid custom-scrollbar">
                
                {/* Section 1: Group Name Spammer */}
                <div className="glass-card hub-section-glow" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', '--hub-glow': 'var(--accent)' } as React.CSSProperties}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '8px' }}>
                                <RefreshCw size={18} color="var(--accent)" />
                            </div>
                            <span style={{ fontWeight: '900', color: 'var(--accent)', fontSize: '12px', letterSpacing: '1px' }}>GROUP NAME SPAMMER</span>
                        </div>
                        {isRenaming && <span className="badge-nitro" style={{ fontSize: '10px' }}>{isFr ? 'ACTIF' : 'RUNNING'}</span>}
                    </div>
                    <p style={{ fontSize: '11px', opacity: 0.5, lineHeight: '1.5', marginTop: '-10px', marginBottom: '10px' }}>
                        {isFr ? 'Modifiez le nom de votre groupe à haute fréquence pour saturer les notifications des membres.' : 'Modify the name of your group at high frequency to flood member notifications.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '900', display: 'block', opacity: 0.4, letterSpacing: '1px' }}>{isFr ? 'SÉLECTIONNER LE GROUPE' : 'SELECT GROUP'}</label>
                        <GroupDropdown 
                            groups={groups} 
                            selectedId={selectedGroup} 
                            onSelect={setSelectedGroup} 
                            onRefresh={loadGroups}
                            placeholder={isFr ? "Sélectionner le groupe cible..." : "Select target group..."} 
                        />
                    </div>

                    {/* Token Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '10px', fontWeight: '900', display: 'block', opacity: 0.4, letterSpacing: '1px' }}>
                                {isFr ? `SÉLECTION DES TOKENS (${selectedAccounts.length})` : `TOKEN SELECTION (${selectedAccounts.length})`}
                            </label>
                            <button 
                                type="button" 
                                onClick={() => setSelectedAccounts(settings.accounts?.map(acc => acc.id) || [])} 
                                className="btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: '8px', height: '18px', borderRadius: '4px' }}
                            >
                                {isFr ? 'TOUS LES TOKENS' : 'ALL TOKENS'}
                            </button>
                        </div>
                        <div style={{ maxHeight: '90px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }} className="custom-scrollbar">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                {settings.accounts?.map(acc => (
                                    <div 
                                        key={acc.id} 
                                        onClick={() => {
                                            setSelectedAccounts(prev => prev.includes(acc.id) ? prev.filter(a => a !== acc.id) : [...prev, acc.id]);
                                        }}
                                        style={{ 
                                            padding: '6px 10px', 
                                            background: selectedAccounts.includes(acc.id) ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255,255,255,0.01)', 
                                            border: `1px solid ${selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--border)'}`,
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: '0.2s',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--text-dim)', flexShrink: 0 }}></div>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.username}</span>
                                    </div>
                                ))}
                                {(!settings.accounts || settings.accounts.length === 0) && (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '6px', opacity: 0.4, fontSize: '9px' }}>
                                        {isFr ? "Aucun compte configuré." : "No accounts configured."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '900', display: 'block', marginBottom: '8px', opacity: 0.4, letterSpacing: '1px' }}>{isFr ? 'LISTE DES NOMS (UN PAR LIGNE)' : 'NAMES LIST (ONE PER LINE)'}</label>
                        <textarea 
                            value={names}
                            onChange={(e) => setNames(e.target.value)}
                            placeholder="Nuke By Opsec&#10;Renamed By Fahd"
                            style={{ width: '100%', height: '140px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '15px', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'monospace', transition: '0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: '900' }}>{isFr ? 'VITESSE (MS)' : 'SPEED (MS)'}</span>
                                <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '900' }}>{delay}ms</span>
                            </div>
                            <input 
                                type="range" min="1" max="10000" step="1"
                                value={delay} onChange={(e) => setDelay(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--accent)' }}
                            />
                        </div>
                        <button 
                            onClick={isRenaming ? handleStopSpam : handleStartSpam}
                            className={`btn-${isRenaming ? 'secondary' : 'primary'}`} 
                            style={{ 
                                height: '48px', padding: '0 30px', 
                                background: isRenaming ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                                border: isRenaming ? '1px solid var(--border)' : 'none',
                                color: isRenaming ? 'white' : 'black',
                                borderRadius: '12px'
                             }}
                        >
                            <Zap size={16} fill={isRenaming ? 'none' : 'currentColor'} />
                            <span style={{ marginLeft: '10px', fontWeight: '900' }}>{isRenaming ? (isFr ? 'ARRÊTER' : 'STOP') : (isFr ? 'LANCER' : 'START')}</span>
                        </button>
                    </div>
                </div>

                {/* Section 2: Anti-Kick Duo (Sentinel) */}
                <div className="glass-card hub-section-glow" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', '--hub-glow': '#ff4444' } as React.CSSProperties}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px' }}>
                                <ShieldCheck size={18} color="#ff4444" />
                            </div>
                            <span style={{ fontWeight: '900', color: '#ff4444', fontSize: '12px', letterSpacing: '1px' }}>SENTINEL DUO (ANTI-KICK)</span>
                        </div>
                        <div style={{ 
                            backgroundColor: isSentinelActive ? '#ff4444' : 'transparent', 
                            border: `2px solid ${isSentinelActive ? '#ff4444' : 'rgba(255, 68, 68, 0.2)'}`, 
                            width: '12px', height: '12px', borderRadius: '50%',
                            boxShadow: isSentinelActive ? '0 0 10px #ff4444' : 'none'
                        }}></div>
                    </div>
                    <p style={{ fontSize: '11px', opacity: 0.5, lineHeight: '1.5', marginTop: '-10px' }}>
                        {isFr ? 'Protégez vos groupes contre les kicks. Si un compte est éjecté, le partenaire le ré-invite' : 'Protect your groups from kicks. If an account is kicked, the partner re-invites it'} <span style={{ color: '#ff4444', fontWeight: '900' }}>{isFr ? 'instantanément' : 'instantly'}</span>.
                    </p>

                    {!settings.sentinelEnabled ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '15px', opacity: 0.6 }}>
                            <AlertTriangle size={36} color="#ff4444" />
                            <p style={{ fontSize: '12px', padding: '0 20px' }}>{isFr ? 'Sentinel Mode est désactivé dans les paramètres globaux.' : 'Sentinel Mode is disabled in global settings.'}</p>
                            <button className="btn-secondary" style={{ fontSize: '10px', padding: '10px 20px' }} onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Settings' }))}>{isFr ? 'ALLER AUX RÉGLAGES' : 'GO TO SETTINGS'}</button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4, letterSpacing: '1px' }}>{isFr ? 'TOKEN DU COMPTE PARTENAIRE' : 'PARTNER ACCOUNT TOKEN'}</label>
                                        
                                        {/* Quick Alt Selector */}
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {(settings.accounts || [])
                                                .filter(acc => acc.id !== user?.id)
                                                .slice(0, 5)
                                                .map(acc => (
                                                    <div 
                                                        key={acc.id}
                                                        onClick={() => setPartnerToken(acc.token)}
                                                        title={isFr ? `Utiliser ${acc.username}` : `Use ${acc.username}`}
                                                        style={{ 
                                                            width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden', 
                                                            border: `1px solid ${partnerToken === acc.token ? 'var(--accent)' : 'transparent'}`,
                                                            cursor: 'pointer', transition: '0.2s', opacity: partnerToken === acc.token ? 1 : 0.5,
                                                            background: 'rgba(0,0,0,0.3)'
                                                        }}
                                                    >
                                                        {acc.avatarURL ? <img src={acc.avatarURL} alt="" style={{ width: '100%', height: '100%' }} /> : <div style={{ fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{acc.username[0]}</div>}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                    <input 
                                        type="password"
                                        value={partnerToken}
                                        onChange={(e) => setPartnerToken(e.target.value)}
                                        placeholder="Mfa.TokenSec..."
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '11px', outline: 'none', transition: '0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = '#ff4444'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4, letterSpacing: '1px' }}>{isFr ? `GROUPES PROTÉGÉS (${protectedGroups.length})` : `PROTECTED GROUPS (${protectedGroups.length})`}</label>
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                                            <Search size={10} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                            <input 
                                                type="text" 
                                                placeholder={isFr ? "RECHERCHER..." : "SEARCH..."} 
                                                value={groupSearchTerm}
                                                onChange={(e) => setGroupSearchTerm(e.target.value)}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '6px 10px 6px 28px', 
                                                    background: 'rgba(255,255,255,0.03)', 
                                                    border: '1px solid var(--border)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '9px', 
                                                    color: 'white',
                                                    fontWeight: '800'
                                                }} 
                                            />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                setIsRefreshingSentinel(true);
                                                await loadGroups();
                                                setTimeout(() => setIsRefreshingSentinel(false), 800);
                                            }}
                                            style={{ 
                                                background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: isRefreshingSentinel ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                                transition: '0.3s'
                                            }}
                                            title={isFr ? "Actualiser les groupes" : "Refresh groups"}
                                        >
                                            <RefreshCw size={14} className={isRefreshingSentinel ? "spin-animation" : ""} />
                                        </button>
                                    </div>
                                    <div style={{ height: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px solid var(--border)', padding: '8px' }} className="custom-scrollbar">
                                        {(groups || []).length === 0 ? (
                                            <div style={{ padding: '30px 20px', textAlign: 'center', opacity: 0.3, fontSize: '11px' }}>{isFr ? "Aucun DM de groupe détecté" : "No group DMs detected"}</div>
                                        ) : groups
                                            .filter(g => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                                            .map(g => (
                                                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                                                    <div 
                                                        style={{ 
                                                            padding: '10px 15px', borderRadius: '10px',
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            background: protectedGroups.includes(g.id) ? 'rgba(255, 68, 68, 0.08)' : 'rgba(255,255,255,0.01)',
                                                            border: `1px solid ${protectedGroups.includes(g.id) ? 'rgba(255, 68, 68, 0.3)' : 'transparent'}`,
                                                            fontSize: '11px', transition: '0.2s'
                                                        }}
                                                    >
                                                        <div onClick={() => toggleGroupProtection(g.id)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ opacity: protectedGroups.includes(g.id) ? 1 : 0.6, fontWeight: protectedGroups.includes(g.id) ? '700' : '400' }}>{g.name}</span>
                                                            {protectedGroups.includes(g.id) && <ShieldCheck size={14} color="#ff4444" />}
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {protectedGroups.includes(g.id) && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>}
                                                        </div>
                                                    </div>
                                                    {protectedGroups.includes(g.id) && (
                                                        <input 
                                                            type="text"
                                                            placeholder={isFr ? "Lien d'invitation (optionnel)" : "Invitation link (optional)"}
                                                            value={groupLinks[g.id] || ''}
                                                            onChange={(e) => setGroupLinks({...groupLinks, [g.id]: e.target.value})}
                                                            style={{ 
                                                                fontSize: '9px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', 
                                                                padding: '5px 10px', borderRadius: '6px', color: 'rgba(255,255,255,0.7)', outline: 'none' 
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button 
                                    onClick={handleToggleSentinel}
                                    disabled={isConnectingSentinel}
                                    className="btn-primary" 
                                    style={{ 
                                        width: '100%', height: '48px', 
                                        background: isSentinelActive ? 'rgba(255, 68, 68, 0.1)' : '#ff4444',
                                        border: isSentinelActive ? '1px solid #ff4444' : 'none',
                                        color: isSentinelActive ? '#ff4444' : 'white',
                                        borderRadius: '12px',
                                        boxShadow: isSentinelActive ? 'none' : '0 10px 25px rgba(255, 68, 68, 0.2)'
                                    }}
                                >
                                    {isConnectingSentinel ? <RefreshCw className="animate-spin" size={16} /> : (isSentinelActive ? <Trash2 size={16} /> : <Zap size={16} />)}
                                    <span style={{ marginLeft: '10px', fontWeight: '900' }}>{isSentinelActive ? (isFr ? 'ARRÊTER LA SENTINELLE' : 'STOP SENTINEL') : (isFr ? 'DÉMARRER LA SENTINELLE' : 'START SENTINEL')}</span>
                                </button>
                                
                                <AnimatePresence>
                                    {isSentinelActive && partnerTag && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '12px', background: 'rgba(255,68,68,0.05)', borderRadius: '10px', border: '1px solid rgba(255,68,68,0.1)' }}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <UserCircle size={20} color="#ff4444" />
                                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 6, height: 6, background: '#23a55a', borderRadius: '50%', border: '1px solid #000' }}></div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: '#ff4444', fontSize: '10px', fontWeight: '900' }}>{isFr ? 'PARTENAIRE CONNECTÉ' : 'PARTNER CONNECTED'}</span>
                                                <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>{partnerTag}</span>
                                            </div>
                                            <Activity size={14} color="#ff4444" className="animate-pulse" style={{ marginLeft: 'auto' }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>

                {/* Section 3: Advanced Tools */}
                <div className="glass-card hub-section-glow" style={{ gridColumn: 'span 2', padding: '25px', display: 'flex', flexDirection: 'column', gap: '25px', '--hub-glow': 'var(--accent)' } as React.CSSProperties}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '6px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '8px' }}>
                            <Zap size={18} color="var(--accent)" />
                        </div>
                        <span style={{ fontWeight: '900', color: 'var(--accent)', fontSize: '12px', letterSpacing: '1px' }}>{isFr ? 'OUTILS AVANCÉS (GROUP TOOLS)' : 'ADVANCED TOOLS (GROUP TOOLS)'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                        {/* Cloner */}
                        <div className="glass-card hub-section-glow" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px', '--hub-glow': 'var(--accent)' } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Copy size={16} color="var(--accent)" />
                                <span style={{ fontSize: '12px', fontWeight: '900' }}>GROUP CLONER</span>
                            </div>
                            <p style={{ fontSize: '10px', opacity: 0.5, lineHeight: '1.4' }}>
                                {isFr ? 'Dupliquez ce groupe dans une nouvelle conversation avec tous vos amis membres.' : 'Duplicate this group in a new conversation with all your member friends.'}
                            </p>
                            <GroupDropdown 
                                groups={groups} 
                                selectedId={selectedGroup} 
                                onSelect={setSelectedGroup} 
                                placeholder={isFr ? "Groupe source..." : "Source group..."} 
                            />
                            <button 
                                onClick={() => handleCloneGroup(selectedGroup)}
                                disabled={!selectedGroup || isCloning}
                                className="btn-secondary" 
                                style={{ height: '40px', width: '100%', fontSize: '10px', fontWeight: '900' }}
                            >
                                {isCloning ? (isFr ? 'CLONAGE EN COURS...' : 'CLONING...') : (isFr ? 'CLONER LE GROUPE' : 'CLONE GROUP')}
                            </button>
                        </div>

                        {/* Mass Add */}
                        <div className="glass-card hub-section-glow" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px', '--hub-glow': 'var(--accent)' } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserPlus size={14} color="var(--accent)" />
                                <span style={{ fontSize: '11px', fontWeight: '900' }}>MASS ADD (FRIENDS)</span>
                            </div>
                            <p style={{ fontSize: '10px', opacity: 0.5, lineHeight: '1.4' }}>
                                {isFr ? 'Ajoutez massivement vos amis à ce groupe avec un délai de sécurité ajustable.' : 'Mass add your friends to this group with an adjustable safety delay.'}
                            </p>
                            <GroupDropdown 
                                groups={groups} 
                                selectedId={selectedMassAddGroup} 
                                onSelect={setSelectedMassAddGroup} 
                                placeholder={isFr ? "Groupe cible..." : "Target group..."} 
                            />
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '9px', opacity: 0.5, fontWeight: '900' }}>{isFr ? 'VITESSE (MS)' : 'SPEED (MS)'}</span>
                                        <span style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: '900' }}>{massAddDelay}ms</span>
                                    </div>
                                    <input 
                                        type="range" min="100" max="10000" step="100"
                                        value={massAddDelay} onChange={(e) => setMassAddDelay(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowMassAddModal(true);
                                        loadFriends();
                                    }}
                                    disabled={!selectedMassAddGroup || isMassAdding}
                                    className="btn-primary" 
                                    style={{ height: '35px', padding: '0 20px', fontSize: '10px' }}
                                >
                                    {isMassAdding ? (isFr ? 'AJOUT...' : 'ADDING...') : (isFr ? 'CHOISIR AMIS' : 'CHOOSE FRIENDS')}
                                </button>
                            </div>
                        </div>

                        {/* Dedicated Group Shield Module */}
                        <div className="glass-card hub-section-glow" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px', '--hub-glow': 'var(--accent)' } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Lock size={16} color="var(--accent)" />
                                <span style={{ fontSize: '12px', fontWeight: '900' }}>GROUP SHIELD (LOCK)</span>
                            </div>
                            <p style={{ fontSize: '10px', opacity: 0.5, lineHeight: '1.4' }}>
                                {isFr ? 'Verrouillez les métadonnées (Nom/Icône) pour empêcher toute modification.' : 'Lock metadata (Name/Icon) to prevent any modifications.'}
                            </p>
                            <GroupDropdown 
                                groups={groups} 
                                selectedId={selectedShieldGroup} 
                                onSelect={setSelectedShieldGroup} 
                                placeholder={isFr ? "Groupe à protéger..." : "Group to protect..."} 
                            />
                            <button 
                                onClick={() => handleToggleShield(selectedShieldGroup)}
                                disabled={!selectedShieldGroup}
                                className={shieldedGroups.includes(selectedShieldGroup) ? "btn-secondary" : "btn-primary"} 
                                style={{ 
                                    height: '35px', width: '100%', fontSize: '10px', fontWeight: '900',
                                    background: shieldedGroups.includes(selectedShieldGroup) ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--accent)',
                                    color: shieldedGroups.includes(selectedShieldGroup) ? 'var(--accent)' : 'black',
                                    border: shieldedGroups.includes(selectedShieldGroup) ? '1px solid var(--accent)' : 'none'
                                }}
                            >
                                {shieldedGroups.includes(selectedShieldGroup) ? (isFr ? 'DÉVERROUILLER' : 'UNLOCK') : (isFr ? 'VERROUILLER LE GROUPE' : 'LOCK GROUP')}
                            </button>
                        </div>
                    </div>
                </div>

                <SelectionModal
                    isOpen={showMassAddModal}
                    onClose={() => setShowMassAddModal(false)}
                    title={isFr ? `Ajouter au groupe (${friends.length} amis)` : `Add to group (${friends.length} friends)`}
                    type="friends"
                    items={friends.map((f: any) => ({ id: f.id, name: f.username, avatar: f.avatar }))}
                    onConfirm={handleMassAdd}
                />
            </div>
        </motion.div>
    );
};
