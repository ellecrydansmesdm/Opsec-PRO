import React, { useState } from 'react';
import { Trash2, Zap, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { DoubleChannelSelector } from '@/components/ui/DoubleChannelSelector';
import { HubSectionCard, HubToggleRow } from '@/components/layout/HubPageLayout';
import { audioService } from '@/services/AudioService';
import { useActionValidator } from '@/hooks/useActionValidator';

interface MassPurgeSystemProps {
  showToast: (message: string, type?: 'success' | 'danger') => void;
  onConfirm: (data: any) => void;
}

export const MassPurgeSystem: React.FC<MassPurgeSystemProps> = ({ showToast, onConfirm }) => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const isFr = settings.language === 'fr';

  const [purgeChannelId, setPurgeChannelId] = useState<string>(() => {
    const last = localStorage.getItem('lastPurgeChannel');
    return (last && last !== "null" && last !== "undefined") ? last : '';
  });
  const [amount, setAmount] = useState(50);
  const [purgeDelay, setPurgeDelay] = useState(1500);
  const [purging, setPurging] = useState(false);

  React.useEffect(() => {
    setPurgeChannelId('');
    localStorage.removeItem('lastPurgeChannel');
  }, [user?.id]);

  const { validateTarget } = useActionValidator(showToast);

  const handlePurge = async () => {
    if (purging) {
      audioService.play('module_stop');
      await window.electronAPI.stopPurge();
      setPurging(false);
      return;
    }
    if (!validateTarget(purgeChannelId, 'Mass Purge')) return;
    
    if (!amount || amount <= 0) {
      audioService.play('log_error_critical');
      showToast(isFr ? 'Veuillez spécifier un nombre de messages à supprimer !' : 'Please specify a number of messages to delete!', 'danger');
      return;
    }
    
    audioService.play('module_launch');
    setPurging(true);
    localStorage.setItem('lastPurgeChannel', purgeChannelId);
    await window.electronAPI.startPurge({ 
        channelId: purgeChannelId, 
        amount, 
        purgeAll: settings.adminPurge, 
        delay: purgeDelay 
    });
    audioService.play('module_complete');
    setPurging(false);
  };

  const handlePurgeServer = async () => {
    if (purging) {
      audioService.play('module_stop');
      await window.electronAPI.stopPurge();
      setPurging(false);
      return;
    }
    
    if (!validateTarget(purgeChannelId, 'Server Purge')) return;
    
    if (!amount || amount <= 0) {
      audioService.play('log_error_critical');
      showToast(isFr ? 'Veuillez spécifier un nombre de messages à supprimer !' : 'Please specify a number of messages to delete!', 'danger');
      return;
    }

    onConfirm({
      isOpen: true,
      title: isFr ? "Purge de Serveur Entier" : "Entire Server Purge",
      message: isFr 
        ? "Voulez-vous VRAIMENT purger tous les salons de ce serveur ? Cette action peut prendre du temps."
        : "Do you REALLY want to purge all channels in this server? This action can take time.",
      onConfirm: async () => {
        audioService.play('module_launch');
        setPurging(true);
        localStorage.setItem('lastPurgeChannel', purgeChannelId);
        await window.electronAPI.startPurgeServer({ 
            serverId: purgeChannelId, 
            amount, 
            purgeAll: settings.adminPurge, 
            delay: purgeDelay 
        });
        audioService.play('module_complete');
        setPurging(false);
      },
      type: 'danger'
    });
  };

  return (
    <HubSectionCard icon={Trash2} glowColor="var(--accent)" title={isFr ? 'VIDER LE SALON / PURGE MASSE' : 'CLEAR CHANNEL / MASS PURGE'} className="animate-fade-in">
      <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
        {isFr ? 'Suppression ultra-rapide de messages ciblés ou de salons entiers' : 'Ultra-fast deletion of targeted messages or entire channels'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <DoubleChannelSelector onSelect={(id) => setPurgeChannelId(id)} currentId={purgeChannelId} />
        
        <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="caption">{isFr ? 'Messages à supprimer' : 'Messages to delete'}</span>
              <span style={{ color: 'var(--accent)', fontWeight: '900' }}>{amount >= 1000 ? 'ALL' : amount}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="1000" 
            value={amount} 
            onChange={(e) => setAmount(parseInt(e.target.value))} 
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="caption">{isFr ? 'Délai entre suppressions' : 'Delay between deletions'}</span>
              <span style={{ color: purgeDelay < 500 ? 'var(--warning)' : 'var(--accent)', fontWeight: '900' }}>{purgeDelay}ms</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="5000" 
            step="50" 
            value={purgeDelay} 
            onChange={(e) => setPurgeDelay(parseInt(e.target.value))} 
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', boxSizing: 'border-box' }} 
          />
          {purgeDelay < 500 && (
            <p style={{ fontSize: '9px', color: 'var(--warning)', marginTop: '5px' }}>
              {isFr ? '⚠️ Risque de rate-limit en dessous de 500ms' : '⚠️ Rate-limit risk below 500ms'}
            </p>
          )}
        </div>

        <HubToggleRow
          title="Admin Purge"
          description={settings.adminPurge 
            ? (isFr ? "Supprime TOUS les messages du salon (y compris ceux des autres)" : "Deletes ALL messages from the channel (including others)") 
            : (isFr ? "Supprime uniquement VOS messages (plus sûr)" : "Only deletes YOUR messages (safer)")}
          active={settings.adminPurge}
          onToggle={() => updateSetting('adminPurge', !settings.adminPurge)}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handlePurge} 
            className="btn-primary" 
            style={{ 
              flex: 1, 
              padding: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              background: purging ? 'var(--danger)' : 'var(--accent)',
              boxShadow: purging ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)'
            }}
          >
            {purging ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
            {purging 
              ? (isFr ? 'Arrêter la Purge' : 'Stop Purge') 
              : (isFr ? 'Lancer la Purge' : 'Start Purge')}
          </button>
          <button 
            onClick={handlePurgeServer} 
            className="btn-primary" 
            style={{ 
              flex: 1, 
              padding: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              background: purging ? 'var(--danger)' : '#8b5cf6',
              boxShadow: purging ? '0 0 20px var(--danger-glow)' : '0 0 20px rgba(139, 92, 246, 0.4)'
            }}
          >
            {purging ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
            {purging 
              ? (isFr ? 'Arrêter' : 'Stop') 
              : (isFr ? 'Purge Serveur Entier' : 'Purge Entire Server')}
          </button>
        </div>
      </div>
    </HubSectionCard>
  );
};
