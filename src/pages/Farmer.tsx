import React, { useState, useEffect } from 'react';
import { Radio, MessageSquare, Play, Square, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { HubSectionCard, HubToggleRow, HubFieldRow } from '@/components/layout/HubPageLayout';

interface FarmerStatus {
  status: 'idle' | 'hopping' | 'connected';
  uptime: number;
}

export const Farmer = () => {
  const { settings, updateSetting } = useSettingsStore();
  const isFr = settings.language === 'fr';

  const [status, setStatus] = useState<FarmerStatus>({ status: 'idle', uptime: 0 });
  const [newVcId, setNewVcId] = useState('');
  const [newMessageChannelId, setNewMessageChannelId] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [metadata, setMetadata] = useState<Record<string, { name: string; icon?: string; type: string }>>({});

  const rawConfig = settings.farmerConfig || {
    enabled: false,
    selectedAccountIds: [] as string[],
    vocalHopper: { enabled: false, channelIds: [] as string[], interval: 10, jitter: true },
    messageFarmer: { enabled: false, channelIds: [] as string[], phrases: [] as string[], delay: 60 },
    stealthMode: true
  };
  const config = {
    ...rawConfig,
    selectedAccountIds: rawConfig.selectedAccountIds ?? [],
    vocalHopper: rawConfig.vocalHopper ?? { enabled: false, channelIds: [], interval: 10, jitter: true },
  };

  const selectedAccounts = config.selectedAccountIds || [];

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await (window as any).electronAPI.getFarmerStatus();
      if (res.success) setStatus(res.data);
    };
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const resolve = async () => {
      const allIds = [
        ...(config.vocalHopper?.channelIds || []),
        ...config.messageFarmer.channelIds
      ];
      if (allIds.length === 0) return;
      const res = await window.electronAPI.resolveIds(allIds);
      if (res.success && res.data) {
        setMetadata(prev => ({ ...prev, ...res.data }));
      }
    };
    resolve();
  }, [config.vocalHopper?.channelIds, config.messageFarmer.channelIds]);

  const saveConfig = (newCfg: typeof config) => {
    updateSetting('farmerConfig', newCfg);
  };

  const toggleAccount = (id: string) => {
    const next = selectedAccounts.includes(id)
      ? selectedAccounts.filter(a => a !== id)
      : [...selectedAccounts, id];
    saveConfig({ ...config, selectedAccountIds: next });
  };

  const statusLabel = status.status === 'hopping'
    ? (isFr ? 'Hopping...' : 'Hopping...')
    : status.status === 'connected'
      ? (isFr ? 'Actif' : 'Active')
      : (isFr ? 'Inactif' : 'Inactive');

  return (
    <div className="hub-engine-grid custom-scrollbar">
      {/* Controls + Token selection */}
      <div className="hub-raid-grid-full" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: config.enabled ? 'var(--success)' : 'var(--text-dim)', boxShadow: config.enabled ? '0 0 8px var(--success)' : 'none' }} />
            <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{statusLabel}</span>
          </div>
          <button
            onClick={() => saveConfig({ ...config, enabled: !config.enabled })}
            className={config.enabled ? "btn-danger" : "btn-primary"}
            style={{ height: '38px', padding: '0 20px', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {config.enabled
              ? <><Square size={14} /> {isFr ? 'STOP TOUT' : 'STOP ALL'}</>
              : <><Play size={14} /> {isFr ? 'LANCER LE FARMING' : 'START FARMING'}</>}
          </button>
        </div>

        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label className="caption" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
              {isFr ? `SÉLECTION DES TOKENS (${selectedAccounts.length})` : `TOKEN SELECTION (${selectedAccounts.length})`}
            </label>
            <button
              type="button"
              onClick={() => saveConfig({ ...config, selectedAccountIds: settings.accounts?.map(acc => acc.id) || [] })}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '9px', height: '24px' }}
            >
              {isFr ? 'TOUS LES TOKENS' : 'ALL TOKENS'}
            </button>
          </div>
          <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }} className="custom-scrollbar">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {settings.accounts?.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => toggleAccount(acc.id)}
                  style={{
                    padding: '8px 12px',
                    background: selectedAccounts.includes(acc.id) ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedAccounts.includes(acc.id) ? 'var(--accent)' : 'var(--text-dim)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.username}</span>
                </div>
              ))}
              {(!settings.accounts || settings.accounts.length === 0) && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '10px', opacity: 0.4, fontSize: '10px' }}>
                  {isFr ? "Aucun compte configuré." : "No accounts configured."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VC HOPPER */}
      <HubSectionCard icon={Radio} glowColor="var(--accent)" title="VC HOPPER (AFK Voice)" className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? 'Rotation automatique entre salons vocaux' : 'Automatic rotation between voice channels'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <HubToggleRow
            title={isFr ? 'Activer VC Hopper' : 'Enable VC Hopper'}
            description={config.vocalHopper?.enabled
              ? (isFr ? 'Hopper vocal actif' : 'Voice hopper active')
              : (isFr ? 'Hopper vocal inactif' : 'Voice hopper inactive')}
            active={!!config.vocalHopper?.enabled}
            onToggle={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, enabled: !config.vocalHopper.enabled } })}
          />

          <HubFieldRow label={isFr ? 'SALON(S) VOCAL' : 'VOICE CHANNEL(S)'}>
            <div className="hub-input-row">
              <input type="text" className="input-field settings-select" placeholder="ID..." value={newVcId} onChange={e => setNewVcId(e.target.value)} />
              <button type="button" className="btn-primary" style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center' }} onClick={() => {
                if (newVcId) {
                  saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: [...(config.vocalHopper?.channelIds || []), newVcId] } });
                  setNewVcId('');
                }
              }}><Plus size={16} /></button>
            </div>
            <div style={{ marginTop: '12px', height: '100px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
              {(config.vocalHopper?.channelIds || []).map((id: string, i: number) => {
                const info = metadata[id];
                return (
                  <div key={id + i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info ? info.name : id}</span>
                    <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.5, flexShrink: 0 }} onClick={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, channelIds: config.vocalHopper.channelIds.filter((_: string, idx: number) => idx !== i) } })} />
                  </div>
                );
              })}
              {(config.vocalHopper?.channelIds || []).length === 0 && (
                <p style={{ fontSize: '10px', opacity: 0.3, textAlign: 'center', marginTop: '20px' }}>
                  {isFr ? 'Aucun salon vocal' : 'No voice channels'}
                </p>
              )}
            </div>
          </HubFieldRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HubFieldRow label={isFr ? 'INTERVALLE (MIN)' : 'INTERVAL (MIN)'}>
              <input type="number" className="input-field settings-select" value={config.vocalHopper?.interval ?? 10} onChange={e => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, interval: parseInt(e.target.value) || 1 } })} style={{ width: '100%' }} />
            </HubFieldRow>
            <HubToggleRow
              title="Jitter"
              description={isFr ? '+/- 1 min aléatoire' : '+/- 1 min random'}
              active={!!config.vocalHopper?.jitter}
              onToggle={() => saveConfig({ ...config, vocalHopper: { ...config.vocalHopper, jitter: !config.vocalHopper.jitter } })}
            />
          </div>
        </div>
      </HubSectionCard>

      {/* XP FARMER */}
      <HubSectionCard icon={MessageSquare} glowColor="var(--accent)" title="XP FARMER (Text Output)" className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? 'Envoi automatique de phrases aléatoires' : 'Automatic sending of random phrases'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <HubToggleRow
            title={isFr ? 'Activer XP Farmer' : 'Enable XP Farmer'}
            description={config.messageFarmer.enabled
              ? (isFr ? 'XP Farmer en cours' : 'XP Farmer active')
              : (isFr ? 'XP Farmer inactif' : 'XP Farmer inactive')}
            active={config.messageFarmer.enabled}
            onToggle={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, enabled: !config.messageFarmer.enabled } })}
          />

          <HubFieldRow label={isFr ? 'SALON(S) CIBLE' : 'TARGET CHANNEL(S)'}>
            <div className="hub-input-row">
              <input type="text" className="input-field settings-select" placeholder="ID..." value={newMessageChannelId} onChange={e => setNewMessageChannelId(e.target.value)} />
              <button type="button" className="btn-primary" style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center' }} onClick={() => { if (newMessageChannelId) { saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: [...config.messageFarmer.channelIds, newMessageChannelId] } }); setNewMessageChannelId(''); } }}><Plus size={16} /></button>
            </div>
            <div style={{ marginTop: '12px', height: '100px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
              {config.messageFarmer.channelIds.map((id: string, i: number) => {
                const info = metadata[id];
                return (
                  <div key={id + i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info ? info.name : id}</span>
                    <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.5, flexShrink: 0 }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, channelIds: config.messageFarmer.channelIds.filter((_: string, idx: number) => idx !== i) } })} />
                  </div>
                );
              })}
              {config.messageFarmer.channelIds.length === 0 && (
                <p style={{ fontSize: '10px', opacity: 0.3, textAlign: 'center', marginTop: '20px' }}>
                  {isFr ? 'Aucun salon' : 'No channels'}
                </p>
              )}
            </div>
          </HubFieldRow>

          <HubFieldRow label={isFr ? 'DÉLAI (SEC)' : 'DELAY (SEC)'} hint={isFr ? 'Recommandé : 60s par message' : 'Recommended: 60s per message'}>
            <input type="number" className="input-field settings-select" value={config.messageFarmer.delay} onChange={e => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, delay: parseInt(e.target.value) || 1 } })} style={{ width: '100%' }} />
          </HubFieldRow>

          <HubFieldRow label={isFr ? 'PHRASES ALÉATOIRES' : 'RANDOM PHRASES'}>
            <div className="hub-input-row">
              <input type="text" className="input-field settings-select" placeholder="Yo / Salut / .xp ..." value={newPhrase} onChange={e => setNewPhrase(e.target.value)} />
              <button type="button" className="btn-primary" style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center' }} onClick={() => { if (newPhrase) { saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: [...config.messageFarmer.phrases, newPhrase] } }); setNewPhrase(''); } }}><Plus size={18} /></button>
            </div>
          </HubFieldRow>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
            {config.messageFarmer.phrases.map((p: string, i: number) => (
              <div key={i} style={{ background: 'rgba(var(--accent-rgb), 0.08)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
                {p} <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => saveConfig({ ...config, messageFarmer: { ...config.messageFarmer, phrases: config.messageFarmer.phrases.filter((_: string, idx: number) => idx !== i) } })} />
              </div>
            ))}
          </div>
        </div>
      </HubSectionCard>

      {/* SECURITY */}
      <div className="hub-raid-grid-full">
        <HubSectionCard icon={AlertTriangle} iconColor="var(--danger)" glowColor="var(--danger)" title={isFr ? 'SÉCURITÉ ANTI-DÉTECTION (OPSEC)' : 'ANTI-DETECTION SECURITY (OPSEC)'} className="animate-fade-in">
          <HubToggleRow
            title={isFr ? 'Mode Stealth' : 'Stealth Mode'}
            description={isFr
              ? 'Self-Deaf et Self-Mute au niveau Gateway — simule une inactivité humaine parfaite'
              : 'Self-Deaf and Self-Mute at Gateway level — simulates perfect human inactivity'}
            active={config.stealthMode}
            onToggle={() => saveConfig({ ...config, stealthMode: !config.stealthMode })}
            accent="var(--danger)"
          />
        </HubSectionCard>
      </div>
    </div>
  );
};
