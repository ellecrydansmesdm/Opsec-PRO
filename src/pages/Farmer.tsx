import React, { useState, useEffect } from 'react';
import { Tractor, Clock, Radio, MessageSquare, Shield, Play, Square, Plus, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";

export const Farmer = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const [status, setStatus] = useState<any>({ status: 'idle', uptime: 0 });
  const [newVcId, setNewVcId] = useState('');
  const [newMessageChannelId, setNewMessageChannelId] = useState('');
  const [newPhrase, setNewPhrase] = useState('');

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
        <div>
           <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: 'white' }}>
             Opsec <span style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>Farmer</span>
           </h1>
           <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '5px', fontWeight: '700' }}>OPTIMISATION_DE_SESSION v1.2.0</p>
        </div>
        <button 
          onClick={toggleFarmer}
          className={config.enabled ? "btn-danger" : "btn-primary"}
          style={{ height: '45px', padding: '0 30px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          {config.enabled ? <><Square size={16} /> STOP TOUT</> : <><Play size={16} /> LANCER LE FARMING</>}
        </button>
      </div>

      {/* Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '12px', color: 'var(--accent)' }}><Clock size={24} /></div>
            <div>
               <p className="caption" style={{ opacity: 0.4 }}>UPTIME_ACTUEL</p>
               <h3 style={{ fontSize: '20px', fontWeight: '900' }}>{status.uptime > 0 ? formatUptime(status.uptime) : '00h 00m 00s'}</h3>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--success)' }}>
            <div style={{ background: 'rgba(var(--success-rgb), 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}><Zap size={24} /></div>
            <div>
               <p className="caption" style={{ opacity: 0.4 }}>STATUT_MOTEUR</p>
               <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>{status.status === 'hopping' ? 'Hopping...' : status.status === 'connected' ? 'Connecté' : 'Inactif'}</h3>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--warning)' }}>
            <div style={{ background: 'rgba(255, 179, 0, 0.1)', padding: '12px', borderRadius: '12px', color: '#ffb300' }}><Shield size={24} /></div>
            <div>
               <p className="caption" style={{ opacity: 0.4 }}>STEALTH_LOCK</p>
               <h3 style={{ fontSize: '18px', fontWeight: '900' }}>{config.stealthMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}</h3>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px' }}>
        {/* VC HOPPER */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
               <Radio size={20} color="var(--accent)" /> VC HOPPER (AFK Voice)
            </h3>
            <div onClick={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, enabled: !config.vocalHopper.enabled } })} className={`nighty-toggle ${config.vocalHopper.enabled ? 'active' : ''}`}>
               <div className="nighty-toggle-handle"></div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
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
                <button className="btn-primary" style={{ width: '45px', padding: 0, justifyContent: 'center' }} onClick={() => {
                   if (newVcId) {
                     saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: [...config.vocalHopper.channelIds, newVcId] } });
                     setNewVcId('');
                   }
                }}><Plus size={20} /></button>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }} className="custom-scrollbar">
             {config.vocalHopper.channelIds.map((id: string, i: number) => (
                <div key={i} className="list-item" style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.6 }}>{id}</span>
                   <button className="btn-danger" style={{ width: '30px', height: '30px', padding: 0, opacity: 0.5 }} onClick={() => {
                      const newIds = config.vocalHopper.channelIds.filter((_: any, idx: number) => idx !== i);
                      saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: newIds } });
                   }}><Trash2 size={14} /></button>
                </div>
             ))}
             {config.vocalHopper.channelIds.length === 0 && <p style={{ textAlign: 'center', fontSize: '11px', opacity: 0.3, padding: '20px' }}>Aucun salon ajouté</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px' }}>
             <div>
                <label className="input-label" style={{ fontSize: '10px' }}>INTERVALLE (MIN)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={config.vocalHopper.interval}
                  onChange={e => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, interval: parseInt(e.target.value) || 1 } })}
                  style={{ width: '100%', fontSize: '12px' }}
                />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="input-label" style={{ fontSize: '10px' }}>JITTER (ALÉATOIRE)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                   <div onClick={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, jitter: !config.vocalHopper.jitter } })} className={`nighty-toggle ${config.vocalHopper.jitter ? 'active' : ''}`} style={{ width: '35px', height: '18px' }}>
                      <div className="nighty-toggle-handle" style={{ width: '14px', height: '14px' }}></div>
                   </div>
                   <span style={{ fontSize: '10px', fontWeight: '800' }}>+/- 1 MIN</span>
                </div>
             </div>
          </div>
        </div>

        {/* XP FARMER */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
               <MessageSquare size={20} color="var(--accent)" /> XP FARMER (Text Output)
            </h3>
            <div onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, enabled: !config.messageFarmer.enabled } })} className={`nighty-toggle ${config.messageFarmer.enabled ? 'active' : ''}`}>
               <div className="nighty-toggle-handle"></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
             <div>
                <label className="input-label" style={{ marginBottom: '10px' }}>Salon(s) cible</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                   <input type="text" className="input-field" placeholder="ID..." value={newMessageChannelId} onChange={e => setNewMessageChannelId(e.target.value)} style={{ flex: 1, fontSize: '12px' }} />
                   <button className="btn-primary" style={{ width: '35px', padding: 0 }} onClick={() => {
                      if (newMessageChannelId) {
                        saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: [...config.messageFarmer.channelIds, newMessageChannelId] } });
                        setNewMessageChannelId('');
                      }
                   }}><Plus size={16} /></button>
                </div>
                <div style={{ marginTop: '10px', maxHeight: '80px', overflowY: 'auto' }} className="custom-scrollbar">
                   {config.messageFarmer.channelIds.map((id: any, i: number) => (
                      <div key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                         {id} <Trash2 size={10} style={{ cursor: 'pointer' }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: config.messageFarmer.channelIds.filter((_: any, idx: number) => idx !== i) } })} />
                      </div>
                   ))}
                </div>
             </div>
             <div>
                <label className="input-label" style={{ marginBottom: '10px' }}>Délai (Sec)</label>
                <input type="number" className="input-field" value={config.messageFarmer.delay} onChange={e => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, delay: parseInt(e.target.value) || 1 } })} style={{ width: '100%' }} />
                <p className="caption" style={{ marginTop: '8px', opacity: 0.3 }}>XP bots recommandation : 60s</p>
             </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
             <label className="input-label" style={{ marginBottom: '10px' }}>Phrases aléatoires</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="input-field" placeholder="Yo / Salut / .xp ..." value={newPhrase} onChange={e => setNewPhrase(e.target.value)} style={{ flex: 1 }} />
                <button className="btn-primary" style={{ width: '45px', padding: 0 }} onClick={() => {
                   if (newPhrase) {
                     saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: [...config.messageFarmer.phrases, newPhrase] } });
                     setNewPhrase('');
                   }
                }}><Plus size={20} /></button>
             </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }} className="custom-scrollbar">
             {config.messageFarmer.phrases.map((p: string, i: number) => (
                <div key={i} style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   {p} <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: config.messageFarmer.phrases.filter((_: any, idx: number) => idx !== i) } })} />
                </div>
             ))}
          </div>
        </div>

        {/* SECURITY & STEALH */}
        <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', background: 'rgba(255, 71, 87, 0.05)', borderRadius: '15px', border: '1px solid rgba(255, 71, 87, 0.1)' }}>
              <div style={{ background: 'var(--danger)', color: 'white', padding: '10px', borderRadius: '10px' }}><AlertTriangle size={20} /></div>
              <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '14px', fontWeight: '800' }}>SÉCURITÉ ANTI-DETECTION (OPSEC)</p>
                 <p style={{ fontSize: '11px', opacity: 0.5 }}>Le mode Stealth force le Self-Deaf/Mute via la Gateway Discord pour simuler une présence humaine sécurisée.</p>
              </div>
              <div onClick={() => saveConfig({ ...config, stealthMode: !config.stealthMode })} className={`nighty-toggle ${config.stealthMode ? 'active' : ''}`}>
                 <div className="nighty-toggle-handle"></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
