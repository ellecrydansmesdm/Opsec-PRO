import React from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * Wallpaper v3 — Glassmorphism Architecture
 * 
 * Layer stack (bottom to top):
 *   1. Wallpaper Image (brightness dimmed + user blur)
 *   2. UI Containers (glassmorphism panels — translucent, not opaque)
 * 
 * NO heavy dark overlay. Instead, the image itself is dimmed via CSS brightness
 * and the UI panels use backdrop-filter blur for readability.
 */
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

    const blurValue = settings.themeBlur || 0;

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
            {/* Single layer: Wallpaper with brightness dimming + user blur */}
            <img 
                src={settings.themeBackground} 
                alt="" 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: `brightness(0.75) blur(${blurValue}px)`,
                    // Compensate blur edge bleeding
                    transform: blurValue > 0 ? 'scale(1.05)' : 'none',
                }}
                onError={() => {
                   console.error('[WALLPAPER] Erreur: Impossible de charger l\'image de fond:', settings.themeBackground);
                }}
                onLoad={() => {
                   console.log('[WALLPAPER] Fond d\'écran chargé avec succès');
                }}
            />
        </div>
    );
};
