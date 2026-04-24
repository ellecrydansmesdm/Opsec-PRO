import React, { useState } from 'react';
import { Sparkles, Palette, Monitor, RefreshCw, Upload, Trash2, MousePointer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Animations } from '@/pages/Animations';
import { useSettingsStore } from "@/store/useSettingsStore";

export const VisualHub = () => {
    const { settings, updateSetting } = useSettingsStore();
    const [activeSubTab, setActiveSubTab] = useState<'theme' | 'identity'>('theme');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const tabs = [
        { id: 'theme', name: 'INTERFACE', icon: Palette, desc: 'Wallpapers & UI Effects' },
        { id: 'identity', name: 'IDENTITY FX', icon: RefreshCw, desc: 'Profile Rotator & RPC' },
    ];

    const handleLocalUpload = async () => {
        try {
            const res = await (window as any).electronAPI.selectFile();
            if (res.success && res.data) {
                const filePath = res.data;
                const protocolUrl = `local-resource://${filePath.replace(/\\/g, '/')}`;
                setPreviewUrl(protocolUrl);
                setPendingImage(filePath);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const applyWallpaper = async () => {
        if (!pendingImage) return;
        setIsApplying(true);
        try {
            const res = await (window as any).electronAPI.wallpaperUpload(pendingImage);
            if (res.success) {
                updateSetting('themeBackground', res.data);
                setPendingImage(null);
                setPreviewUrl(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="animate-fade-in custom-scrollbar" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '15px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '14px', color: '#a855f7', boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' }}>
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px' }}>Visual Hub</h2>
                        <p className="caption" style={{ opacity: 0.5 }}>PERSONNALISATION & EFFETS D'IDENTITÉ</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeSubTab === tab.id ? '#a855f7' : 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                transition: '0.3s',
                                fontWeight: 'bold',
                                fontSize: '11px'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
                <AnimatePresence mode="wait">
                    {activeSubTab === 'theme' ? (
                        <motion.div
                            key="theme"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="glass-card"
                            style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    <div>
                                        <label className="caption" style={{ marginBottom: '10px', display: 'block' }}>FOND D'ÉCRAN DYNAMIQUE</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input 
                                                className="input-field" 
                                                placeholder="Lien Image (Web) ou Fichier Local..." 
                                                value={pendingImage || settings.themeBackground || ''} 
                                                onChange={(e) => setPendingImage(e.target.value)}
                                            />
                                            <button className="btn-glass" onClick={handleLocalUpload}><Upload size={18} /></button>
                                        </div>
                                        {pendingImage && (
                                            <button 
                                                className="btn-primary" 
                                                style={{ width: '100%', marginTop: '10px' }}
                                                onClick={applyWallpaper}
                                                disabled={isApplying}
                                            >
                                                {isApplying ? 'APPLICATION...' : 'APPLIQUER LE FOND'}
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label className="caption">INTENSITÉ DU FLOU ({settings.themeBlur || 0}px)</label>
                                        <input 
                                            type="range" min="0" max="50" step="1"
                                            value={settings.themeBlur || 0}
                                            onChange={(e) => updateSetting('themeBlur', parseInt(e.target.value))}
                                            style={{ width: '100%', accentColor: '#a855f7' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="caption">OPACITÉ DE L'INTERFACE ({Math.round((settings.themeOpacity || 0.8) * 100)}%)</label>
                                        <input 
                                            type="range" min="0.1" max="1" step="0.05"
                                            value={settings.themeOpacity || 0.8}
                                            onChange={(e) => updateSetting('themeOpacity', parseFloat(e.target.value))}
                                            style={{ width: '100%', accentColor: '#a855f7' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <MousePointer size={20} color="#a855f7" />
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Cyber Cursor Pro</div>
                                                <div style={{ fontSize: '11px', opacity: 0.5 }}>Curseur personnalisé Opsec</div>
                                            </div>
                                        </div>
                                        <div 
                                            className={`mini-toggle ${settings.cyberCursorEnabled ? 'on' : 'off'}`}
                                            onClick={() => updateSetting('cyberCursorEnabled', !settings.cyberCursorEnabled)}
                                        >
                                            {settings.cyberCursorEnabled ? 'ACTIF' : 'OFF'}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="caption">APERÇU DES VISUELS</label>
                                    <div style={{ 
                                        width: '100%', 
                                        aspectRatio: '16/9', 
                                        borderRadius: '16px', 
                                        background: 'black', 
                                        overflow: 'hidden', 
                                        border: '1px solid var(--border)',
                                        position: 'relative'
                                    }}>
                                        <img 
                                            src={previewUrl || settings.themeBackground || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${settings.themeBlur || 0}px)` }} 
                                        />
                                        <div style={{ position: 'absolute', inset: '20%', background: `rgba(255,255,255,${(settings.themeOpacity || 0.8) * 0.2})`, backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.5 }}>INTERFACE PREVIEW</span>
                                        </div>
                                    </div>
                                    {settings.themeBackground && (
                                        <button 
                                            className="btn-glass" 
                                            style={{ width: '100%', marginTop: '15px', color: 'var(--danger)' }}
                                            onClick={() => updateSetting('themeBackground', '')}
                                        >
                                            <Trash2 size={16} /> SUPPRIMER LE FOND
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="identity"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <Animations />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <style>{`
                .mini-toggle { 
                    padding: 6px 15px; border-radius: 8px; font-size: 10px; font-weight: 900; 
                    cursor: pointer; transition: all 0.2s;
                }
                .mini-toggle.on { background: rgba(168, 85, 247, 0.2); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); }
                .mini-toggle.off { background: rgba(255,255,255,0.05); color: var(--text-dim); border: 1px solid transparent; }
            `}</style>
        </div>
    );
};
