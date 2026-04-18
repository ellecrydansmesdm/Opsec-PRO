import React, { useState } from 'react';
import { Trash2, AlertTriangle, Activity, RefreshCw, ShieldCheck, Zap, UserPlus, Volume2, Users, MessageSquare, X, Check, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { DoubleChannelSelector } from "@/components/ui/DoubleChannelSelector";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useLogsStore } from "@/store/useLogsStore";
import { SpamSystem } from "@/components/modules/SpamSystem";
import { PomeloSniper } from "@/components/modules/PomeloSniper";
import { audioService } from '@/services/AudioService';
import { useActionValidator } from '@/hooks/useActionValidator';

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
  const [selectionType, setSelectionType] = useState<'friends' | 'groups' | 'servers'>('friends');
  const [isProcessingFriends, setIsProcessingFriends] = useState(false);
  const [isProcessingGroups, setIsProcessingGroups] = useState(false);
  const [isProcessingServers, setIsProcessingServers] = useState(false);

  const [dmAllText, setDmAllText] = useState("Hello {user} !");
  const [sendingDmAll, setSendingDmAll] = useState(false);
  const [isClosingDMs, setIsClosingDMs] = useState(false);
  const [isSyncingSelection, setIsSyncingSelection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  const currentAccount = React.useMemo(() => settings.accounts?.find(a => a.id === user?.id), [settings.accounts, user?.id]);
  const rotator = currentAccount?.rotator;

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
      audioService.play('error');
      showToast('Veuillez spécifier un nombre de messages à supprimer !', 'danger');
      return;
    }
    
    audioService.play('module_start');
    setPurging(true);
    localStorage.setItem('lastPurgeChannel', purgeChannelId);
    await window.electronAPI.startPurge({ 
        channelId: purgeChannelId, 
        amount, 
        purgeAll: settings.adminPurge, 
        delay: purgeDelay 
    });
    audioService.play('success');
    setPurging(false);
  };

  const handleStopSanitizer = async () => {
    await window.electronAPI.stopSanitizer();
    setIsProcessingFriends(false);
    setIsProcessingGroups(false);
    setIsProcessingServers(false);
  };

  const handleStopDMAll = async () => {
    audioService.play('module_stop');
    await window.electronAPI.stopDMAll();
    setSendingDmAll(false);
  };

   const openFriendsSelection = async () => {
    setIsSyncingSelection(true);
    const res = await window.electronAPI.getFriendsList();
    setIsSyncingSelection(false);
    if (res.success && res.data) {
      setSelectionItems(res.data.map((f: any) => ({ id: f.id, name: f.username, avatar: f.avatar })));
      setSelectionType('friends');
      setIsSelectionModalOpen(true);
    }
  };

  const openGroupsSelection = async () => {
    setIsSyncingSelection(true);
    const res = await window.electronAPI.getGroupsList();
    setIsSyncingSelection(false);
    if (res.success && res.data) {
      setSelectionItems(res.data.map((g: any) => ({ id: g.id, name: g.name })));
      setSelectionType('groups');
      setIsSelectionModalOpen(true);
    }
  };

  const openServersSelection = async () => {
    setIsSyncingSelection(true);
    const res = await window.electronAPI.getServersList();
    setIsSyncingSelection(false);
    if (res.success && res.data) {
      setSelectionItems(res.data.map((s: any) => ({ id: s.id, name: s.name, avatar: s.icon })));
      setSelectionType('servers');
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
      title: selectionType === 'friends' ? 'Suppression d\'amis' : selectionType === 'groups' ? 'Départ des groupes' : 'Départ des serveurs',
      message: `Voulez-vous vraiment ${selectionType === 'friends' ? `supprimer ${ids.length} amis` : selectionType === 'groups' ? `quitter ${ids.length} groupes` : `quitter ${ids.length} serveurs`} ${silent ? 'en toute discrétion ' : ''}? Cette action est irréversible.`,
      onConfirm: async () => {
        try {
          if (selectionType === 'friends') setIsProcessingFriends(true);
          else if (selectionType === 'groups') setIsProcessingGroups(true);
          else setIsProcessingServers(true);

          if (selectionType === 'friends') {
            const res = await window.electronAPI.deleteAllFriends(ids);
            if (res.success && res.data) showToast(`Succès : ${res.data.count} amis supprimés`);
          } else if (selectionType === 'groups') {
            const res = await window.electronAPI.leaveAllGroups(ids, silent);
            if (res.success && res.data) showToast(`Succès : ${res.data.count} groupes quittés`);
          } else {
            const res = await window.electronAPI.leaveAllServers(ids);
            if (res.success && res.data) showToast(`Succès : ${res.data.count} serveurs quittés`);
          }
        } catch (err: any) {
          showToast(`Erreur : ${err.message || "Opération échouée"}`, "danger");
        } finally {
          setIsProcessingFriends(false);
          setIsProcessingGroups(false);
          setIsProcessingServers(false);
        }
      },
      type: 'danger'
    });
  };

  const handleHouseUpdate = (houseId: number) => {
    if (!settings.accounts || !user) return;
    const updatedAccounts = settings.accounts.map(acc => {
        if (acc.id === user.id && acc.rotator) {
            return { 
                ...acc, 
                rotator: { ...acc.rotator, hypesquadHouse: houseId }
            };
        }
        return acc;
    });
    updateSetting('accounts', updatedAccounts);
  };

  return (
    <div 
      className="custom-scrollbar modules-grid" 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', 
        gridAutoFlow: 'dense',
        gap: '24px', 
        padding: '10px 10px 80px 10px',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      
      {/* Sync Overlay */}
      {isSyncingSelection && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 7, 15, 0.6)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fade-in 0.3s ease-out'
        }}>
           <div style={{ position: 'relative', marginBottom: '30px' }}>
              <div style={{ 
                width: '80px', height: '80px', 
                border: '3px solid transparent', 
                borderTopColor: 'var(--accent)', 
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <div style={{ 
                position: 'absolute', inset: '10px',
                border: '2px solid transparent', 
                borderBottomColor: 'var(--accent)', 
                opacity: 0.5,
                borderRadius: '50%',
                animation: 'spin 2s linear reverse infinite'
              }}></div>
              <RefreshCw size={30} color="var(--accent)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} />
           </div>
           
           <h3 style={{ fontFamily: 'Orbitron', letterSpacing: '4px', fontSize: '14px', color: 'white', textShadow: '0 0 15px var(--accent-glow)', marginBottom: '10px' }}>
              DECRYPTING DATA...
           </h3>
           <p style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '2px', fontWeight: '900' }}>
              PLEASE WAIT WHILE WE INITIALIZE NEURAL SYNC
           </p>
           
           <div style={{ marginTop: '40px', width: '200px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '40%', height: '100%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)', animation: 'indeterminate-progress 1.5s infinite ease-in-out' }}></div>
           </div>
        </div>
      )}
      
      {/* Mass Clear Card */}
      <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent-glow)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}><Trash2 size={22} /></div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Vider le salon</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Suppression rapide de messages</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <DoubleChannelSelector onSelect={(id) => setPurgeChannelId(id)} currentId={purgeChannelId} />
          
          <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="caption">Messages à supprimer</span>
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
                <span className="caption">Délai entre suppression</span>
                <span style={{ color: purgeDelay < 500 ? 'var(--warning)' : 'var(--accent)', fontWeight: '900' }}>{purgeDelay}ms</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="5000" 
              step="100" 
              value={purgeDelay} 
              onChange={(e) => setPurgeDelay(parseInt(e.target.value))} 
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', boxSizing: 'border-box' }} 
            />
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
          <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '-8px', marginBottom: '8px', padding: '0 5px' }}>
            {settings.adminPurge 
              ? "⚡ MODE ADMIN : Supprime TOUS les messages du salon (nécessite la permission 'Gérer les messages')." 
              : "🛡️ MODE PERSO : Supprime uniquement VOS messages (plus sûr, plus lent)."}
          </p>

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
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>Nettoyage de compte</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Optimisation et rafraîchissement</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button 
              onClick={openGroupsSelection} 
              disabled={isProcessingGroups || isProcessingFriends || isProcessingServers}
              className="btn-primary" 
              style={{ 
                flex: '1 1 130px',
                background: (isProcessingGroups || isProcessingFriends || isProcessingServers) ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.05)', 
                color: (isProcessingGroups || isProcessingFriends || isProcessingServers) ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                opacity: (isProcessingFriends || isProcessingServers) ? 0.4 : 1,
                justifyContent: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              {isProcessingGroups ? <RefreshCw className="animate-spin" size={14} /> : <MessageSquare size={14} />}
              <span>{isProcessingGroups ? 'En cours...' : 'Quitter Groupes'}</span>
            </button>
            
            <button 
              onClick={openFriendsSelection} 
              disabled={isProcessingFriends || isProcessingGroups || isProcessingServers}
              className="btn-primary" 
              style={{ 
                flex: '1 1 130px',
                background: (isProcessingFriends || isProcessingGroups || isProcessingServers) ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.05)', 
                color: (isProcessingFriends || isProcessingGroups || isProcessingServers) ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                opacity: (isProcessingGroups || isProcessingServers) ? 0.4 : 1,
                borderRadius: '12px',
                justifyContent: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              {isProcessingFriends ? <RefreshCw className="animate-spin" size={14} /> : <Users size={14} />}
              <span>{isProcessingFriends ? 'En cours...' : 'Vider les Amis'}</span>
            </button>

            <button 
              onClick={openServersSelection} 
              disabled={isProcessingServers || isProcessingFriends || isProcessingGroups}
              className="btn-primary" 
              style={{ 
                flex: '1 1 130px',
                borderRadius: '12px',
                fontSize: '11px',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                background: 'rgba(255,184,0,0.05)',
                color: 'var(--warning)',
                border: '1px solid rgba(255,184,0,0.2)',
                boxShadow: 'none',
                opacity: (isProcessingFriends || isProcessingGroups) ? 0.4 : 1
              }}
            >
              {isProcessingServers ? <RefreshCw className="animate-spin" size={14} /> : <Activity size={14} />}
              {isProcessingServers ? 'En cours...' : 'Quitter Serveurs'}
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
                gridColumn: 'span 3',
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
          
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)' }}>
             <label className="caption" style={{ display: 'block', marginBottom: '10px' }}>DM ALL (Amis & Groupes)</label>
             <textarea value={dmAllText} onChange={e => setDmAllText(e.target.value)} placeholder="Message... {user} pour mention" style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '11px', resize: 'none' }} />
             
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

      {/* NEW: Pomelo Username Sniper Module */}
      <div style={{ gridColumn: '1 / -1' }}>
        <PomeloSniper showToast={showToast} />
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
                Opsec Pro utilise LRCLIB pour afficher les paroles en temps reel.
              </p>
            </div>
            <div 
              onClick={async () => {
                const newState = !settings.spotifyLyricsEnabled;
                updateSetting('spotifyLyricsEnabled', newState);
                await window.electronAPI.toggleSpotifyLyrics({ enabled: newState, cookie: settings.spotifyCookie });
                showToast(newState ? "Lyrics Status Active" : "Lyrics Status Desactive", newState ? 'success' : 'danger');
              }} 
              className={`nighty-toggle ${settings.spotifyLyricsEnabled ? 'active' : ''}`}
              style={{ '--accent': '#1DB954' } as any}
            >
              <div className="nighty-toggle-handle"></div>
            </div>
          </div>
        </div>
      </div>

      {/* HypeSquad House Selector Module */}
      <div className="glass-card animate-fade-in" style={{ padding: '30px', position: 'relative', animationDelay: '0.4s' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#5865F2', boxShadow: '0 0 15px rgba(88, 101, 242, 0.4)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <div style={{ padding: '12px', background: 'rgba(88, 101, 242, 0.1)', borderRadius: '12px', color: '#5865F2', boxShadow: '0 0 20px rgba(88, 101, 242, 0.2)' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900' }}>HypeSquad House</h2>
            <p className="caption" style={{ opacity: 0.4, fontSize: '8px' }}>Discord Identity Badge</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: 1, name: 'Bravery', color: '#9b84ee', icon: '🛡️' },
              { id: 2, name: 'Brilliance', color: '#f47b67', icon: '✨' },
              { id: 3, name: 'Balance', color: '#45ddc0', icon: '⚖️' }
            ].map(house => (
              <button 
                key={house.id}
                onClick={async () => {
                  const res = await (window.electronAPI as any).setHypeSquadBadge(house.id);
                  if (res.success) {
                    handleHouseUpdate(house.id);
                    showToast(`Badge ${house.name} active !`);
                  } else {
                    showToast(res.error || 'Erreur HypeSquad', 'danger');
                  }
                }}
                style={{ 
                  padding: '15px 5px', borderRadius: '12px', 
                  background: rotator?.hypesquadHouse === house.id ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${rotator?.hypesquadHouse === house.id ? house.color : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: '0.2s', position: 'relative'
                }}
              >
                <span style={{ fontSize: '20px' }}>{house.icon}</span>
                <span style={{ fontSize: '9px', fontWeight: '900', color: rotator?.hypesquadHouse === house.id ? house.color : 'white' }}>{house.name.toUpperCase()}</span>
                {rotator?.hypesquadHouse === house.id && (
                  <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                    <CheckCircle2 size={10} color={house.color} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={async () => {
              const res = await (window.electronAPI as any).setHypeSquadBadge(0);
              if (res.success) {
                handleHouseUpdate(0);
                showToast('Badge HypeSquad supprime');
              }
            }}
            className="btn-primary"
            style={{ 
              width: '100%', marginTop: '5px', padding: '10px', fontSize: '9px', fontWeight: '900',
              background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: 'none'
            }}
          >
            <Trash2 size={12} style={{ marginRight: '8px' }} /> SUPPRIMER LE BADGE
          </button>
        </div>
      </div>

      {/* Selection Modal Integration */}
      <SelectionModal 
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onConfirm={handleSelectionConfirm}
        items={selectionItems}
        title={selectionType === 'friends' ? 'Sélectionner les amis' : selectionType === 'servers' ? 'Sélectionner les serveurs' : 'Sélectionner les groupes'}
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
