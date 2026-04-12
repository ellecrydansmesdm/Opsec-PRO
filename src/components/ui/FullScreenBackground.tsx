import React from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

export const FullScreenBackground: React.FC = () => {
    const { settings } = useSettingsStore();

    if (!settings.themeBackground) return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#04040a',
            zIndex: -2,
            pointerEvents: 'none'
        }} />
    );

    return (
        <div 
            className="app-background"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: -2,
                pointerEvents: 'none',
                transition: 'all 0.5s ease'
            }}
        >
            <img 
                src={settings.themeBackground} 
                alt="" 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: `blur(${settings.themeBlur || 0}px)`,
                }}
                onError={() => {
                   console.error('[WALLPAPER] Erreur: Impossible de charger l\'image de fond:', settings.themeBackground);
                }}
                onLoad={() => {
                   console.log('[WALLPAPER] Fond d\'écran chargé avec succès');
                }}
            />
            {/* Soft dark overlay to ensure legibility */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(5, 5, 10, 0.4)',
                zIndex: -1
            }} />
        </div>
    );
};
