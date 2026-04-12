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
    <div className="animate-fade-in custom-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: '10px 20px 40px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
        <div>
           <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', color: 'white' }}>
             Auto <span style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>Responder</span>
           </h1>
           <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '5px', fontWeight: '700' }}>RÉPONSES_AUTOMATISÉES v1.2.0</p>
        </div>
        <div onClick={() => saveConfig({ ...config, enabled: !config.enabled })} className={`nighty-toggle ${config.enabled ? 'active' : ''}`} style={{ width: '60px', height: '30px' }}>
           <div className="nighty-toggle-handle" style={{ width: '24px', height: '24px' }}></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        {/* Rule Creator */}
        <div className="glass-card" style={{ padding: '30px' }}>
           <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
              <Plus size={20} color="var(--accent)" /> Nouvelle Règle
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                 <label className="input-label">SI LE MESSAGE CONTIENT (Trigger)</label>
                 <input 
                    type="text" 
                    className="input-field" 
                    placeholder="ex: salut, coucou, afk..." 
                    value={newTrigger} 
                    onChange={e => setNewTrigger(e.target.value)}
                    style={{ width: '100%' }}
                 />
              </div>
              <div>
                 <label className="input-label">ALORS RÉPONDRE (Reply)</label>
                 <textarea 
                    className="input-field" 
                    placeholder="ex: Je suis occupé pour le moment !" 
                    value={newReply} 
                    onChange={e => setNewReply(e.target.value)}
                    style={{ width: '100%', minHeight: '100px', resize: 'none' }}
                 />
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', height: '45px', fontWeight: '900' }}
                onClick={addRule}
                disabled={!newTrigger || !newReply}
              >
                AJOUTER LA RÈGLE
              </button>
           </div>
        </div>

        {/* Global Settings */}
        <div className="glass-card" style={{ padding: '30px' }}>
           <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
              <Bot size={20} color="var(--accent)" /> Configuration Globale
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <p style={{ fontSize: '14px', fontWeight: '700' }}>Mode AFK Uniquement</p>
                    <p className="caption" style={{ opacity: 0.4, textTransform: 'none' }}>Répondre seulement si le mode Farmer est actif.</p>
                 </div>
                 <div onClick={() => saveConfig({ ...config, afkOnly: !config.afkOnly })} className={`nighty-toggle ${config.afkOnly ? 'active' : ''}`}>
                    <div className="nighty-toggle-handle"></div>
                 </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <p style={{ fontSize: '14px', fontWeight: '700' }}>DMs Uniquement</p>
                    <p className="caption" style={{ opacity: 0.4, textTransform: 'none' }}>Empêche de répondre sur les serveurs publics.</p>
                 </div>
                 <div onClick={() => saveConfig({ ...config, dmOnly: !config.dmOnly })} className={`nighty-toggle ${config.dmOnly ? 'active' : ''}`}>
                    <div className="nighty-toggle-handle"></div>
                 </div>
              </div>
              <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--accent-rgb), 0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <ShieldCheck size={20} color="var(--accent)" />
                 <p style={{ fontSize: '11px', fontWeight: '600', opacity: 0.7 }}>Opsec PRO utilise des délais aléatoires (1-3s) pour simuler une frappe de clavier humaine.</p>
              </div>
           </div>
        </div>

        {/* Rules Table */}
        <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2' }}>
           <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
              <MessageCircle size={20} color="var(--accent)" /> Liste des Règles Actives
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {config.rules.map((rule: any, i: number) => (
                 <div key={i} className="list-item" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '8px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', minWidth: '120px', textAlign: 'center' }}>
                       "{rule.trigger.toUpperCase()}"
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', opacity: 0.8 }}>
                       {rule.replies[0]}
                    </div>
                    <button className="btn-danger" style={{ width: '35px', height: '35px', padding: 0 }} onClick={() => removeRule(i)}>
                       <Trash2 size={16} />
                    </button>
                 </div>
              ))}
              {config.rules.length === 0 && (
                 <div style={{ padding: '40px', textAlign: 'center', opacity: 0.2 }}>
                    <AlertCircle size={40} style={{ margin: '0 auto 15px' }} />
                    <p style={{ fontWeight: '900', fontSize: '12px' }}>AUCUNE_RÈGLE_CONFIGURÉE</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
