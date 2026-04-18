import React, { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { User, Plus, X, UserCircle2, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface AccountSwitcherProps {
    isModal?: boolean;
    onClose?: () => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ isModal, onClose }) => {
    const { settings } = useSettingsStore();
    const { user, setUser, setAuthenticated } = useUserStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState<string | null>(null);

    // If used as a modal, it's always "open"
    const actualOpen = isModal || isOpen;

    const handleSwitch = async (id: string) => {
        if (id === user?.id || isSwitching) return;
        
        setIsSwitching(id);
        const res = await window.electronAPI.selectAccount(id);
        
        if (res.success && res.data?.user) {
            // Update the global user store immediately
            setUser(res.data.user);
            setAuthenticated(true);
            
            // Refresh settings store with latest accounts & selected flag
            const settingsRes = await window.electronAPI.getSettings();
            if (settingsRes.success && settingsRes.data) {
                useSettingsStore.getState().setSettings(settingsRes.data);
            }
            
            setIsOpen(false);
            if (onClose) onClose();
        } else {
            // Notify user of failure using native dialog
            await window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Changement de compte',
                message: res.error || 'Échec du changement de compte.'
            });
        }
        setIsSwitching(null);
    };

    const handleRemove = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const res = await window.electronAPI.removeAccount(id);
        if (res.success) {
            const updatedAccounts = settings.accounts?.filter(a => a.id !== id) || [];
            useSettingsStore.getState().updateSetting('accounts', updatedAccounts);
        }
    };

    const switcherContent = (
        <div 
            className="glass-card animate-slide-up"
            style={{ 
                position: isModal ? 'relative' : 'absolute', 
                left: isModal ? '0' : '60px', 
                bottom: isModal ? '0' : '-10px', 
                width: isModal ? '100%' : '280px', 
                padding: '20px',
                zIndex: 1000,
                boxShadow: isModal ? 'none' : '0 20px 60px rgba(0,0,0,0.9)',
                border: isModal ? 'none' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                background: isModal ? 'transparent' : '#0d0d14',
                backdropFilter: 'none'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserCircle2 size={16} color="var(--accent)" />
                    <h3 style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Sélecteur d'Alts</h3>
                </div>
                {!isModal && (
                    <X size={14} color="var(--text-dim)" style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="hover-danger" onClick={() => setIsOpen(false)} />
                )}
                {isModal && onClose && (
                    <X size={14} color="var(--text-dim)" style={{ cursor: 'pointer' }} onClick={onClose} />
                )}
            </div>

            <div className="custom-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {settings.accounts?.map(acc => (
                    <div 
                        key={acc.id}
                        onClick={() => handleSwitch(acc.id)}
                        className={`alt-account-item ${isSwitching === acc.id ? 'pulse-opacity' : ''}`}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '12px', 
                            borderRadius: '12px',
                            background: acc.id === user?.id ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
                            border: '1px solid',
                            borderColor: acc.id === user?.id ? 'var(--accent)' : 'transparent',
                            cursor: isSwitching ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden',
                            opacity: (isSwitching && isSwitching !== acc.id) ? 0.5 : 1
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: '#222', position: 'relative' }}>
                            {acc.avatarURL ? <img src={acc.avatarURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} />}
                            {isSwitching === acc.id && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RefreshCw size={14} className="animate-spin" color="var(--accent)" />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.username}</p>
                            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '600' }}>#{acc.tag || 'Alt'}</p>
                        </div>
                        {acc.id === user?.id ? (
                            <Check size={14} color="var(--accent)" strokeWidth={3} />
                        ) : (
                            !isSwitching && (
                                <X 
                                    size={14} 
                                    className="remove-acc-btn"
                                    onClick={(e) => handleRemove(e, acc.id)}
                                    style={{ color: 'var(--danger)', opacity: 0.4, transition: 'all 0.2s' }} 
                                />
                            )
                        )}
                    </div>
                ))}
            </div>

            <button 
                className="btn-primary"
                style={{ marginTop: '5px', height: '40px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', borderRadius: '10px' }}
                onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-add-account'));
                    setIsOpen(false);
                    if (onClose) onClose();
                }}
            >
                <Plus size={16} strokeWidth={3} />
                AJOUTER UN COMPTE
            </button>
        </div>
    );

    if (isModal) return switcherContent;

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Tooltip text="Gestion des Comptes">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`nav-button ${isOpen ? 'active' : ''}`}
                    style={{ 
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isOpen ? 'scale(1.1)' : 'scale(1)',
                        borderColor: isOpen ? 'var(--accent)' : 'transparent',
                        boxShadow: isOpen ? '0 0 20px rgba(var(--accent-rgb), 0.3)' : 'none'
                    }}
                >
                    <UserCircle2 size={24} strokeWidth={2} />
                    {settings.accounts?.length > 1 && (
                        <div style={{
                            position: 'absolute', top: '10px', right: '10px',
                            width: '8px', height: '8px', background: 'var(--accent)',
                            borderRadius: '50%', border: '2px solid var(--bg-sidebar)'
                        }}></div>
                    )}
                </button>
            </Tooltip>

            {isOpen && switcherContent}
        </div>
    );
};
