import React, { useState } from 'react';
import { Bot, Plus, Trash2, MessageCircle, ShieldCheck, AlertCircle, Smile, Sliders, Sparkles } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { HubToggleRow } from '@/components/layout/HubPageLayout';

export const AutoResponder = () => {
  const { settings, updateSetting } = useSettingsStore();
  const isFr = settings.language === 'fr';

  const [trigger, setTrigger] = useState('');
  const [matchingMode, setMatchingMode] = useState<'contains' | 'exact' | 'regex'>('contains');
  const [action, setAction] = useState<'reply' | 'react' | 'both'>('reply');
  const [emoji, setEmoji] = useState('');
  const [replyWithPing, setReplyWithPing] = useState(true);
  const [delay, setDelay] = useState(2); // default 2 seconds

  const [currentReplies, setCurrentReplies] = useState<string[]>([]);
  const [newReplyText, setNewReplyText] = useState('');

  const config = settings.responderConfig || {
    enabled: false,
    afkOnly: true,
    dmOnly: true,
    rules: []
  };

  const saveConfig = (newCfg: any) => {
    updateSetting('responderConfig', newCfg);
  };

  const addReplyToTempList = () => {
    if (newReplyText.trim()) {
      setCurrentReplies([...currentReplies, newReplyText.trim()]);
      setNewReplyText('');
    }
  };

  const removeReplyFromTempList = (idx: number) => {
    setCurrentReplies(currentReplies.filter((_, i) => i !== idx));
  };

  const addRule = () => {
    if (!trigger.trim()) return;
    if ((action === 'reply' || action === 'both') && currentReplies.length === 0) return;
    if ((action === 'react' || action === 'both') && !emoji.trim()) return;

    const newRule = {
      trigger: trigger.trim(),
      replies: action === 'react' ? [] : currentReplies,
      matchingMode,
      action,
      emoji: (action === 'react' || action === 'both') ? emoji.trim() : undefined,
      replyWithPing: action !== 'react' ? replyWithPing : undefined,
      delay: delay
    };

    const newRules = [...config.rules, newRule];
    saveConfig({ ...config, rules: newRules });

    // Reset creator states
    setTrigger('');
    setCurrentReplies([]);
    setNewReplyText('');
    setEmoji('');
    setDelay(2);
  };

  const removeRule = (index: number) => {
    const newRules = config.rules.filter((_, i) => i !== index);
    saveConfig({ ...config, rules: newRules });
  };

  return (
    <div className="hub-engine-grid custom-scrollbar">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', alignItems: 'start', gridColumn: '1 / -1' }}>
        
        {/* Creator Panel */}
        <div className="glass-card" style={{ padding: '30px', position: 'relative', border: '1px solid rgba(255,255,255,0.03)', background: 'linear-gradient(135deg, rgba(20,20,30,0.4) 0%, rgba(10,10,15,0.6) 100%)' }}>
           <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, var(--accent), transparent)', borderRadius: '2px' }}></div>
           
           <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900', letterSpacing: '-0.01em' }}>
              <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '10px', color: 'var(--accent)' }}><Sparkles size={18} /></div>
              {isFr ? "Studio de Création de Règles" : 'Rule Creation Studio'}
           </h3>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Trigger Input & Matching Mode Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '15px' }}>
                <div>
                  <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'DÉCLENCHEUR (TRIGGER)' : 'TRIGGER WORD/PATTERN'}
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder={isFr ? 'Ex: salut, !aide, .*admin.*' : 'E.g. hello, !help, .*admin.*'} 
                    value={trigger} 
                    onChange={e => setTrigger(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'MODE D\'APPARIEMENT' : 'MATCHING MODE'}
                  </label>
                  <select 
                    value={matchingMode} 
                    onChange={e => setMatchingMode(e.target.value as any)} 
                    className="settings-select"
                    style={{ width: '100%', height: '42px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}
                  >
                    <option value="contains">{isFr ? 'Contient' : 'Contains'}</option>
                    <option value="exact">{isFr ? 'Exact Match' : 'Exact Match'}</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
              </div>

              {/* Action Selection Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
                <div>
                  <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'ACTION À EXÉCUTER' : 'ACTION TO TRIGGER'}
                  </label>
                  <select 
                    value={action} 
                    onChange={e => setAction(e.target.value as any)} 
                    className="settings-select"
                    style={{ width: '100%', height: '42px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}
                  >
                    <option value="reply">{isFr ? 'Répondre textuellement' : 'Send Text Reply'}</option>
                    <option value="react">{isFr ? 'Réagir (Emoji)' : 'React (Emoji)'}</option>
                    <option value="both">{isFr ? 'Répondre + Réagir' : 'Both (Reply + React)'}</option>
                  </select>
                </div>

                <div>
                  <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'DÉLAI DE RÉPONSE (SEC)' : 'TRIGGER LATENCY (SEC)'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '42px' }}>
                    <Sliders size={14} color="var(--accent)" />
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="0.5"
                      value={delay} 
                      onChange={e => setDelay(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '900', minWidth: '35px', color: 'var(--accent)' }}>{delay}s</span>
                  </div>
                </div>
              </div>

              {/* Reply Creator (If action is reply or both) */}
              {(action === 'reply' || action === 'both') && (
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <label className="input-label" style={{ marginBottom: '10px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'PHRASES DE RÉPONSE (ALÉATOIRES)' : 'RESPONSE PHRASES (PICKED AT RANDOM)'}
                  </label>
                  
                  <div className="hub-input-row" style={{ marginBottom: '15px' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder={isFr ? 'Ajouter une réponse...' : 'Add a reply...'} 
                      value={newReplyText}
                      onChange={e => setNewReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addReplyToTempList(); }}
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center' }}
                      onClick={addReplyToTempList}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Temporary replies list */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
                    {currentReplies.map((r, i) => (
                      <div key={i} className="allow-copy" style={{ background: 'rgba(0, 210, 255, 0.08)', color: 'var(--accent)', border: '1px solid rgba(0, 210, 255, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                        <span>{r}</span>
                        <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeReplyFromTempList(i)} />
                      </div>
                    ))}
                    {currentReplies.length === 0 && (
                      <span style={{ fontSize: '11px', opacity: 0.3, alignSelf: 'center' }}>
                        {isFr ? 'Aucune phrase ajoutée (Requis)' : 'No responses added yet (Required)'}
                      </span>
                    )}
                  </div>

                  {/* Reply Mentions Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: 'white' }}>{isFr ? 'Mentionner l\'auteur' : 'Mention/Ping user'}</p>
                      <p style={{ fontSize: '9px', opacity: 0.4 }}>{isFr ? 'Active la notification de réponse' : 'Toggles active reply pings'}</p>
                    </div>
                    <div onClick={() => setReplyWithPing(!replyWithPing)} className={`nighty-toggle ${replyWithPing ? 'active' : ''}`} style={{ width: '35px', height: '18px' }}>
                      <div className="nighty-toggle-handle" style={{ width: '14px', height: '14px' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emoji Creator (If action is react or both) */}
              {(action === 'react' || action === 'both') && (
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '10px' }}>
                    {isFr ? 'ÉMOJI DE RÉACTION' : 'REACTION EMOJI'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder={isFr ? 'Ex: 👍, 🔥, 💀, ❤️' : 'E.g. 👍, 🔥, 💀, ❤️'} 
                      value={emoji}
                      onChange={e => setEmoji(e.target.value)}
                      style={{ width: '100%', paddingLeft: '45px' }}
                    />
                    <Smile size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button 
                onClick={addRule}
                disabled={!trigger.trim() || ((action === 'reply' || action === 'both') && currentReplies.length === 0) || ((action === 'react' || action === 'both') && !emoji.trim())}
                className="btn-primary" 
                style={{ width: '100%', height: '48px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px', gap: '8px' }}
              >
                <Plus size={16} />
                {isFr ? 'ENREGISTRER LA REGLE' : 'SAVE AUTO RESPONSE'}
              </button>
           </div>
        </div>

        {/* Global Settings & Algorithm */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
           {/* Global Settings */}
           <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '900', margin: 0 }}>
                  <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}><ShieldCheck size={18} /></div>
                  {isFr ? 'Paramètres Globaux' : 'Global Settings'}
                </h3>
                <div onClick={() => saveConfig({ ...config, enabled: !config.enabled })} className={`nighty-toggle ${config.enabled ? 'active' : ''}`} style={{ width: '44px', height: '22px', flexShrink: 0 }}>
                  <div className="nighty-toggle-handle" style={{ width: '16px', height: '16px' }}></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <HubToggleRow
                   title={isFr ? 'Mode AFK (Farmer Sync)' : 'AFK Mode (Farmer Sync)'}
                   description={isFr 
                     ? "Répond uniquement si le XP Farmer textuel est en cours d'exécution."
                     : "Only replies when the Text XP Farmer module is active."}
                   active={config.afkOnly}
                   onToggle={() => saveConfig({ ...config, afkOnly: !config.afkOnly })}
                 />

                 <HubToggleRow
                   title={isFr ? 'Canaux Privés (DMs Uniquement)' : 'Private Channels (DMs Only)'}
                   description={isFr 
                     ? "Ignore les serveurs publics pour éviter d'être banni." 
                     : "Ignores public servers to avoid detection and bans."}
                   active={config.dmOnly}
                   onToggle={() => saveConfig({ ...config, dmOnly: !config.dmOnly })}
                 />
              </div>
           </div>

           {/* Protection Info */}
           <div style={{ padding: '22px', background: 'rgba(var(--accent-rgb), 0.03)', borderRadius: '16px', border: '1px dashed rgba(var(--accent-rgb), 0.15)', display: 'flex', gap: '15px' }}>
              <AlertCircle size={22} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '11px', fontWeight: '900', marginBottom: '4px', letterSpacing: '0.5px', color: 'white' }}>
                   {isFr ? 'ALGORITHME ANTI-DÉTECTION' : 'ANTI-DETECTION PROTOCOL'}
                 </p>
                 <p style={{ fontSize: '10px', opacity: 0.5, lineHeight: '1.5', textTransform: 'none' }}>
                    {isFr 
                      ? "Chaque message envoyé intègre une signature humaine aléatoire avec jitter. Les réponses multiples pour une seule règle diminuent la récurrence de spam de votre compte Discord." 
                      : "Every message sent incorporates randomized human-like jitter. Having multiple answers per rule decreases detection recurrence on your Discord account."}
                 </p>
              </div>
           </div>
        </div>

      </div>

      {/* Rules List Section */}
      <div className="glass-card hub-raid-grid-full" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.02)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: '900' }}>
               <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}><MessageCircle size={18} /></div>
               {isFr ? 'Base de Règles Enregistrées' : 'Saved Auto-Response Rules'}
            </h3>
            <div style={{ fontSize: '10px', fontWeight: '900', opacity: 0.5, padding: '5px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
               RULES: {config.rules.length}
            </div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {config.rules.map((rule: any, i: number) => {
              const mode = rule.matchingMode || 'contains';
              const act = rule.action || 'reply';
              
              return (
                <div 
                  key={i} 
                  className="list-item" 
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '15px', 
                    transition: 'all 0.2s ease', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.02)',
                    borderRadius: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    
                    {/* Header Left: Trigger & Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span className="allow-copy" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb), 0.2)', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '950', letterSpacing: '0.5px' }}>
                        {rule.trigger}
                      </span>
                      
                      {/* Mode Badge */}
                      <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.5, textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '5px' }}>
                        {mode === 'regex' ? 'Regex' : mode === 'exact' ? (isFr ? 'Exact' : 'Exact Match') : (isFr ? 'Contient' : 'Contains')}
                      </span>

                      {/* Action Badge */}
                      <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.6, color: 'var(--accent)', textTransform: 'uppercase', background: 'rgba(0, 210, 255, 0.05)', padding: '3px 8px', borderRadius: '5px' }}>
                        {act === 'both' ? (isFr ? 'Texte + Émoji' : 'Text + Emoji') : act === 'react' ? (isFr ? 'Émoji' : 'Reaction') : (isFr ? 'Réponse' : 'Reply')}
                      </span>

                      {/* Delay Badge */}
                      <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.5, textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '5px' }}>
                        ⏱️ {rule.delay || 2}s
                      </span>

                      {/* Ping settings badge */}
                      {act !== 'react' && (
                        <span style={{ fontSize: '9px', fontWeight: '900', opacity: 0.5, color: rule.replyWithPing !== false ? 'var(--success)' : 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', padding: '3px 8px', borderRadius: '5px' }}>
                          {rule.replyWithPing !== false ? '@ping' : '@no-ping'}
                        </span>
                      )}
                    </div>

                    {/* Delete action */}
                    <button 
                      className="btn-danger" 
                      style={{ width: '32px', height: '32px', padding: 0, opacity: 0.5, transition: 'all 0.2s ease', flexShrink: 0, borderRadius: '8px' }} 
                      onClick={() => removeRule(i)}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Card Content details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '10px' }}>
                    {/* Replies */}
                    {rule.replies && rule.replies.length > 0 && (
                      <div>
                        <p style={{ fontSize: '10px', opacity: 0.4, fontWeight: '800', marginBottom: '8px' }}>
                          {isFr ? 'TEXTES DE RÉPONSE DISPONIBLES :' : 'AVAILABLE TEXT RESPONSES:'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {rule.replies.map((rep: string, rIdx: number) => (
                            <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                              <span className="allow-copy" style={{ color: 'white', opacity: 0.85 }}>{rep}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emoji Reaction */}
                    {(act === 'react' || act === 'both') && rule.emoji && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: rule.replies?.length > 0 ? '10px' : '0' }}>
                        <span style={{ fontSize: '10px', opacity: 0.4, fontWeight: '800' }}>
                          {isFr ? 'RÉACTION :' : 'REACTION:'}
                        </span>
                        <span style={{ fontSize: '16px' }}>{rule.emoji}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {config.rules.length === 0 && (
               <div style={{ padding: '60px', textAlign: 'center', opacity: 0.15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={50} style={{ marginBottom: '15px' }} />
                  <p style={{ fontWeight: '900', fontSize: '12px', letterSpacing: '2px' }}>
                    {isFr ? 'AUCUNE REGLE ACTIVE' : 'NO RULES DEFINED'}
                  </p>
                  <p style={{ fontSize: '10px', marginTop: '5px' }}>
                    {isFr ? 'Utilisez le studio ci-dessus pour configurer vos réponses automatiques.' : 'Use the rules creator panel above to configure your auto responders.'}
                  </p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
