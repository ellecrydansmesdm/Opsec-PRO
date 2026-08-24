import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Activity, Terminal, Shield, Play, Mic, Radio, Trash2, RotateCcw, Copy, ExternalLink, Zap } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface CommandItem {
    id: string;
    title: string;
    description: string;
    category: 'navigation' | 'presence' | 'action' | 'voice' | 'cloner';
    icon: React.ReactNode;
    keywords: string[];
    action: () => void;
}

interface CommandPaletteProps {
    onNavigate?: (tabId: string) => void;
    showToast?: (message: string, type: 'success' | 'danger') => void;
    onOpenOnboarding?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate, showToast, onOpenOnboarding }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    // Global Key Listener for Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const commands: CommandItem[] = [
        // Navigation
        {
            id: 'nav-dash',
            title: isFr ? 'Aller au Dashboard' : 'Go to Dashboard',
            description: isFr ? 'Vue d\'ensemble du compte et métriques' : 'Overview and stats',
            category: 'navigation',
            icon: <Activity size={16} color="#00ffcc" />,
            keywords: ['dashboard', 'accueil', 'home', 'stats', 'profile'],
            action: () => onNavigate?.('dashboard')
        },
        {
            id: 'nav-inchat',
            title: isFr ? 'Commandes In-Chat' : 'In-Chat Commands',
            description: isFr ? 'Gestionnaire et cheatsheet des commandes' : 'In-chat commands hub',
            category: 'navigation',
            icon: <Terminal size={16} color="#00e5ff" />,
            keywords: ['inchat', 'commands', 'snipe', 'purge', 'chat'],
            action: () => onNavigate?.('inchat')
        },
        {
            id: 'nav-macros',
            title: isFr ? 'Moteur de Macros' : 'Macro Engine',
            description: isFr ? 'Scénarios automatisés et snapshots d\'état' : 'Automation workflows and snapshots',
            category: 'navigation',
            icon: <Zap size={16} color="#ffd700" />,
            keywords: ['macro', 'scenarios', 'workflow', 'rollback'],
            action: () => onNavigate?.('macros')
        },
        {
            id: 'nav-voice',
            title: isFr ? 'Studio Vocal 24/7' : '24/7 Voice Studio',
            description: isFr ? 'Lecteur audio et auto-reconnexion vocale' : 'Voice player and 24/7 persistence',
            category: 'navigation',
            icon: <Mic size={16} color="#ff0055" />,
            keywords: ['voice', 'vocal', 'audio', 'streamer', 'radio'],
            action: () => onNavigate?.('voice')
        },
        {
            id: 'nav-cloner',
            title: isFr ? 'Cloner Déterministe' : 'Guild Cloner',
            description: isFr ? 'Sauvegardes et réplication 1:1 de serveurs' : '1:1 server backups and cloning',
            category: 'navigation',
            icon: <Copy size={16} color="#9d4edd" />,
            keywords: ['cloner', 'guild', 'backup', 'serveur', 'roles'],
            action: () => onNavigate?.('cloner')
        },
        {
            id: 'nav-logs',
            title: isFr ? 'Console & Audit' : 'Console & Audit',
            description: isFr ? 'Journal 3-tier et télémétrie de sécurité' : '3-tier security audit log',
            category: 'navigation',
            icon: <Shield size={16} color="#00ffcc" />,
            keywords: ['logs', 'console', 'audit', 'security', 'events'],
            action: () => onNavigate?.('logs')
        },

        // Quick Actions
        {
            id: 'act-rollback-profile',
            title: isFr ? 'Restaurer Profil Initial (Rollback)' : 'Restore Profile (Rollback)',
            description: isFr ? 'Restaure l\'état mémorisé avant le dernier scénario' : 'Revert to state before last macro',
            category: 'action',
            icon: <RotateCcw size={16} color="#00ffcc" />,
            keywords: ['restore', 'rollback', 'snapshot', 'reset', 'profil'],
            action: async () => {
                if (window.electronAPI?.macroRestoreSnapshot) {
                    const res = await window.electronAPI.macroRestoreSnapshot();
                    if (res?.success) {
                        showToast?.(isFr ? 'Profil d\'origine restauré !' : 'Original profile restored!', 'success');
                    } else {
                        showToast?.(res?.error || 'Erreur', 'danger');
                    }
                }
            }
        },
        {
            id: 'act-voice-leave',
            title: isFr ? 'Quitter le Salon Vocal' : 'Leave Voice Channel',
            description: isFr ? 'Déconnecte immédiatement le lecteur vocal 24/7' : 'Disconnect 24/7 voice player',
            category: 'voice',
            icon: <Mic size={16} color="#ff0055" />,
            keywords: ['voice', 'leave', 'vocal', 'quitter', 'stop'],
            action: async () => {
                if (window.electronAPI?.voiceLeave) {
                    await window.electronAPI.voiceLeave();
                    showToast?.(isFr ? 'Vocal déconnecté' : 'Voice disconnected', 'success');
                }
            }
        },
        {
            id: 'act-stop-purge',
            title: isFr ? 'Stopper la Purge' : 'Stop Purge',
            description: isFr ? 'Interrompt tout nettoyage de messages en cours' : 'Halt running message purge',
            category: 'action',
            icon: <Trash2 size={16} color="#ffaa00" />,
            keywords: ['stop', 'purge', 'interrompre', 'cancel'],
            action: async () => {
                if (window.electronAPI?.stopPurge) {
                    await window.electronAPI.stopPurge();
                    showToast?.(isFr ? 'Purge interrompue' : 'Purge stopped', 'success');
                }
            }
        },
        {
            id: 'act-stop-spam',
            title: isFr ? 'Stopper le Spam & Automatisations' : 'Stop Spam & Automations',
            description: isFr ? 'Arrête immédiatement toutes les boucles actives' : 'Halt all active spam loops',
            category: 'action',
            icon: <Zap size={16} color="#ff3366" />,
            keywords: ['stop', 'spam', 'arreter', 'halt'],
            action: async () => {
                if (window.electronAPI?.stopSpam) {
                    await window.electronAPI.stopSpam();
                    showToast?.(isFr ? 'Automatisations stoppées' : 'Automations stopped', 'success');
                }
            }
        },
        {
            id: 'act-onboarding',
            title: isFr ? 'Lancer le Guide d\'Initiation' : 'Launch Onboarding Tour',
            description: isFr ? 'Revoir le tutoriel des fonctionnalités et raccourcis' : 'Replay the features & shortcuts tutorial',
            category: 'action',
            icon: <Command size={16} color="#00ffcc" />,
            keywords: ['guide', 'tuto', 'tutoriel', 'aide', 'help', 'onboarding', 'initiation'],
            action: () => {
                onOpenOnboarding?.();
            }
        }
    ];

    const filtered = commands.filter(c => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return c.title.toLowerCase().includes(q) ||
               c.description.toLowerCase().includes(q) ||
               c.keywords.some(k => k.toLowerCase().includes(q));
    });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) {
                filtered[selectedIndex].action();
                setIsOpen(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '15vh'
            }}
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="card animate-fade-in"
                style={{
                    width: '600px',
                    maxHeight: '480px',
                    background: 'rgba(13, 16, 28, 0.95)',
                    border: '1px solid rgba(0, 255, 204, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 204, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search Bar Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <Search size={18} color="#00ffcc" style={{ opacity: 0.8 }} />
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder={isFr ? 'Rechercher une action, un module ou un statut...' : 'Search an action, module or status...'}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#ffffff',
                            fontSize: '15px',
                            fontWeight: '600',
                            fontFamily: 'inherit'
                        }}
                    />
                    <kbd style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontWeight: '800'
                    }}>ESC</kbd>
                </div>

                {/* Results List */}
                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                    {filtered.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <div 
                                key={item.id}
                                onClick={() => {
                                    item.action();
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(0, 255, 204, 0.12)' : 'transparent',
                                    border: isSelected ? '1px solid rgba(0, 255, 204, 0.25)' : '1px solid transparent',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: isSelected ? 'rgba(0, 255, 204, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? '#00ffcc' : '#ffffff' }}>
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                        {item.description}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    color: 'rgba(255, 255, 255, 0.3)'
                                }}>
                                    {item.category}
                                </span>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', fontSize: '13px' }}>
                            {isFr ? 'Aucun résultat trouvé.' : 'No commands found.'}
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.3)'
                }}>
                    <span>↑↓ {isFr ? 'Naviguer' : 'Navigate'} • ↵ {isFr ? 'Sélectionner' : 'Select'}</span>
                    <span>Opsec PRO Command Palette</span>
                </div>
            </div>
        </div>
    );
};
