import React, { useState } from 'react';
import { Globe, Code, Shield, AppWindow, Users, Image as ImageIcon, Trash2, Plus, Upload, Sliders, Music, RefreshCw } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";

export const Settings = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const [activeSubTab, setActiveSubTab] = useState<'General' | 'Theme' | 'Accounts'>('General');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const t = {
    fr: {
      title: "Configuration",
      description: "Personnalisez votre instance Opsec PRO v1.1.0",
      general: "GÉNÉRAL",
      theme: "THÈME",
      accounts: "COMPTES",
      security: "Sécurité & Base",
      silentMode: "Mode Silencieux",
      silentDesc: "Le bot n'envoie pas de confirmations (ex: '✅ C'est bon'). Seules les erreurs critiques s'affichent.",
      autoLogin: "Auto-Login",
      autoLoginDesc: "Se connecte automatiquement au démarrage (Auto-login OFF = Login manuel).",
      appDetection: "Détection d'Application Active",
      appDetectionDesc: "Permet au bot de détecter vos jeux/apps pour enrichir votre statut (Rich Presence).",
      language: "Langue",
      spotify: "Intégration Spotify",
      lyrics: "Paroles en Temps Réel",
      lyricsDesc: "Opsec Pro utilise LRCLIB pour afficher les paroles en temps réel sur votre statut Discord.",
      wallpaper: "Fond d'écran & Visuels",
      wallpaperUrl: "URL de l'image (Wallpaper)",
      wallpaperDesc: "Supporte URL web ou fichiers locaux.",
      blurIntensity: "Intensité du Flou",
      opacity: "Opacité UI",
      accountMgmt: "Gestion des Comptes (Alts)",
      addAccount: "Ajouter un compte",
      active: "ACTIF",
      shortcuts: "Raccourcis Commandes",
      devCredit: "DEV BY FAHD",
      helpText: "mp @ellecrydansmesdm si besoin d'aide"
    },
    en: {
      title: "Configuration",
      description: "Customize your Opsec PRO v1.1.0 instance",
      general: "GENERAL",
      theme: "THEME",
      accounts: "ACCOUNTS",
      security: "Security & Base",
      silentMode: "Silent Mode",
      silentDesc: "Bot won't send success confirmations. Only critical errors will be displayed.",
      autoLogin: "Auto-Login",
      autoLoginDesc: "Automatically connects on startup (OFF = Manual Login).",
      appDetection: "Active App Detection",
      appDetectionDesc: "Allows the bot to detect your games/apps for Discord Rich Presence.",
      language: "Language",
      spotify: "Spotify Integration",
      lyrics: "Real-time Lyrics",
      lyricsDesc: "Opsec Pro uses LRCLIB to display real-time lyrics on your Discord status.",
      wallpaper: "Wallpaper & Visuals",
      wallpaperUrl: "Image URL (Wallpaper)",
      wallpaperDesc: "Supports web URLs or local files.",
      blurIntensity: "Blur Intensity",
      opacity: "UI Opacity",
      accountMgmt: "Account Management (Alts)",
      addAccount: "Add Account",
      active: "ACTIVE",
      shortcuts: "Command Shortcuts",
      devCredit: "DEV BY FAHD",
      helpText: "dm @ellecrydansmesdm if help needed"
    }
  }[settings.language || 'fr'];

  const showToast = (message: string, type: 'success' | 'danger') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLocalUpload = async () => {
    console.log('[WALLPAPER] UX: Déclenchement du sélecteur...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      console.log('[WALLPAPER] UX: Fichier sélectionné:', file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        console.log('[WALLPAPER] UX: Aperçu Data URL généré avec succès');
        setPreviewUrl(dataUrl);
        setPendingImage(file.path || file.name); // Note: file.path is available in Electron for <input>
        
        // If file.path is missing (rare in webPreferences), we might need selectFile fallback
        // but typically Electron provides it.
        showToast('Aperçu chargé. Cliquez sur Appliquer.', 'success');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const applyWallpaper = async () => {
    if (!pendingImage) return;
    
    setIsApplying(true);
    console.log('[WALLPAPER] UX: Tentative d\'application...', pendingImage);
    
    try {
      const res = await (window as any).electronAPI.wallpaperUpload(pendingImage);
      if (res.success) {
        console.log('[WALLPAPER] UX: Succès ! URL Finale:', res.data);
        updateSetting('themeBackground', res.data);
        setPendingImage(null);
        setPreviewUrl(null);
        showToast('Fond d\'écran appliqué avec succès !', 'success');
      } else {
        console.error('[WALLPAPER] UX: Échec Application:', res.error);
        showToast(res.error || 'Erreur lors de l\'application', 'danger');
      }
    } catch (err: any) {
      console.error('[WALLPAPER] UX: Erreur Critique:', err);
      showToast('Erreur système lors de l\'application', 'danger');
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
        {(['General', 'Theme', 'Accounts'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`btn-secondary ${activeSubTab === tab ? 'active' : ''}`}
            style={{ padding: '10px 25px', fontSize: '11px', fontWeight: '900', borderRadius: '10px', border: 'none' }}
          >
            {tab === 'General' && <Globe size={14} />}
            {tab === 'Theme' && <ImageIcon size={14} />}
            {tab === 'Accounts' && <Users size={14} />}
            {t[tab.toLowerCase() as keyof typeof t]}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px' }}>
         {activeSubTab === 'General' && (
           <>
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

             <div className="glass-card animate-slide-right" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                   <Code size={20} color="var(--accent)" /> {t.shortcuts}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                   {[
                      { id: '1', label: "Nettoyer salon", cmd: "+clear [Nb]" },
                      { id: '2', label: "Quitter groupes", cmd: "+leavegroups" },
                      { id: '6', label: "Farming AFK", cmd: "+afkvc [ID]" }
                   ].map((c) => (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '800', textTransform: 'uppercase' }}>{c.label}</span>
                         <code style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '12px' }}>{c.cmd}</code>
                      </div>
                   ))}
                </div>
             </div>
           </>
         )}

         {activeSubTab === 'Theme' && (
           <div className="glass-card animate-slide-right" style={{ padding: '30px', gridColumn: 'span 2' }}>
              <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                 <ImageIcon size={20} color="var(--accent)" /> {t.wallpaper}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Live Preview Dropzone */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'var(--border)';
                      handleLocalUpload(); // Trigger upload flow
                    }}
                    style={{ 
                      width: '100%', 
                      aspectRatio: '16/9', 
                      background: 'rgba(0,0,0,0.4)', 
                      borderRadius: '12px', 
                      border: '2px dashed var(--border)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s'
                    }}
                  >
                    {previewUrl || settings.themeBackground ? (
                      <img 
                        src={previewUrl || settings.themeBackground} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: previewUrl ? 1 : 0.6 }} 
                        onError={(e) => {
                          console.error('[WALLPAPER] Preview failed to load');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.3 }}>
                        <ImageIcon size={40} style={{ marginBottom: '10px' }} />
                        <p style={{ fontSize: '10px', fontWeight: '900' }}>GLISSEZ UNE IMAGE</p>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                       <div style={{ padding: '4px 12px', background: 'rgba(5, 7, 15, 0.8)', border: '1px solid var(--accent)', borderRadius: '12px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px', color: 'white' }}>
                          {previewUrl ? 'NOUVEL APERÇU' : 'LIVE PREVIEW'}
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ flex: 1, height: '40px', fontSize: '11px' }} 
                        onClick={handleLocalUpload}
                      >
                        <Upload size={14} /> PARCOURIR
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center' }} 
                        onClick={() => {
                          updateSetting('themeBackground', '');
                          setPendingImage(null);
                          setPreviewUrl(null);
                          (window as any).electronAPI.wallpaperReset();
                          showToast('Fond supprimé', 'success');
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {pendingImage && (
                      <button 
                        className={`btn-primary ${isApplying ? 'loading' : ''}`}
                        style={{ 
                          width: '100%', 
                          height: '45px', 
                          background: 'var(--success)', 
                          borderColor: 'var(--success)',
                          boxShadow: '0 0 15px var(--success-glow)',
                          fontSize: '11px',
                          fontWeight: '900'
                        }}
                        onClick={applyWallpaper}
                        disabled={isApplying}
                      >
                        {isApplying ? <RefreshCw className="animate-spin" size={16} /> : '✅ APPLIQUER LE FOND'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  <div>
                     <label className="input-label" style={{ marginBottom: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={14} /> {t.wallpaperUrl}
                     </label>
                     <input 
                         type="text" 
                         className="input-field" 
                         placeholder="https://imgur.com/..." 
                         style={{ width: '100%', background: 'rgba(0,0,0,0.2)' }}
                         value={settings.themeBackground && !settings.themeBackground.startsWith('local-resource') ? settings.themeBackground : ''}
                         onChange={e => updateSetting('themeBackground', e.target.value)}
                     />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                     <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                           <label className="input-label" style={{ marginBottom: 0 }}>{t.blurIntensity}</label>
                           <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{settings.themeBlur || 0}px</span>
                        </div>
                        <input type="range" min="0" max="25" step="1" value={settings.themeBlur || 0} onChange={e => updateSetting('themeBlur', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                     </div>
                     <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                           <label className="input-label" style={{ marginBottom: 0 }}>{t.opacity}</label>
                           <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--accent)' }}>{Math.round((settings.themeOpacity || 1) * 100)}%</span>
                        </div>
                        <input type="range" min="0.30" max="1" step="0.05" value={settings.themeOpacity || 1} onChange={e => updateSetting('themeOpacity', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                     </div>
                  </div>
                </div>
              </div>
           </div>
          )}

         {activeSubTab === 'Accounts' && (
           <div className="glass-card animate-slide-right" style={{ padding: '30px', gridColumn: 'span 2' }}>
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
                          <button 
                            className="btn-danger" 
                            style={{ width: '35px', height: '35px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                            onClick={() => handleRemoveAccount(acc.id)}
                          >
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
            <img src={user?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="dev" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.05em' }}>{t.devCredit}</span>
        </div>
        <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: '700', opacity: 0.6 }}>{t.helpText}</p>
      </div>
    </div>
  );
};
