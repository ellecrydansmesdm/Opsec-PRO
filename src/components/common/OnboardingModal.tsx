import React, { useState, useEffect } from 'react';
import { 
    Command, Terminal, Shield, Cpu, ArrowRight, ArrowLeft, 
    Check, X, Sparkles, Layers, Radio, Lock, Zap, ExternalLink,
    Copy, Volume2, RotateCcw, Activity
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenCommandPalette?: () => void;
    onNavigateTab?: (tab: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
    isOpen, 
    onClose, 
    onOpenCommandPalette,
    onNavigateTab 
}) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    const [currentStep, setCurrentStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                handleClose();
            } else if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else if (e.key === 'ArrowLeft' && currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStep]);

    const handleClose = () => {
        if (dontShowAgain) {
            try {
                localStorage.setItem('opsec_onboarding_completed', 'true');
            } catch (_) {}
        }
        onClose();
    };

    const steps = [
        {
            id: 'palette',
            tag: 'CORE_NAV',
            titleFr: 'Command Palette Universelle',
            titleEn: 'Universal Command Palette',
            subtitleFr: 'Votre centre de commande instantané (Ctrl+K)',
            subtitleEn: 'Your instant nerve center (Ctrl+K)',
            icon: Command,
            accentColor: '#00ffcc',
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>
                        {isFr 
                            ? 'Accédez à toutes les fonctions d\'Opsec PRO en une fraction de seconde sans quitter votre flux de travail.' 
                            : 'Access every Opsec PRO capability in milliseconds without interrupting your workflow.'}
                    </p>

                    <div style={{
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid rgba(0, 255, 204, 0.25)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Terminal size={16} color="#00ffcc" />
                                <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', color: '#fff' }}>
                                    SHORTCUT: Ctrl + K / Cmd + K
                                </span>
                            </div>
                            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#00ffcc', background: 'rgba(0, 255, 204, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                SPOTLIGHT
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                                <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>• Navigation :</span> Dashboard, Moteurs, Logs
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                                <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>• Actions :</span> Rollback de profil, Statut DND
                            </div>
                        </div>

                        {onOpenCommandPalette && (
                            <button
                                onClick={() => {
                                    handleClose();
                                    setTimeout(() => onOpenCommandPalette(), 150);
                                }}
                                className="btn-secondary"
                                style={{
                                    height: '36px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Zap size={13} color="#00ffcc" />
                                {isFr ? 'Tester la Command Palette maintenant' : 'Test Command Palette now'}
                            </button>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'inchat',
            tag: 'DISPATCHER',
            titleFr: 'Dispatcher In-Chat & Furtivité',
            titleEn: 'In-Chat Stealth Dispatcher',
            subtitleFr: 'Pilotez votre compte avec suppression zero-trace',
            subtitleEn: 'Control your account with zero-trace deletion',
            icon: Terminal,
            accentColor: 'var(--accent)',
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>
                        {isFr 
                            ? 'Exécutez plus de 31 commandes directement dans vos salons et conversations Discord.' 
                            : 'Execute 31+ commands directly inside your Discord channels and conversations.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* DM protocol */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                    [MP / DIRECT MESSAGES]
                                </span>
                                <span style={{ fontSize: '10px', opacity: 0.5 }}>100% Instant</span>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff' }}>
                                <code>.help</code> • <code>.fake stream Opsec</code> • <code>.status AFK</code>
                            </div>
                        </div>

                        {/* Server protocol */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(0, 255, 128, 0.2)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#00ff80', fontFamily: 'monospace' }}>
                                    [SERVEURS / GUILDS]
                                </span>
                                <span style={{ fontSize: '10px', color: '#00ff80', opacity: 0.8 }}>Relai Gateway forcé</span>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff' }}>
                                <code>@Moi .purge 20</code> • <code>@Moi .hypesquad leave</code>
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                {isFr ? 'Ajoutez votre mention pour que Discord transmette le message à votre session.' : 'Add your mention so Discord routes the packet to your background session.'}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'engine',
            tag: 'AUTOMATION',
            titleFr: 'Moteurs d\'Automatisation & Audio',
            titleEn: 'Automation Engines & Audio',
            subtitleFr: 'Macros, Rollback de profil et Vocal 24/7 DAVE MLS',
            subtitleEn: 'Macros, Profile Snapshots and 24/7 Voice DAVE MLS',
            icon: Layers,
            accentColor: '#a855f7',
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>
                        {isFr 
                            ? 'Automatisez vos opérations quotidiennes avec des garde-fous stricts et une réversibilité totale.' 
                            : 'Automate daily workflows with strict security rate-limits and full rollback capability.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <RotateCcw size={14} color="#a855f7" />
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>Macro Snapshots</span>
                            </div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                                {isFr ? 'Capture l\'état initial de votre compte avant toute modification pour un rollback parfait.' : 'Captures initial account state before any scenario for clean restoration.'}
                            </p>
                        </div>

                        <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <Volume2 size={14} color="#a855f7" />
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>Vocal 24/7 DAVE</span>
                            </div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                                {isFr ? 'Streaming audio continu avec chiffrement E2EE MLS et reconnexion exponentielle.' : 'Continuous audio streaming with E2EE MLS encryption and exponential backoff.'}
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'network',
            tag: 'SECURITY_2026',
            titleFr: 'Réseau, Proxies & JA4 Stealth',
            titleEn: 'Network, Proxies & JA4 Stealth',
            subtitleFr: 'Isolation 1:1 et résolution de challenges',
            subtitleEn: '1:1 Isolation and challenge resolvers',
            icon: Lock,
            accentColor: '#ffd700',
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>
                        {isFr 
                            ? 'Configurez votre infrastructure réseau pour une furtivité totale face aux heuristiques anti-bot.' 
                            : 'Configure your network infrastructure for complete evasion against anti-bot heuristics.'}
                    </p>

                    <div style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                    }}>
                        <div style={{ color: '#ffd700', fontWeight: 'bold' }}>[RÈGLES D'OR OPSEC]</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>• Associez 1 proxy résidentiel fixe par compte (SOCKS5h)</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>• Renseignez une clé Capsolver pour bypass hCaptcha & Turnstile</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>• Empreinte TLS 1.3 JA4 Chromium synchronisée automatiquement</div>
                    </div>
                </div>
            )
        }
    ];

    if (!isOpen) return null;

    const current = steps[currentStep];
    const IconComponent = current.icon;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.78)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
        }}>
            <div className="modal-content animate-slide-up" style={{
                width: '100%',
                maxWidth: '620px',
                background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 14, 23, 0.98) 100%)',
                border: `1px solid color-mix(in srgb, ${current.accentColor} 30%, rgba(255,255,255,0.1))`,
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px color-mix(in srgb, ${current.accentColor} 15%, transparent)`,
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
            }}>
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        transition: '0.2s'
                    }}
                >
                    <X size={16} />
                </button>

                {/* Header with Segmented Step Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Step Progress Bar */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {steps.map((s, idx) => (
                            <div
                                key={s.id}
                                onClick={() => setCurrentStep(idx)}
                                style={{
                                    flex: 1,
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: idx === currentStep 
                                        ? current.accentColor 
                                        : idx < currentStep 
                                            ? 'rgba(255, 255, 255, 0.4)' 
                                            : 'rgba(255, 255, 255, 0.08)',
                                    boxShadow: idx === currentStep ? `0 0 10px ${current.accentColor}` : 'none',
                                    cursor: 'pointer',
                                    transition: '0.3s'
                                }}
                            />
                        ))}
                    </div>

                    {/* Step Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: `color-mix(in srgb, ${current.accentColor} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${current.accentColor} 30%, transparent)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <IconComponent size={24} color={current.accentColor} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '900', color: current.accentColor, letterSpacing: '1px' }}>
                                    [{current.tag}] • ÉTAPE 0{currentStep + 1}/0{steps.length}
                                </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                                {isFr ? current.titleFr : current.titleEn}
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
                                {isFr ? current.subtitleFr : current.subtitleEn}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step Body Content */}
                <div style={{ minHeight: '170px' }}>
                    {current.content}
                </div>

                {/* Footer Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    {/* Don't show again checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            style={{ accentColor: current.accentColor, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {isFr ? 'Ne plus afficher au démarrage' : 'Don\'t show on startup'}
                        </span>
                    </label>

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="btn-secondary"
                                style={{
                                    height: '38px',
                                    padding: '0 16px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <ArrowLeft size={13} />
                                {isFr ? 'Précédent' : 'Previous'}
                            </button>
                        )}

                        {currentStep < steps.length - 1 ? (
                            <button
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                className="btn-primary"
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    borderRadius: '10px',
                                    background: current.accentColor,
                                    color: '#000',
                                    boxShadow: `0 0 20px color-mix(in srgb, ${current.accentColor} 30%, transparent)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isFr ? 'Suivant' : 'Next'}
                                <ArrowRight size={13} />
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="btn-primary"
                                style={{
                                    height: '38px',
                                    padding: '0 22px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    borderRadius: '10px',
                                    background: '#00ff80',
                                    color: '#000',
                                    boxShadow: '0 0 25px rgba(0, 255, 128, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Check size={14} />
                                {isFr ? 'Terminer l\'initiation' : 'Finish onboarding'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
