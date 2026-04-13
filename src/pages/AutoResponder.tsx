import React, { useState } from 'react';
import { Bot, Plus, Trash2, MessageCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";

export const AutoResponder = () => {
  const { settings, updateSetting } = useSettingsStore();
  const [newTrigger, setNewTrigger] = useState('');
  const [newReply, setNewReply] = useState('');

  const config = settings.responderConfig || {
    enabled: false,
    afkOnly: true,
    dmOnly: true,
    rules: []
  };

  const saveConfig = (newCfg: any) => {
    updateSetting('responderConfig', newCfg);
  };

  const addRule = () => {
    if (newTrigger && newReply) {
      const newRules = [...config.rules, { trigger: newTrigger, replies: [newReply] }];
      saveConfig({ ...config, rules: newRules });
      setNewTrigger('');
      setNewReply('');
    }
  };

  const removeRule = (index: number) => {
    const newRules = config.rules.filter((_, i) => i !== index);
    saveConfig({ ...config, rules: newRules });
  };

  return (
    <div className="animate-fade-in custom-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: '10px 15px 40px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
           <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: 'white' }}>
             Auto <span style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>Responder</span>
           </h1>
           <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '5px', fontWeight: '700' }}>RÉPONSES_AUTOMATISÉES v1.2.1</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: config.enabled ? 'var(--success)' : 'var(--text-dim)', marginBottom: '2px' }}>
              {config.enabled ? 'MOTEUR_ACTIF' : 'MOTEUR_STBY'}
            </p>
            <p style={{ fontSize: '9px', opacity: 0.3 }}>{config.rules.length} RÈGLES_CHARGÉES</p>
          </div>
          <div onClick={() => saveConfig({ ...config, enabled: !config.enabled })} className={`nighty-toggle ${config.enabled ? 'active' : ''}`} style={{ width: '64px', height: '32px' }}>
             <div className="nighty-toggle-handle" style={{ width: '26px', height: '26px' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Rule Creator */}
        <div className="glass-card" style={{ padding: '25px', border: '1px solid rgba(var(--accent-rgb), 0.1)', position: 'relative' }}>
           <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, var(--accent), transparent)', borderRadius: '2px' }}></div>
           <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
              <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}><Plus size={18} /></div>
              Nouvelle Règle d'Auto-Réponse
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div>
                 <label className="input-label" style={{ marginBottom: '12px', opacity: 0.6 }}>DÉCLENCHEUR (TRIGGER)</label>
                 <div style={{ position: 'relative' }}>
                    <input 
                       type="text" 
                       className="input-field" 
                       placeholder="Mots-clés (ex: salut, aide, .id)..." 
                       value={newTrigger} 
                       onChange={e => setNewTrigger(e.target.value)}
                       style={{ width: '100%', paddingLeft: '45px' }}
                    />
                    <Bot size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                 </div>
              </div>
              <div>
                 <label className="input-label" style={{ marginBottom: '12px', opacity: 0.6 }}>RÉPONSE (RESPONSE)</label>
                 <textarea 
                    className="input-field" 
                    placeholder="Contenu du message de réponse automatique..." 
                    value={newReply} 
                    onChange={e => setNewReply(e.target.value)}
                    style={{ width: '100%', minHeight: '130px', resize: 'none', lineHeight: '1.6' }}
                 />
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', height: '52px', fontWeight: '900', letterSpacing: '1px', boxShadow: '0 10px 20px rgba(0, 210, 255, 0.1)' }}
                onClick={addRule}
                disabled={!newTrigger || !newReply}
              >
                ENREGISTRER LA RÈGLE
              </button>
           </div>
        </div>

        {/* Global Settings */}
        <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
           <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
              <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}><ShieldCheck size={18} /></div>
              Paramètres de Diffusion
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '800', marginBottom: '6px' }}>Mode AFK (Farming Sync)</p>
                    <p style={{ fontSize: '11px', opacity: 0.4, textTransform: 'none', lineHeight: '1.5', maxWidth: '85%' }}>
                       L'auto-responder ne s'activera que si l'un de vos modules de farming (Farmer ou Voice Hopper) est en cours d'exécution.
                    </p>
                 </div>
                 <div onClick={() => saveConfig({ ...config, afkOnly: !config.afkOnly })} className={`nighty-toggle ${config.afkOnly ? 'active' : ''}`} style={{ marginTop: '5px' }}>
                    <div className="nighty-toggle-handle"></div>
                 </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '800', marginBottom: '6px' }}>Canaux Privés (DMs Only)</p>
                    <p style={{ fontSize: '11px', opacity: 0.4, textTransform: 'none', lineHeight: '1.5', maxWidth: '85%' }}>
                       Restreindre les réponses automatiques aux messages privés et groupes DMs uniquement. Recommandé pour éviter d'être banni des serveurs.
                    </p>
                 </div>
                 <div onClick={() => saveConfig({ ...config, dmOnly: !config.dmOnly })} className={`nighty-toggle ${config.dmOnly ? 'active' : ''}`} style={{ marginTop: '5px' }}>
                    <div className="nighty-toggle-handle"></div>
                 </div>
              </div>

              <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '15px', border: '1px dashed rgba(var(--accent-rgb), 0.2)', display: 'flex', gap: '15px' }}>
                 <AlertCircle size={24} color="var(--accent)" style={{ flexShrink: 0 }} />
                 <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', fontWeight: '800', marginBottom: '4px', letterSpacing: '0.5px' }}>ALGORITHME ANTI-BAN</p>
                    <p style={{ fontSize: '10px', opacity: 0.5, lineHeight: '1.4' }}>
                       Nous injectons une latence variable de 1 à 4 secondes et du jitter sur chaque réponse pour simuler un comportement humain et contourner les filtres de détection de spam.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* Rules Table */}
        <div className="glass-card" style={{ padding: '25px', gridColumn: 'span 2' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900' }}>
                 <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}><MessageCircle size={18} /></div>
                 Base de Connaissances Réactive
              </h3>
              <div style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4, padding: '5px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                 TOTAL: {config.rules.length}
              </div>
           </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {config.rules.map((rule: any, i: number) => (
                  <div key={i} className="list-item" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s ease', border: '1px solid transparent' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.1)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                     <div style={{ 
                        background: 'rgba(var(--accent-rgb), 0.1)', 
                        color: 'var(--accent)', 
                        padding: '6px 14px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        fontWeight: '950', 
                        minWidth: '100px', 
                        maxWidth: '120px',
                        textAlign: 'center', 
                        border: '1px solid rgba(var(--accent-rgb), 0.2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                     }}>
                        {rule.trigger.toUpperCase()}
                     </div>
                     <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', opacity: 0.8, color: 'white', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rule.replies[0]}
                     </div>
                     <button 
                       className="btn-danger" 
                       style={{ width: '32px', height: '32px', padding: 0, opacity: 0.4, transition: 'all 0.2s ease', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      onClick={() => removeRule(i)}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                       <Trash2 size={18} />
                    </button>
                 </div>
              ))}
              {config.rules.length === 0 && (
                 <div style={{ padding: '60px', textAlign: 'center', opacity: 0.15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={50} style={{ marginBottom: '20px' }} />
                    <p style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '2px' }}>SYSTÈME_ACTUELLEMENT_VIDE</p>
                    <p style={{ fontSize: '10px', marginTop: '5px' }}>Créez votre première règle à gauche pour commencer.</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
