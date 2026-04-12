import React, { useState } from 'react';
import { Trash2, AlertTriangle, Activity, RefreshCw, ShieldCheck, Zap, UserPlus, Volume2, Users, MessageSquare, X, Check } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { DoubleChannelSelector } from "@/components/ui/DoubleChannelSelector";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useLogsStore } from "@/store/useLogsStore";
import { SpamSystem } from "@/components/modules/SpamSystem";

interface ModulesProps {
  onConfirm: (data: any) => void;
}

export const Modules = ({ onConfirm }: ModulesProps) => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const { addLog } = useLogsStore();

  const [purgeChannelId, setPurgeChannelId] = useState<string>(() => {
    const last = localStorage.getItem('lastPurgeChannel');
    return (last && last !== "null" && last !== "undefined") ? last : '';
  });
  const [amount, setAmount] = useState(50);
  const [purgeDelay, setPurgeDelay] = useState(1500);
  const [purging, setPurging] = useState(false);
  
  // Selection States
  const [selectionItems, setSelectionItems] = useState<any[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<'friends' | 'groups'>('friends');
  const [isProcessingFriends, setIsProcessingFriends] = useState(false);
  const [isProcessingGroups, setIsProcessingGroups] = useState(false);

  const [dmAllText, setDmAllText] = useState("Hello {user} !");
  const [sendingDmAll, setSendingDmAll] = useState(false);
  const [isClosingDMs, setIsClosingDMs] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  // Security: Reset targets when switching accounts
  React.useEffect(() => {
    setPurgeChannelId('');
    localStorage.removeItem('lastPurgeChannel');
  }, [user?.id]);

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ message, type });
    if (type === 'danger') {
        addLog({ 
            msg: message, 
            type: 'error', 
            time: new Date().toLocaleTimeString() 
        });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handlePurge = async () => {
    if (purging) {
      await window.electronAPI.stopPurge();
      setPurging(false);
      return;
    }
    if (!purgeChannelId || purgeChannelId.trim() === '') {
      showToast('Veuillez sélectionner un salon cible pour la purge !', 'danger');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Veuillez spécifier un nombre de messages à supprimer !', 'danger');
      return;
    }
    setPurging(true);
    localStorage.setItem('lastPurgeChannel', purgeChannelId);
    await window.electronAPI.startPurge({ 
        channelId: purgeChannelId, 
        amount, 
        purgeAll: settings.adminPurge, 
        delay: purgeDelay 
    });
    setPurging(false);
  };

  const handleStopSanitizer = async () => {
    await window.electronAPI.stopSanitizer();
    setIsProcessingFriends(false);
    setIsProcessingGroups(false);
  };

  const handleStopDMAll = async () => {
    await window.electronAPI.stopDMAll();
    setSendingDmAll(false);
  };

  const openFriendsSelection = async () => {
    const res = await window.electronAPI.getFriendsList();
    if (res.success && res.data) {
      setSelectionItems(res.data.map((f: any) => ({ id: f.id, name: f.username, avatar: f.avatar })));
      setSelectionType('friends');
      setIsSelectionModalOpen(true);
    }
  };

  const openGroupsSelection = async () => {
    const res = await window.electronAPI.getGroupsList();
    if (res.success && res.data) {
      setSelectionItems(res.data.map((g: any) => ({ id: g.id, name: g.name })));
      setSelectionType('groups');
      setIsSelectionModalOpen(true);
    }
  };

  const handleSelectionConfirm = (ids: string[], silent?: boolean) => {
    setIsSelectionModalOpen(false);
    
    if (ids.length === 0) {
      showToast('Veuillez sélectionner au moins une cible !', 'danger');
      return;
    }

    onConfirm({
      isOpen: true,
      title: selectionType === 'friends' ? 'Suppression d\'amis' : 'Départ des groupes',
      message: `Voulez-vous vraiment ${selectionType === 'friends' ? `supprimer ${ids.length} amis` : `quitter ${ids.length} groupes`} ${silent ? 'en toute discrétion ' : ''}? Cette action est irréversible.`,
      onConfirm: async () => {
        try {
          if (selectionType === 'friends') setIsProcessingFriends(true);
          else setIsProcessingGroups(true);

          if (selectionType === 'friends') {
            const res = await window.electronAPI.deleteAllFriends(ids);
            if (res.success && res.data) showToast(`Succès : ${res.data.count} amis supprimés`);
          } else {
            const res = await window.electronAPI.leaveAllGroups(ids, silent);
            if (res.success && res.data) showToast(`Succès : ${res.data.count} groupes quittés`);
          }
        } catch (err: any) {
          showToast(`Erreur : ${err.message || "Opération échouée"}`, "danger");
        } finally {
          setIsProcessingFriends(false);
          setIsProcessingGroups(false);
        }
      },
      type: 'danger'
    });
  };

  return (
    <div 
      className="custom-scrollbar modules-grid" 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
        gridAutoFlow: 'dense',
        gap: '24px', 
        padding: '10px 10px 80px 10px' 
      }}
    >
      
      {/* Mass Clear Card */}
      <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}><Trash2 size={22} /></div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Mass Clear Pro</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Optimized Deletion Algorithm</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <DoubleChannelSelector onSelect={(id) => setPurgeChannelId(id)} currentId={purgeChannelId} />
          
          <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="caption">Messages à supprimer</span>
                <span style={{ color: 'var(--accent)', fontWeight: '900' }}>{amount >= 1000 ? 'ALL' : amount}</span>
            </div>
            <input type="range" min="1" max="1000" value={amount} onChange={(e) => setAmount(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="caption">Délai entre suppression</span>
                <span style={{ color: purgeDelay < 500 ? 'var(--warning)' : 'var(--accent)', fontWeight: '900' }}>{purgeDelay}ms</span>
            </div>
            <input type="range" min="100" max="5000" step="100" value={purgeDelay} onChange={(e) => setPurgeDelay(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
            {purgeDelay < 500 && <p style={{ fontSize: '9px', color: 'var(--warning)', marginTop: '5px' }}>⚠️ Risque de rate-limit en dessous de 500ms</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
              <ShieldCheck size={16} color={settings.adminPurge ? "var(--success)" : "var(--text-dim)"} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin Purge</span>
                <span style={{ fontSize: '8px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Supprimer tous les messages</span>
              </div>
            </div>
            <div onClick={() => updateSetting('adminPurge', !settings.adminPurge)} className={`nighty-toggle ${settings.adminPurge ? 'active' : ''}`} style={{ flexShrink: 0 }}>
              <div className="nighty-toggle-handle"></div>
            </div>
          </div>

          <button 
            onClick={handlePurge} 
            className="btn-primary" 
            style={{ 
              width: '100%', 
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
            {purging ? 'Arrêter la Purge' : 'Lancer la Purge'}
          </button>
        </div>
      </div>

      {/* Account Sanitizer Card */}
      <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', animationDelay: '0.1s' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--danger)', boxShadow: '0 0 15px var(--danger-glow)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: 'var(--danger)', boxShadow: '0 0 20px var(--danger-glow)' }}><AlertTriangle size={22} /></div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Account Sanitizer</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Clean & Refresh Operations</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <button 
              onClick={openGroupsSelection} 
              disabled={isProcessingGroups || isProcessingFriends}
              className="btn-primary" 
              style={{ 
                background: (isProcessingGroups || isProcessingFriends) ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.05)', 
                color: (isProcessingGroups || isProcessingFriends) ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                opacity: isProcessingFriends ? 0.4 : 1
              }}
            >
              {isProcessingGroups ? <RefreshCw className="animate-spin" size={14} /> : <MessageSquare size={14} />}
              {isProcessingGroups ? 'En cours...' : 'Quitter Groupes'}
            </button>
            
            <button 
              onClick={openFriendsSelection} 
              disabled={isProcessingFriends || isProcessingGroups}
              className="btn-primary" 
              style={{ 
                background: (isProcessingFriends || isProcessingGroups) ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.05)', 
                color: (isProcessingFriends || isProcessingGroups) ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                opacity: isProcessingGroups ? 0.4 : 1
              }}
            >
              {isProcessingFriends ? <RefreshCw className="animate-spin" size={14} /> : <Users size={14} />}
              {isProcessingFriends ? 'En cours...' : 'Vider les Amis'}
            </button>

            <button 
              onClick={() => {
                onConfirm({
                  isOpen: true,
                  title: 'Fermer tous les DMs',
                  message: 'Voulez-vous vraiment fermer TOUTES vos conversations privées ? Cette action est irréversible.',
                  onConfirm: async () => {
                    setIsClosingDMs(true);
                    const res = await window.electronAPI.closeAllDMs();
                    setIsClosingDMs(false);
                    if (res.success && res.data) {
                      showToast(`${res.data.count} conversations fermées.`);
                    } else {
                      showToast(res.error || 'Erreur lors de la fermeture des DMs', 'danger');
                    }
                  },
                  type: 'danger'
                });
              }} 
              disabled={isClosingDMs}
              className="btn-primary" 
              style={{ 
                gridColumn: 'span 2',
                background: isClosingDMs ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.05)', 
                color: isClosingDMs ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px'
              }}
            >
              {isClosingDMs ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {isClosingDMs ? 'Nettoyage en cours...' : 'Fermer tous les DMs'}
            </button>
          </div>
          
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px solid var(--border)' }}>
             <label className="caption" style={{ display: 'block', marginBottom: '10px' }}>DM ALL (Amis & Groupes)</label>
             <textarea value={dmAllText} onChange={e => setDmAllText(e.target.value)} placeholder="Message... {user} pour mention" style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '11px', resize: 'none' }} />
             
             <button 
              onClick={sendingDmAll ? handleStopDMAll : () => {
                if (!dmAllText.trim()) {
                  showToast('Veuillez entrer un message pour le DM ALL !', 'danger');
                  return;
                }
                onConfirm({
                  isOpen: true, 
                  title: 'DM ALL', 
                  message: `Voulez-vous envoyer ce message à TOUS vos amis et groupes ?`,
                  onConfirm: async () => { 
                    setSendingDmAll(true); 
                    await window.electronAPI.dmAllFriends({ message: dmAllText }); 
                    setSendingDmAll(false); 
                  },
                  type: 'danger'
                });
              }} 
             className="btn-primary" 
             style={{ 
               width: '100%', 
               marginTop: '15px', 
               background: sendingDmAll ? 'var(--danger)' : 'var(--accent)', 
               boxShadow: sendingDmAll ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)' 
             }}
            >
               {sendingDmAll ? 'Arrêter le DM ALL' : 'Démarrer le DM ALL'}
             </button>
          </div>
        </div>
      </div>

      {/* Advanced Cyberpunk Spam Module */}
      <div style={{ gridColumn: '1 / -1' }}>
        <SpamSystem showToast={showToast} />
      </div>


      {/* Spotify Lyrics Card */}
      <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', animationDelay: '0.3s' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#1DB954', boxShadow: '0 0 15px #1DB954' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ padding: '12px', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '12px', color: '#1DB954', boxShadow: '0 0 20px rgba(29, 185, 84, 0.4)' }}>
            <Activity size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Spotify Sync</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Real-time Lyrics Status</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>Paroles en Temps Réel</p>
              <p className="caption" style={{ opacity: 0.4, textTransform: 'none', fontSize: '10px', lineHeight: '1.4', marginTop: '5px' }}>
                Opsec Pro utilise LRCLIB pour afficher les paroles en temps réel sur votre statut Discord. Plus besoin de cookie !
              </p>
            </div>
            <div 
              onClick={async () => {
                const newState = !settings.spotifyLyricsEnabled;
                updateSetting('spotifyLyricsEnabled', newState);
                await window.electronAPI.toggleSpotifyLyrics({ enabled: newState, cookie: settings.spotifyCookie });
                showToast(newState ? "Lyrics Status Activé" : "Lyrics Status Désactivé", newState ? 'success' : 'danger');
              }} 
              className={`nighty-toggle ${settings.spotifyLyricsEnabled ? 'active' : ''}`}
              style={{ '--accent': '#1DB954' } as any}
            >
              <div className="nighty-toggle-handle"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Modal Integration */}
      <SelectionModal 
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onConfirm={handleSelectionConfirm}
        items={selectionItems}
        title={selectionType === 'friends' ? 'Sélectionner les amis' : 'Sélectionner les groupes'}
        type={selectionType}
      />

      {/* Premium Notification Toast (Bottom Center) */}
      {toast && (
        <div className="animate-slide-up-toast" style={{
          position: 'fixed',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 10, 15, 0.95)',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '50px',
          zIndex: 999999,
          boxShadow: toast.type === 'danger' ? '0 0 30px rgba(239, 68, 68, 0.2)' : '0 0 30px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: `1px solid ${toast.type === 'danger' ? 'var(--danger)' : 'var(--success)'}`,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: toast.type === 'danger' ? 'var(--danger)' : 'var(--success)',
            boxShadow: `0 0 10px ${toast.type === 'danger' ? 'var(--danger)' : 'var(--success)'}`
          }} />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            letterSpacing: '0.01em' 
          }}>
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
};
