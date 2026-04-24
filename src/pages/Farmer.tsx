import React, { useState, useEffect } from 'react';
import { Tractor, Clock, Radio, MessageSquare, Shield, Play, Square, Plus, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";

interface FarmerStatus {
  status: 'idle' | 'hopping' | 'connected';
  uptime: number;
}

export const Farmer = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const [status, setStatus] = useState<FarmerStatus>({ status: 'idle', uptime: 0 });
  const [newVcId, setNewVcId] = useState('');
  const [newMessageChannelId, setNewMessageChannelId] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [metadata, setMetadata] = useState<Record<string, { name: string; icon?: string; type: string }>>({});

  const config = settings.farmerConfig || {
    enabled: false,
    vocalHopper: { enabled: false, channelIds: [], interval: 10, jitter: true },
    messageFarmer: { enabled: false, channelIds: [], phrases: [], delay: 60 },
    stealthMode: true
  };

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await (window as any).electronAPI.getFarmerStatus();
      if (res.success) setStatus(res.data);
    };
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  // Metadata resolution
  useEffect(() => {
    const resolve = async () => {
      const allIds = [
        ...config.vocalHopper.channelIds,
        ...config.messageFarmer.channelIds
      ];
      if (allIds.length === 0) return;
      const res = await window.electronAPI.resolveIds(allIds);
      if (res.success && res.data) {
        setMetadata(prev => ({ ...prev, ...res.data }));
      }
    };
    resolve();
  }, [config.vocalHopper.channelIds, config.messageFarmer.channelIds]);

  const saveConfig = (newCfg: any) => {
    updateSetting('farmerConfig', newCfg);
  };

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${s % 60}s`;
  };

  const toggleFarmer = () => {
    saveConfig({ ...config, enabled: !config.enabled });
  };

  return (
    <div className="animate-fade-in custom-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: '10px 20px 40px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
           <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: 'white' }}>
             Opsec <span style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>Farmer</span>
           </h1>
           <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '5px', fontWeight: '700' }}>OPTIMISATION_DE_SESSION v1.2.0</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.enabled ? 'var(--success)' : 'var(--text-dim)', boxShadow: config.enabled ? '0 0 10px var(--success)' : 'none' }}></div>
            <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, letterSpacing: '1px' }}>LAST SYNC: OK</span>
          </div>
          <button 
            onClick={toggleFarmer}
            className={config.enabled ? "btn-danger" : "btn-primary"}
            style={{ height: '45px', padding: '0 30px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {config.enabled ? <><Square size={16} /> STOP TOUT</> : <><Play size={16} /> LANCER LE FARMING</>}
          </button>
        </div>
      </div>

      {/* Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '12px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}><Clock size={24} /></div>
            <div style={{ flex: 1 }}>
               <p className="caption" style={{ opacity: 0.4 }}>UPTIME_ACTUEL</p>
               <h3 style={{ fontSize: '20px', fontWeight: '900' }}>{status.uptime > 0 ? formatUptime(status.uptime) : '00h 00m 00s'}</h3>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--success)' }}>
            <div style={{ background: 'rgba(var(--success-rgb), 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}><Zap size={24} /></div>
            <div style={{ flex: 1 }}>
               <p className="caption" style={{ opacity: 0.4 }}>STATUT_MOTEUR</p>
               <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>{status.status === 'hopping' ? 'Hopping...' : status.status === 'connected' ? 'Connecté' : 'Inactif'}</h3>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--warning)' }}>
            <div style={{ background: 'rgba(255, 179, 0, 0.1)', padding: '12px', borderRadius: '12px', color: '#ffb300' }}><Shield size={24} /></div>
            <div style={{ flex: 1 }}>
               <p className="caption" style={{ opacity: 0.4 }}>STEALTH_LOCK</p>
               <h3 style={{ fontSize: '18px', fontWeight: '900' }}>{config.stealthMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}</h3>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        {/* VC HOPPER */}
        <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
               <Radio size={20} color="var(--accent)" /> VC HOPPER (AFK Voice)
            </h3>
            <div onClick={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, enabled: !config.vocalHopper.enabled } })} className={`nighty-toggle ${config.vocalHopper.enabled ? 'active' : ''}`}>
               <div className="nighty-toggle-handle"></div>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
             <label className="input-label" style={{ marginBottom: '10px' }}>ID Salon Vocal</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="ID du salon..." 
                  value={newVcId}
                  onChange={e => setNewVcId(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button 
                  className="btn-primary" 
                  style={{ width: '45px', height: '45px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} 
                  onClick={() => {
                    if (newVcId) {
                      saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: [...config.vocalHopper.channelIds, newVcId] } });
                      setNewVcId('');
                    }
                  }}
                >
                  <Plus size={20} />
                </button>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '220px', overflowY: 'auto', marginBottom: '25px', paddingRight: '5px' }} className="custom-scrollbar">
             {config.vocalHopper.channelIds.map((id: string, i: number) => {
                const info = metadata[id];
                return (
                  <div key={i} className="list-item" style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {info?.icon ? (
                          <img src={info.icon} style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Radio size={12} color="var(--accent)" />
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: info ? 'white' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info ? info.name : id}
                          </span>
                          {info && <span style={{ fontSize: '9px', opacity: 0.4 }}>{id}</span>}
                        </div>
                     </div>
                     <button className="btn-danger" style={{ width: '32px', height: '32px', padding: 0, opacity: 0.6, flexShrink: 0 }} onClick={() => {
                        const newIds = config.vocalHopper.channelIds.filter((_: any, idx: number) => idx !== i);
                        saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: newIds } });
                     }}><Trash2 size={14} /></button>
                  </div>
                );
             })}
             {config.vocalHopper.channelIds.length === 0 && (
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                 <Radio size={40} style={{ marginBottom: '15px' }} />
                 <p style={{ fontSize: '11px', fontWeight: '800' }}>AUCUN SALON CONFIGURÉ</p>
               </div>
             )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)', marginTop: 'auto' }}>
             <div>
                <label className="input-label" style={{ fontSize: '10px', opacity: 0.6 }}>INTERVALLE (MIN)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={config.vocalHopper.interval}
                  onChange={e => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, interval: parseInt(e.target.value) || 1 } })}
                  style={{ width: '100%', fontSize: '14px', marginTop: '5px' }}
                />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="input-label" style={{ fontSize: '10px', opacity: 0.6 }}>JITTER (ALÉATOIRE)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                   <div onClick={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, jitter: !config.vocalHopper.jitter } })} className={`nighty-toggle ${config.vocalHopper.jitter ? 'active' : ''}`} style={{ width: '35px', height: '18px' }}>
                      <div className="nighty-toggle-handle" style={{ width: '14px', height: '14px' }}></div>
                   </div>
                   <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--accent)' }}>+/- 1 MIN</span>
                </div>
             </div>
          </div>
        </div>

        {/* XP FARMER */}
        <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
               <MessageSquare size={20} color="var(--accent)" /> XP FARMER (Text Output)
            </h3>
            <div onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, enabled: !config.messageFarmer.enabled } })} className={`nighty-toggle ${config.messageFarmer.enabled ? 'active' : ''}`}>
               <div className="nighty-toggle-handle"></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '15px', marginBottom: '20px' }}>
             <div>
                <label className="input-label" style={{ marginBottom: '10px' }}>Salon(s) cible</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <input type="text" className="input-field" placeholder="ID..." value={newMessageChannelId} onChange={e => setNewMessageChannelId(e.target.value)} style={{ flex: 1, fontSize: '13px' }} />
                   <button 
                     className="btn-primary" 
                     style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} 
                     onClick={() => {
                       if (newMessageChannelId) {
                         saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: [...config.messageFarmer.channelIds, newMessageChannelId] } });
                         setNewMessageChannelId('');
                       }
                     }}
                   >
                     <Plus size={18} />
                   </button>
                </div>
                <div style={{ marginTop: '12px', height: '100px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                   {config.messageFarmer.channelIds.map((id: any, i: number) => {
                      const info = metadata[id];
                      return (
                        <div key={id + i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info ? info.name : id}</span>
                           </div>
                           <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.5, flexShrink: 0 }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: config.messageFarmer.channelIds.filter((_: any, idx: number) => idx !== i) } })} />
                        </div>
                      );
                   })}
                   {config.messageFarmer.channelIds.length === 0 && <p style={{ fontSize: '10px', opacity: 0.3, textAlign: 'center', marginTop: '20px' }}>Aucun salon</p>}
                </div>
             </div>
             <div>
                <label className="input-label" style={{ marginBottom: '10px' }}>Délai (Sec)</label>
                <input type="number" className="input-field" value={config.messageFarmer.delay} onChange={e => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, delay: parseInt(e.target.value) || 1 } })} style={{ width: '100%' }} />
                <p style={{ marginTop: '10px', fontSize: '9px', lineHeight: '1.4', opacity: 0.4 }}>XP Recommendation: <br/><b style={{ color: 'var(--accent)' }}>60s per message</b></p>
             </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
             <label className="input-label" style={{ marginBottom: '10px' }}>Phrases aléatoires</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Yo / Salut / .xp ..." value={newPhrase} onChange={e => setNewPhrase(e.target.value)} style={{ flex: 1 }} />
                <button 
                  className="btn-primary" 
                  style={{ width: '45px', height: '45px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} 
                  onClick={() => {
                    if (newPhrase) {
                      saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: [...config.messageFarmer.phrases, newPhrase] } });
                      setNewPhrase('');
                    }
                  }}
                >
                  <Plus size={20} />
                </button>
             </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', height: '100px', overflowY: 'auto' }} className="custom-scrollbar">
             {config.messageFarmer.phrases.map((p: string, i: number) => (
                <div key={i} style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(0, 210, 255, 0.1)' }}>
                   {p} <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: config.messageFarmer.phrases.filter((_: any, idx: number) => idx !== i) } })} />
                </div>
             ))}
          </div>
        </div>

        {/* SECURITY & STEALH */}
        <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', background: 'rgba(255, 71, 87, 0.03)', borderRadius: '18px', border: '1px solid rgba(255, 71, 87, 0.1)', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--danger)', color: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 0 15px var(--danger-glow)' }}><AlertTriangle size={24} /></div>
              <div style={{ flex: 1, minWidth: '300px' }}>
                 <p style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '1px' }}>SÉCURITÉ ANTI-DETECTION (OPSEC)</p>
                 <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px', lineHeight: '1.5' }}>
                   Le mode Stealth active le protocole de discrétion maximale en forçant le Self-Deaf et le Self-Mute directement au niveau de la Gateway Discord, simulant une inactivité humaine parfaite.
                 </p>
              </div>
              <div onClick={() => saveConfig({ ...config, stealthMode: !config.stealthMode })} className={`nighty-toggle ${config.stealthMode ? 'active' : ''}`} style={{ flexShrink: 0 }}>
                 <div className="nighty-toggle-handle"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
