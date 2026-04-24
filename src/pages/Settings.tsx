import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Monitor, Palette, Globe, Save, RefreshCw, Music, Volume2, Upload, MousePointer, Code, AppWindow, Users, Image as ImageIcon, Trash2, Plus, Sparkles } from 'lucide-react';
import { audioService } from '@/services/AudioService';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { Animations } from './Animations';

export const Settings = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const [activeSubTab, setActiveSubTab] = useState<'General' | 'Visual' | 'Identity' | 'Accounts'>('General');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [devAvatar, setDevAvatar] = useState('https://cdn.discordapp.com/avatars/759026330003308625/a_8a2b535d4f3b7f14b6099bdac25f0e34.gif');

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

    (window as any).electronAPI.getDevAvatar().then((url: string) => {
      if (url) setDevAvatar(url);
    });
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
    <div className="animate-fade-in custom-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: '10px 20px 30px 10px' }}>
      {toast && (
        <div className={`toast-notification ${toast.type}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="toast-dot"></div>
            <span>{toast.message}</span>
          </div>
        </div>
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
            className={`btn-secondary ${activeSubTab === tab ? 'active' : ''}`}
            style={{ padding: '10px 25px', fontSize: '11px', fontWeight: '900', borderRadius: '10px', border: 'none' }}
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
             <div className="glass-card" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                   <Shield size={20} color="var(--accent)" /> {t.security}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ maxWidth: '80%' }}>
                         <p style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{t.silentMode}</p>
                         <p className="caption" style={{ opacity: 0.4, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.silentDesc}</p>
                      </div>
                      <div onClick={() => updateSetting('silentMode', !settings.silentMode)} className={`nighty-toggle ${settings.silentMode ? 'active' : ''}`}>
                         <div className="nighty-toggle-handle"></div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ maxWidth: '80%' }}>
                         <p style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{t.autoLogin}</p>
                         <p className="caption" style={{ opacity: 0.4, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.autoLoginDesc}</p>
                      </div>
                      <div onClick={() => updateSetting('autoLogin', !settings.autoLogin)} className={`nighty-toggle ${settings.autoLogin ? 'active' : ''}`}>
                         <div className="nighty-toggle-handle"></div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ maxWidth: '80%' }}>
                         <p style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{t.appDetection}</p>
                         <p className="caption" style={{ opacity: 0.4, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>{t.appDetectionDesc}</p>
                      </div>
                      <div onClick={() => updateSetting('allowActiveAppDetection', !settings.allowActiveAppDetection)} className={`nighty-toggle ${settings.allowActiveAppDetection ? 'active' : ''}`}>
                         <div className="nighty-toggle-handle"></div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '14px', fontWeight: '700' }}>{t.language}</p>
                      <select value={settings.language} onChange={e => updateSetting('language', e.target.value as 'fr' | 'en')} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'white', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
                         <option value="fr">Français (FR)</option>
                         <option value="en">English (US)</option>
                      </select>
                   </div>
                </div>
             </div>

             <div className="glass-card" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                   <Volume2 size={20} color="var(--accent)" /> AUDIO & UX SENSITIERS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ maxWidth: '80%' }}>
                         <p style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Effets Sonores UI</p>
                         <p className="caption" style={{ opacity: 0.4, textTransform: 'none', marginTop: '4px', lineHeight: '1.4' }}>Activer les sons pour les clics et notifications.</p>
                      </div>
                      <div onClick={() => {
                          updateSetting('audioEnabled', !settings.audioEnabled);
                          audioService.play('toggle');
                      }} className={`nighty-toggle ${settings.audioEnabled ? 'active' : ''}`}>
                         <div className="nighty-toggle-handle"></div>
                      </div>
                   </div>
                   <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                         <p style={{ fontSize: '14px', fontWeight: '700' }}>Volume Global</p>
                         <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{Math.round((settings.audioVolume || 0) * 100)}%</p>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={settings.audioVolume || 0} onChange={(e) => updateSetting('audioVolume', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                   </div>
                </div>
             </div>
           </div>
         )}

         {activeSubTab === 'Visual' && (
           <div className="glass-card animate-slide-right" style={{ padding: '30px' }}>
              <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                 <Palette size={20} color="#a855f7" /> {t.wallpaper}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 450px) 1fr', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    <img src={previewUrl || settings.themeBackground} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${settings.themeBlur || 0}px)` }} />
                    <div style={{ position: 'absolute', inset: '15%', background: `rgba(255,255,255,${(settings.themeOpacity || 0.8) * 0.15})`, backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>PREVIEW</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleLocalUpload}>IMPORTER UN FICHIER</button>
                    {settings.themeBackground && <button className="btn-danger" style={{ width: '45px', padding: 0, justifyContent: 'center' }} onClick={() => updateSetting('themeBackground', '')}><Trash2 size={18} /></button>}
                  </div>
                  {pendingImage && <button className="btn-primary" style={{ background: 'var(--success)', border: 'none', boxShadow: '0 0 15px var(--success-glow)' }} onClick={applyWallpaper}>SAUVEGARDER LE FOND</button>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                   <div>
                      <label className="caption">{t.wallpaperUrl}</label>
                      <input className="input-field" placeholder="https://..." value={settings.themeBackground && !settings.themeBackground.startsWith('local-resource') ? settings.themeBackground : ''} onChange={e => updateSetting('themeBackground', e.target.value)} style={{ width: '100%', marginTop: '10px' }} />
                   </div>
                   <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <label className="caption">{t.blurIntensity}</label>
                         <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{settings.themeBlur || 0}px</span>
                      </div>
                      <input type="range" min="0" max="25" step="1" value={settings.themeBlur || 0} onChange={e => updateSetting('themeBlur', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                   </div>
                   <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <label className="caption">{t.opacity}</label>
                         <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{Math.round((settings.themeOpacity || 1) * 100)}%</span>
                      </div>
                      <input type="range" min="0.30" max="1" step="0.05" value={settings.themeOpacity || 1} onChange={e => updateSetting('themeOpacity', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                   </div>
                   <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                         <p style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Cyber Cursor Pro</p>
                         <p className="caption" style={{ opacity: 0.4, textTransform: 'none', marginTop: '4px' }}>Activez le curseur personnalisé d'Opsec.</p>
                      </div>
                      <div onClick={() => updateSetting('cyberCursorEnabled', !settings.cyberCursorEnabled)} className={`nighty-toggle ${settings.cyberCursorEnabled ? 'active' : ''}`}>
                         <div className="nighty-toggle-handle"></div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
         )}

         {activeSubTab === 'Identity' && (
           <div className="animate-fade-in custom-scrollbar" style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}>
              <Animations />
           </div>
         )}

         {activeSubTab === 'Accounts' && (
           <div className="glass-card animate-slide-right" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                    <Users size={20} color="var(--accent)" /> {t.accountMgmt}
                </h3>
                <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('open-add-account'))}>
                   <Plus size={16} /> {t.addAccount}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                 {settings.accounts?.map(acc => (
                    <div key={acc.id} className="list-item" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', background: acc.id === user?.id ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255,255,255,0.02)', borderColor: acc.id === user?.id ? 'var(--accent)' : 'transparent', cursor: 'default' }}>
                       <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#222', overflow: 'hidden' }}>
                          {acc.avatarURL ? <img src={acc.avatarURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={20} style={{ margin: '12px' }} />}
                       </div>
                       <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '800', fontSize: '14px' }}>{acc.username}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>#{acc.tag || 'Alt Account'}</p>
                       </div>
                       {acc.id === user?.id ? (
                          <div style={{ padding: '4px 10px', background: 'var(--accent)', borderRadius: '8px', fontSize: '10px', fontWeight: '900' }}>{t.active}</div>
                       ) : (
                          <button className="btn-danger" style={{ width: '35px', height: '35px', padding: 0, justifyContent: 'center' }} onClick={() => handleRemoveAccount(acc.id)}>
                             <Trash2 size={16} />
                          </button>
                       )}
                    </div>
                 ))}
              </div>
           </div>
         )}
      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.4, paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--accent)', padding: '1px', background: 'var(--bg-main)' }}>
            <img src={devAvatar} alt="dev" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.05em' }}>{t.devCredit}</span>
        </div>
        <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: '700', opacity: 0.6 }}>contactez @ellecrydansmesdm</p>
      </div>
    </div>
  );
};

export default Settings;
