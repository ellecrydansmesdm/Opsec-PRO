import React, { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { User, Plus, X, UserCircle2, Check, ExternalLink } from 'lucide-react';
import { Tooltip } from './Tooltip';

export const AccountSwitcher: React.FC = () => {
    const { settings } = useSettingsStore();
    const { user } = useUserStore();
    const [isOpen, setIsOpen] = useState(false);

    const handleSwitch = async (id: string) => {
        if (id === user?.id) return;
        const res = await window.electronAPI.selectAccount(id);
        if (res.success) {
            // Refresh settings store with latest accounts & selected flag
            const settingsRes = await window.electronAPI.getSettings();
            if (settingsRes.success && settingsRes.data) {
                useSettingsStore.getState().setSettings(settingsRes.data);
            }
            setIsOpen(false);
        } else {
            // Notify user of failure using native dialog
            await window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Changement de compte',
                message: res.error || 'Échec du changement de compte.'
            });
        }
    };

    const handleRemove = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const res = await window.electronAPI.removeAccount(id);
        if (res.success) {
            const updatedAccounts = settings.accounts?.filter(a => a.id !== id) || [];
            useSettingsStore.getState().updateSetting('accounts', updatedAccounts);
        }
    };

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

            {isOpen && (
                <div 
                    className="glass-card animate-slide-up"
                    style={{ 
                        position: 'absolute', 
                        left: '60px', 
                        bottom: '-10px', 
                        width: '280px', 
                        padding: '20px',
                        zIndex: 1000,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        background: '#0d0d14',
                        backdropFilter: 'none'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserCircle2 size={16} color="var(--accent)" />
                            <h3 style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Sélecteur d'Alts</h3>
                        </div>
                        <X size={14} color="var(--text-dim)" style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="hover-danger" onClick={() => setIsOpen(false)} />
                    </div>

                    <div className="custom-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {settings.accounts?.map(acc => (
                            <div 
                                key={acc.id}
                                onClick={() => handleSwitch(acc.id)}
                                className="alt-account-item"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    padding: '12px', 
                                    borderRadius: '12px',
                                    background: acc.id === user?.id ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
                                    border: '1px solid',
                                    borderColor: acc.id === user?.id ? 'var(--accent)' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: '#222' }}>
                                    {acc.avatarURL ? <img src={acc.avatarURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <p style={{ fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.username}</p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '600' }}>#{acc.tag || 'Alt'}</p>
                                </div>
                                {acc.id === user?.id ? (
                                    <Check size={14} color="var(--accent)" strokeWidth={3} />
                                ) : (
                                    <X 
                                        size={14} 
                                        className="remove-acc-btn"
                                        onClick={(e) => handleRemove(e, acc.id)}
                                        style={{ color: 'var(--danger)', opacity: 0.4, transition: 'all 0.2s' }} 
                                    />
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
                        }}
                    >
                        <Plus size={16} strokeWidth={3} />
                        AJOUTER UN COMPTE
                    </button>
                </div>
            )}
        </div>
    );
};
