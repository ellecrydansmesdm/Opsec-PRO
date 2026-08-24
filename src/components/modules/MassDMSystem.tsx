import React, { useState } from 'react';
import { MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { HubSectionCard } from '@/components/layout/HubPageLayout';
import { audioService } from '@/services/AudioService';

interface MassDMSystemProps {
  showToast: (message: string, type?: 'success' | 'danger') => void;
  onConfirm: (data: any) => void;
}

export const MassDMSystem: React.FC<MassDMSystemProps> = ({ showToast, onConfirm }) => {
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';

  const [dmAllText, setDmAllText] = useState("Hello {user} !");
  const [sendingDmAll, setSendingDmAll] = useState(false);
  const [dmAllTarget, setDmAllTarget] = useState<'all' | 'friends' | 'groups'>('all');
  const [dmAllDelay, setDmAllDelay] = useState(2000);
  const [dmAllPauseInterval, setDmAllPauseInterval] = useState(10);
  const [dmAllPauseDuration, setDmAllPauseDuration] = useState(10000);

  const handleStopDMAll = async () => {
    audioService.play('module_stop');
    await window.electronAPI.stopDMAll();
    setSendingDmAll(false);
  };

  return (
    <HubSectionCard icon={MessageSquare} glowColor="var(--accent)" title={isFr ? 'DM ALL (DIFFUSION DE MASSE)' : 'MASS DM (BROADCAST)'} className="animate-fade-in">
      <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
        {isFr ? 'Envoyez un message privé à tous vos contacts ou groupes avec gestion anti-captcha' : 'Broadcast a private message across your friends or groups with anti-captcha support'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ 
          padding: '12px', 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          borderRadius: '10px', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: '800', fontSize: '11px' }}>
            <AlertTriangle size={14} />
            <span>{isFr ? 'ATTENTION CAPTCHA REQUIS' : 'WARNING CAPTCHA REQUIRED'}</span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.4', margin: 0 }}>
            {isFr 
              ? "L'envoi de messages à des utilisateurs avec qui vous n'avez jamais discuté déclenchera un Captcha à 100% de la part de Discord. Assurez-vous d'avoir configuré un solveur dans Network Hub." 
              : "Sending messages to users you have never chatted with will trigger a 100% Captcha from Discord. Make sure a solver is configured in Network Hub."}
          </p>
        </div>

        <textarea 
          value={dmAllText} 
          onChange={e => setDmAllText(e.target.value)} 
          placeholder={isFr ? 'Message... {user} pour mention' : 'Message... {user} for mention'} 
          style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.6 }}>{isFr ? 'CIBLE DE DIFFUSION' : 'BROADCAST TARGET'}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {(['all', 'friends', 'groups'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setDmAllTarget(t)}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  background: dmAllTarget === t ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${dmAllTarget === t ? 'var(--accent)' : 'var(--border)'}`,
                  color: dmAllTarget === t ? 'var(--accent)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  transition: '0.2s',
                  fontWeight: 'bold'
                }}
              >
                {t === 'all' ? (isFr ? 'TOUS (ALL)' : 'ALL') : t === 'friends' ? (isFr ? 'AMIS' : 'FRIENDS') : (isFr ? 'GROUPES' : 'GROUPS')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10px', fontWeight: 'bold' }}>
              <span style={{ opacity: 0.5 }}>{isFr ? 'DÉLAI' : 'DELAY'}</span>
              <span style={{ color: 'var(--accent)' }}>{dmAllDelay}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="15000"
              step="100"
              value={dmAllDelay}
              onChange={e => setDmAllDelay(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10px', fontWeight: 'bold' }}>
              <span style={{ opacity: 0.5 }}>{isFr ? 'PAUSE TOUS LES' : 'PAUSE EVERY'}</span>
              <span style={{ color: 'var(--accent)' }}>{dmAllPauseInterval} DMs</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={dmAllPauseInterval}
              onChange={e => setDmAllPauseInterval(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10px', fontWeight: 'bold' }}>
            <span style={{ opacity: 0.5 }}>{isFr ? 'DURÉE DE LA PAUSE' : 'PAUSE DURATION'}</span>
            <span style={{ color: 'var(--accent)' }}>{dmAllPauseDuration / 1000}s</span>
          </div>
          <input
            type="range"
            min="500"
            max="30000"
            step="500"
            value={dmAllPauseDuration}
            onChange={e => setDmAllPauseDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </div>
        
        <button 
          onClick={sendingDmAll ? handleStopDMAll : () => {
            if (!dmAllText.trim()) {
              showToast(isFr ? 'Veuillez entrer un message pour le DM ALL !' : 'Please enter a message for DM ALL!', 'danger');
              return;
            }
            onConfirm({
              isOpen: true, 
              title: 'DM ALL', 
              message: isFr ? 'Voulez-vous envoyer ce message à vos cibles sélectionnées ?' : 'Do you want to send this message to your selected targets?',
              onConfirm: async () => { 
                setSendingDmAll(true); 
                audioService.play('module_launch');
                await window.electronAPI.dmAllFriends({ 
                  message: dmAllText,
                  target: dmAllTarget,
                  delay: dmAllDelay,
                  pauseInterval: dmAllPauseInterval,
                  pauseDuration: dmAllPauseDuration
                }); 
                setSendingDmAll(false); 
                audioService.play('module_complete');
              },
              type: 'danger'
            });
          }} 
          className="btn-primary" 
          style={{ 
            width: '100%', 
            padding: '14px',
            marginTop: '5px', 
            background: sendingDmAll ? 'var(--danger)' : 'var(--accent)', 
            boxShadow: sendingDmAll ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)' 
          }}
        >
          {sendingDmAll ? <RefreshCw className="animate-spin" size={16} /> : <MessageSquare size={16} />}
          <span style={{ marginLeft: '8px', fontWeight: '900' }}>
            {sendingDmAll 
              ? (isFr ? 'ARRÊTER LE DM ALL' : 'STOP DM ALL') 
              : (isFr ? 'DÉMARRER LE DM ALL' : 'START DM ALL')}
          </span>
        </button>
      </div>
    </HubSectionCard>
  );
};
