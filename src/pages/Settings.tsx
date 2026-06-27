import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Monitor, Palette, Globe, Save, RefreshCw, Music, Volume2, Upload, MousePointer, Code, AppWindow, Users, Image as ImageIcon, Trash2, Plus, Sparkles } from 'lucide-react';
import { audioService } from '@/services/AudioService';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { IdentitySettings } from './IdentitySettings';
import { LanyardDevCard } from '@/components/ui/LanyardDevCard';

import { Notification } from '@/components/ui/Notification';

export const Settings = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const [activeSubTab, setActiveSubTab] = useState<'General' | 'Visual' | 'Identity' | 'Accounts'>('General');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    // Migration: Clear hardcoded absolute paths that are not protocols
    if (settings.themeBackground && 
       (settings.themeBackground.includes(':\\') || settings.themeBackground.includes('Users/')) && 
       !settings.themeBackground.startsWith('opsec://') && 
       !settings.themeBackground.startsWith('local-resource://') &&
       !settings.themeBackground.startsWith('http')
    ) {
      console.log('[MIGRATION] Resetting invalid absolute path:', settings.themeBackground);
      updateSetting('themeBackground', '');
    }
  }, []);

  const t = {
    fr: {
      title: "Configuration",
      description: "Personnalisez votre instance Opsec PRO",
      general: "GÉNÉRAL",
      visual: "VISUEL",
      identity: "IDENTITÉ",
      accounts: "COMPTES",
      security: "Sécurité & Base",
      silentMode: "Mode Silencieux",
      silentDesc: "Le bot n'envoie pas de confirmations. Seules les erreurs critiques s'affichent.",
      autoLogin: "Auto-Login",
      autoLoginDesc: "Se connecte automatiquement au démarrage.",
      appDetection: "Détection d'Apps",
      appDetectionDesc: "Permet au bot de détecter vos jeux pour votre statut.",
      sentinelMode: "Sentinel Duo (Anti-Kick)",
      sentinelDesc: "Autorise la protection anti-kick des groupes DM dans Raid Hub → Network Pro.",
      language: "Langue",
      wallpaper: "Fond d'écran & Design",
      wallpaperUrl: "URL Wallpaper",
      blurIntensity: "Intensité du Flou",
      opacity: "Opacité UI",
      accountMgmt: "Gestion des Comptes",
      addAccount: "Ajouter un compte",
      active: "ACTIF",
      shortcuts: "Raccourcis",
      devCredit: "CRÉÉ PAR FAHD",
      helpText: "contactez @ellecrydansmesdm"
    },
    en: {
      title: "Configuration",
      description: "Customize your Opsec PRO instance",
      general: "GENERAL",
      visual: "VISUAL",
      identity: "IDENTITY",
      accounts: "ACCOUNTS",
      security: "Security & Core",
      silentMode: "Silent Mode",
      silentDesc: "No confirmation messages. Only critical errors.",
      autoLogin: "Auto-Login",
      autoLoginDesc: "Connect automatically on startup.",
      appDetection: "App Detection",
      appDetectionDesc: "Detect active games for your status.",
      sentinelMode: "Sentinel Duo (Anti-Kick)",
      sentinelDesc: "Allows DM group anti-kick protection in Raid Hub → Network Pro.",
      language: "Language",
      wallpaper: "Wallpaper & Design",
      wallpaperUrl: "Wallpaper URL",
      blurIntensity: "Blur Intensity",
      opacity: "UI Opacity",
      accountMgmt: "Account Management",
      addAccount: "Add Account",
      active: "ACTIVE",
      shortcuts: "Shortcuts",
      devCredit: "DEV BY FAHD",
      helpText: "dm @ellecrydansmesdm"
    }
  }[settings.language || 'fr'];

  const showToast = (message: string, type: 'success' | 'danger') => {
    setToast({ message, type });
    audioService.play(type === 'danger' ? 'notif_important' : 'notif_normal');
    setTimeout(() => setToast(null), 3000);
  };

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
      showToast('Erreur lors du choix du fichier', 'danger');
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
        showToast('Fond d\'écran appliqué !', 'success');
      }
    } catch (err) {
      showToast('Erreur de sauvegarde', 'danger');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveAccount = async (id: string | number) => {
    const res = await window.electronAPI.removeAccount(id as string);
    if (res.success) {
      const updated = settings.accounts?.filter(a => a.id !== id) || [];
      updateSetting('accounts', updated);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '10px 20px 30px 10px' }}>
      <style>{`
        .settings-item-row {
            transition: all 0.2s ease-in-out;
            background: rgba(255,255,255,0.01) !important;
            border: 1.5px solid rgba(255,255,255,0.03) !important;
            margin-bottom: 5px;
        }
        .settings-item-row:hover {
            background: rgba(255,255,255,0.02) !important;
            border-color: rgba(255,255,255,0.08) !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .settings-select {
            background: rgba(0,0,0,0.45) !important;
            border: 1.5px solid rgba(255,255,255,0.08) !important;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            outline: none;
            transition: all 0.2s;
            cursor: pointer;
        }
        .settings-select:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 8px var(--accent-glow) !important;
        }
        .settings-card-glow {
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            border: 1.5px solid rgba(255,255,255,0.04) !important;
            background: rgba(255,255,255,0.01) !important;
        }
        
        /* Premium Tab Buttons */
        .settings-tab-btn {
            background: transparent;
            border: 1px solid transparent;
            color: #949ba4;
            padding: 10px 22px;
            font-size: 11px;
            font-weight: 800;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            outline: none;
        }
        .settings-tab-btn:hover {
            color: white;
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.05);
        }
        .settings-tab-btn.active {
            color: white;
            background: linear-gradient(135deg, var(--accent) 0%, rgba(var(--accent-rgb), 0.5) 100%);
            border-color: var(--accent);
            box-shadow: 0 0 15px var(--accent-glow);
        }

        /* Monitor Mockup styling */
        .monitor-mockup {
            width: 100%;
            background: #0f1012;
            border: 10px solid #27282e;
            border-radius: 12px;
            border-bottom-width: 14px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.65), inset 0 2px 5px rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .monitor-screen {
            aspect-ratio: 16/9;
            background: #111214;
            position: relative;
            overflow: hidden;
        }
        .monitor-screen img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: filter 0.3s;
        }
        .monitor-stand {
            width: 50px;
            height: 12px;
            background: #27282e;
            margin: 0 auto;
            border-radius: 0 0 4px 4px;
        }
        .monitor-base {
            width: 110px;
            height: 4px;
            background: #191b1f;
            margin: 0 auto;
            border-radius: 4px 4px 0 0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        /* Cybernetic Cursor Import Grid */
        .cyber-grid-container {
            background: rgba(0, 0, 0, 0.4);
            border: 1px dashed rgba(0, 210, 255, 0.3);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            transition: all 0.3s;
            cursor: pointer;
        }
        .cyber-grid-container:hover {
            border-color: var(--accent);
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.1);
        }
        .cyber-grid-bg {
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(rgba(0, 210, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 210, 255, 0.03) 1px, transparent 1px);
            background-size: 15px 15px;
            background-position: center;
            opacity: 0.8;
            pointer-events: none;
        }

        /* Hologram Identity Cards (Accounts) */
        .hologram-id-card {
            background: rgba(255, 255, 255, 0.01) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 16px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .hologram-id-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                45deg,
                transparent 45%,
                rgba(255, 255, 255, 0.03) 50%,
                transparent 55%
            );
            transform: rotate(-45deg);
            transition: transform 0.6s ease;
            pointer-events: none;
        }
        .hologram-id-card:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.35) !important;
            background: rgba(255, 255, 255, 0.02) !important;
        }
        .hologram-id-card:hover::before {
            transform: translate(50%, 50%) rotate(-45deg);
        }
        .hologram-id-card.active {
            border-color: var(--accent) !important;
            background: rgba(0, 210, 255, 0.05) !important;
            box-shadow: 0 0 20px rgba(0, 210, 255, 0.12) !important;
            animation: card-glow-pulse 3s infinite alternate;
        }
        @keyframes card-glow-pulse {
            0% { box-shadow: 0 0 12px rgba(0, 210, 255, 0.06); }
            100% { box-shadow: 0 0 22px rgba(0, 210, 255, 0.16); border-color: rgba(0, 210, 255, 0.8) !important; }
        }
        .hologram-scanline {
            position: absolute;
            left: 0;
            right: 0;
            height: 1.5px;
            background: rgba(0, 210, 255, 0.15);
            box-shadow: 0 0 8px var(--accent);
            opacity: 0.6;
            animation: hologram-scan 4s linear infinite;
            pointer-events: none;
        }
        @keyframes hologram-scan {
            0% { top: -2%; }
            100% { top: 102%; }
        }
      `}</style>

      {toast && (
        <Notification 
          message={toast.message} 
          type={toast.type === 'danger' ? 'error' : 'success'} 
          onClose={() => setToast(null)} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
        <div>
           <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: 'white' }}>{t.title} <span style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>Pro</span></h1>
           <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '5px', fontWeight: '700' }}>{t.description}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '35px', padding: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', width: 'fit-content', border: '1px solid var(--border)' }}>
        {(['General', 'Visual', 'Identity', 'Accounts'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`settings-tab-btn ${activeSubTab === tab ? 'active' : ''}`}
          >
            {tab === 'General' && <Globe size={14} />}
            {tab === 'Visual' && <Palette size={14} />}
            {tab === 'Identity' && <Sparkles size={14} />}
            {tab === 'Accounts' && <Users size={14} />}
            {t[tab.toLowerCase() as keyof typeof t]}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
         {activeSubTab === 'General' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px' }}>
              <div className="glass-card settings-card-glow" style={{ padding: '30px', borderRadius: '18px' }}>
                 <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <Shield size={20} color="var(--accent)" /> {t.security}
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ maxWidth: '80%' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{t.silentMode}</p>
                          <p className="caption" style={{ opacity: 0.5, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.silentDesc}</p>
                       </div>
                       <div onClick={() => updateSetting('silentMode', !settings.silentMode)} className={`nighty-toggle ${settings.silentMode ? 'active' : ''}`}>
                          <div className="nighty-toggle-handle"></div>
                       </div>
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ maxWidth: '80%' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{t.autoLogin}</p>
                          <p className="caption" style={{ opacity: 0.5, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.autoLoginDesc}</p>
                       </div>
                       <div onClick={() => updateSetting('autoLogin', !settings.autoLogin)} className={`nighty-toggle ${settings.autoLogin ? 'active' : ''}`}>
                          <div className="nighty-toggle-handle"></div>
                       </div>
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ maxWidth: '80%' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{t.sentinelMode}</p>
                          <p className="caption" style={{ opacity: 0.5, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.sentinelDesc}</p>
                       </div>
                       <div onClick={() => updateSetting('sentinelEnabled', !settings.sentinelEnabled)} className={`nighty-toggle ${settings.sentinelEnabled ? 'active' : ''}`} style={{ '--accent': '#ff4444' } as React.CSSProperties}>
                          <div className="nighty-toggle-handle"></div>
                       </div>
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                       <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{t.language}</p>
                       <select value={settings.language} onChange={e => updateSetting('language', e.target.value as 'fr' | 'en')} className="settings-select">
                          <option value="fr">Français (FR)</option>
                          <option value="en">English (US)</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="glass-card settings-card-glow" style={{ padding: '30px', borderRadius: '18px' }}>
                 <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <Volume2 size={20} color="var(--accent)" /> AUDIO & UX SENSITIERS
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ maxWidth: '80%' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Effets Sonores UI</p>
                          <p className="caption" style={{ opacity: 0.5, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>Activer les sons pour les clics et notifications.</p>
                       </div>
                       <div onClick={() => {
                           updateSetting('audioEnabled', !settings.audioEnabled);
                       }} className={`nighty-toggle ${settings.audioEnabled ? 'active' : ''}`}>
                          <div className="nighty-toggle-handle"></div>
                       </div>
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Volume Global</p>
                          <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{Math.round((settings.audioVolume || 0) * 100)}%</p>
                       </div>
                       <input type="range" min="0" max="1" step="0.01" value={settings.audioVolume || 0} onChange={(e) => updateSetting('audioVolume', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>
                 </div>
              </div>
            </div>
         )}

         {activeSubTab === 'Visual' && (
            <div className="glass-card settings-card-glow animate-slide-right" style={{ padding: '30px', borderRadius: '18px' }}>
               <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <Palette size={20} color="#a855f7" /> {t.wallpaper}
               </h3>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '40px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   {/* Monitor Mockup Screen */}
                   <div className="monitor-mockup">
                     <div className="monitor-screen">
                       <img 
                          src={previewUrl || settings.themeBackground || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'} 
                          alt="" 
                          style={{ filter: `blur(${settings.themeBlur || 0}px)` }} 
                       />
                       <div style={{ position: 'absolute', inset: '15%', background: `rgba(255,255,255,${(settings.themeOpacity || 0.8) * 0.15})`, backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4, letterSpacing: '2px', color: 'white' }}>PREVIEW</span>
                       </div>
                     </div>
                     <div className="monitor-stand"></div>
                     <div className="monitor-base"></div>
                   </div>
                   <div style={{ display: 'flex', gap: '10px' }}>
                     <button className="btn-primary" style={{ flex: 1, height: '42px', fontSize: '11px', fontWeight: '800' }} onClick={handleLocalUpload}>IMPORTER UN FICHIER</button>
                     {settings.themeBackground && <button className="btn-danger" style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center', borderRadius: '10px' }} onClick={() => updateSetting('themeBackground', '')}><Trash2 size={18} /></button>}
                   </div>
                   {pendingImage && <button className="btn-primary" style={{ background: 'var(--success)', border: 'none', height: '42px', boxShadow: '0 0 15px var(--success-glow)', fontSize: '11px', fontWeight: '800' }} onClick={applyWallpaper}>SAUVEGARDER LE FOND</button>}
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="settings-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', borderRadius: '12px' }}>
                       <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.wallpaperUrl}</label>
                       <input className="input-field" placeholder="https://..." value={settings.themeBackground && !settings.themeBackground.startsWith('local-resource') ? settings.themeBackground : ''} onChange={e => updateSetting('themeBackground', e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.blurIntensity}</label>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{settings.themeBlur || 0}px</span>
                       </div>
                       <input type="range" min="0" max="25" step="1" value={settings.themeBlur || 0} onChange={e => updateSetting('themeBlur', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>
                    <div className="settings-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', borderRadius: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="caption" style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.opacity}</label>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{Math.round((settings.themeOpacity || 1) * 100)}%</span>
                       </div>
                       <input type="range" min="0.30" max="1" step="0.05" value={settings.themeOpacity || 1} onChange={e => updateSetting('themeOpacity', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                       <div className="settings-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px' }}>
                          <div>
                             <p style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Curseur Personnalisé</p>
                             <p className="caption" style={{ opacity: 0.5, textTransform: 'none', marginTop: '4px' }}>Fichier .cur ou .png (max 64×64px, redimensionné auto)</p>
                          </div>
                          <div onClick={() => updateSetting('cyberCursorEnabled', !settings.cyberCursorEnabled)} className={`nighty-toggle ${settings.cyberCursorEnabled ? 'active' : ''}`}>
                             <div className="nighty-toggle-handle"></div>
                          </div>
                       </div>
                       
                       <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          {/* Cybernetic Coordinate Grid Cursor Box */}
                          <div style={{ flex: 1 }}>
                             <div 
                                className="cyber-grid-container" 
                                onClick={async () => {
                                    try {
                                        const res = await (window as any).electronAPI.cursorImport();
                                        if (res.success && res.data) {
                                            const protocolUrl = res.data;
                                            updateSetting('customCursorUrl', protocolUrl);
                                            if (res.resized) {
                                                showToast(`Curseur redimensionné à 32×32px (original: ${res.originalSize})`, 'success');
                                            } else {
                                                showToast('Curseur importé !', 'success');
                                            }
                                        }
                                    } catch (err) {
                                        showToast('Erreur lors de l\'import', 'danger');
                                    }
                                }}
                             >
                                <div className="cyber-grid-bg"></div>
                                <div style={{ zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <MousePointer size={22} color={settings.customCursorUrl ? 'var(--accent)' : '#949ba4'} style={{ filter: settings.customCursorUrl ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none' }} />
                                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'white' }}>
                                        {settings.customCursorUrl ? 'CHANGER LE CURSEUR PERSO' : 'IMPORTER CURSEUR (.cur, .png)'}
                                    </span>
                                    <span style={{ fontSize: '8px', color: 'var(--text-dim)' }}>MAX 64×64px (AUTO-RESIZE)</span>
                                </div>
                             </div>
                          </div>
                          
                          {settings.customCursorUrl && (
                              <button 
                                  className="btn-danger" 
                                  style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center', borderRadius: '10px', flexShrink: 0 }}
                                  onClick={() => {
                                      updateSetting('customCursorUrl', '');
                                      showToast('Curseur réinitialisé', 'success');
                                  }}
                              >
                                  <Trash2 size={14} />
                              </button>
                          )}
                       </div>
                       {settings.customCursorUrl && (
                          <div style={{ fontSize: '9px', opacity: 0.4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'monospace', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                              Fichier : {settings.customCursorUrl.startsWith('data:') ? 'Curseur importé (Base64)' : settings.customCursorUrl.replace('local-resource://', '').replace('opsec://cursor/', '')}
                          </div>
                       )}
                    </div>
                 </div>
               </div>
            </div>
         )}

          {activeSubTab === 'Identity' && (
             <div className="animate-fade-in" style={{ width: '100%' }}>
                <IdentitySettings />
             </div>
          )}

         {activeSubTab === 'Accounts' && (
            <div className="glass-card settings-card-glow animate-slide-right" style={{ padding: '30px', borderRadius: '18px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                 <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                     <Users size={20} color="var(--accent)" /> {t.accountMgmt}
                 </h3>
                 <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('open-add-account'))} style={{ height: '40px', fontSize: '11px', fontWeight: '800' }}>
                    <Plus size={16} /> {t.addAccount}
                 </button>
               </div>
 
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {settings.accounts?.map(acc => {
                     const isActive = acc.id === user?.id;
                     return (
                        <div 
                            key={acc.id} 
                            className={`hologram-id-card ${isActive ? 'active' : ''}`}
                        >
                           {isActive && <div className="hologram-scanline"></div>}
                           <div style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                              {acc.avatarURL ? <img src={acc.avatarURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={24} style={{ margin: '13px', opacity: 0.3 }} />}
                           </div>
                           <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                              <p style={{ fontWeight: '800', fontSize: '14px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{acc.username.split('#')[0]}</p>
                              <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px', fontWeight: 'bold' }}>ID: {String(acc.id).substring(0, 15)}...</p>
                           </div>
                           {isActive ? (
                              <div style={{ 
                                  padding: '4px 10px', 
                                  background: 'rgba(0, 210, 255, 0.15)', 
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                  borderRadius: '8px', 
                                  fontSize: '9px', 
                                  fontWeight: '900',
                                  letterSpacing: '0.5px',
                                  zIndex: 1
                              }}>
                                  {t.active}
                              </div>
                           ) : (
                              <button 
                                  className="btn-danger" 
                                  style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', zIndex: 1 }} 
                                  onClick={() => handleRemoveAccount(acc.id)}
                              >
                                 <Trash2 size={14} />
                              </button>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
         )}
      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', paddingBottom: '20px' }}>
        <LanyardDevCard variant="horizontal" />
      </div>
    </div>
  );
};

export default Settings;
