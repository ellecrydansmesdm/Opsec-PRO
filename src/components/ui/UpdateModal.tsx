import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Clock, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

const MotionDiv = motion.div as any;

export interface UpdateData {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    releaseNotes?: string;
    publishedAt?: string;
}

interface UpdateModalProps {
    updateInfo: UpdateData | null;
    onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
    const { settings } = useSettingsStore();
    const isFr = settings.language === 'fr';

    if (!updateInfo || !updateInfo.updateAvailable) return null;

    const handleDismissLater = () => {
        try {
            if (updateInfo.latestVersion) {
                localStorage.setItem('opsec_dismissed_update', updateInfo.latestVersion);
            }
        } catch (_) {}
        onClose();
    };

    const handleUpdateNow = async () => {
        try {
            if (updateInfo.latestVersion) {
                localStorage.setItem('opsec_dismissed_update', updateInfo.latestVersion);
            }
        } catch (_) {}

        const downloadUrl = updateInfo.downloadUrl || 'https://github.com/ellecrydansmesdm/opsec-pro/releases/latest';

        if (window.electronAPI?.installUpdateAndQuit) {
            await window.electronAPI.installUpdateAndQuit(downloadUrl);
        } else {
            window.electronAPI?.openExternal?.(downloadUrl) || window.open(downloadUrl, '_blank');
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(12px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        width: '100%',
                        maxWidth: '540px',
                        background: '#090a0f',
                        border: '1px solid rgba(0, 210, 255, 0.4)',
                        borderRadius: '20px',
                        boxShadow: '0 20px 60px rgba(0, 210, 255, 0.25)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header Banner */}
                    <div style={{
                        padding: '24px 28px',
                        background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.12) 0%, rgba(138, 43, 226, 0.12) 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: 'rgba(0, 210, 255, 0.15)',
                            border: '1px solid var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Sparkles size={24} color="var(--accent)" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    letterSpacing: '1px'
                                }}>
                                    SOFTWARE UPDATE
                                </span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                                {isFr ? 'Nouvelle version disponible !' : 'New Update Available!'}
                            </h2>
                        </div>
                    </div>

                    {/* Version Badges */}
                    <div style={{
                        padding: '20px 28px 12px 28px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            padding: '12px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                                {isFr ? 'VERSION ACTUELLE' : 'CURRENT VERSION'}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dim)' }}>
                                {updateInfo.currentVersion}
                            </span>
                        </div>

                        <div style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '18px' }}>
                            →
                        </div>

                        <div style={{
                            background: 'rgba(0, 210, 255, 0.08)',
                            border: '1px solid var(--accent)',
                            borderRadius: '12px',
                            padding: '12px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                                {isFr ? 'NOUVELLE VERSION' : 'NEW VERSION'}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>
                                {updateInfo.latestVersion}
                            </span>
                        </div>
                    </div>

                    {/* Release Notes / Changelog */}
                    <div style={{ padding: '0 28px 20px 28px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.6, marginBottom: '8px', display: 'block' }}>
                            {isFr ? 'NOTES DE MISE À JOUR (CHANGELOG)' : 'RELEASE NOTES & CHANGELOG'}
                        </label>
                        <div style={{
                            maxHeight: '160px',
                            overflowY: 'auto',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            padding: '14px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.85)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {updateInfo.releaseNotes || (isFr ? 'Améliorations générales et corrections de stabilité.' : 'General performance improvements and bug fixes.')}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        padding: '16px 28px 24px 28px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            type="button"
                            onClick={handleDismissLater}
                            className="btn-secondary"
                            style={{
                                height: '44px',
                                padding: '0 20px',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Clock size={15} />
                            {isFr ? 'Plus tard' : 'Later'}
                        </button>

                        <button
                            type="button"
                            onClick={handleUpdateNow}
                            className="btn-primary"
                            style={{
                                height: '44px',
                                padding: '0 24px',
                                fontSize: '12px',
                                fontWeight: '900',
                                background: 'var(--accent)',
                                boxShadow: '0 0 20px var(--accent-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Download size={15} />
                            {isFr ? 'Télécharger & Fermer pour installer' : 'Download & Close to Install'}
                        </button>
                    </div>
                </MotionDiv>
            </div>
        </AnimatePresence>
    );
};
