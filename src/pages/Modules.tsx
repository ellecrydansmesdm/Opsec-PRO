import React, { useState } from 'react';
import { Trash2, AlertTriangle, Activity, RefreshCw, ShieldCheck, Zap, UserPlus, Volume2, Users, MessageSquare, X, Check, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { DoubleChannelSelector } from "@/components/ui/DoubleChannelSelector";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useLogsStore } from "@/store/useLogsStore";
import { SpamSystem } from "@/components/modules/SpamSystem";
import { PomeloSniper } from "@/components/modules/PomeloSniper";
import { HubSectionCard, HubToggleRow, HubFieldRow } from '@/components/layout/HubPageLayout';
import { audioService } from '@/services/AudioService';
import { useActionValidator } from '@/hooks/useActionValidator';

interface ModulesProps {
  onConfirm: (data: any) => void;
}

export const Modules = ({ onConfirm }: ModulesProps) => {
  const { settings, updateSetting } = useSettingsStore();
  const { user } = useUserStore();
  const { addLog } = useLogsStore();
  const isFr = settings.language === 'fr';

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
  const [dmAllTarget, setDmAllTarget] = useState<'all' | 'friends' | 'groups'>('all');
  const [dmAllDelay, setDmAllDelay] = useState(2000);
  const [dmAllPauseInterval, setDmAllPauseInterval] = useState(10);
  const [dmAllPauseDuration, setDmAllPauseDuration] = useState(10000);

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
    
    // Check if the id provided is a guild/server ID
    // We assume if it's longer than a certain amount it might be valid, or we let the backend validate
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
      }
    });
  };

  const handleStopSanitizer = async () => {
    audioService.play('sanitizer_user_interrupt');
    await window.electronAPI.stopSanitizer();
    setIsProcessingFriends(false);
    setIsProcessingGroups(false);
    setIsProcessingServers(false);
    setIsClosingDMs(false);
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
      showToast(isFr ? 'Veuillez sélectionner au moins une cible !' : 'Please select at least one target!', 'danger');
      return;
    }

    onConfirm({
      isOpen: true,
      title: selectionType === 'friends' 
        ? (isFr ? "Suppression d'amis" : 'Friends Removal') 
        : selectionType === 'groups' 
          ? (isFr ? 'Départ des groupes' : 'Leave Groups') 
          : (isFr ? 'Départ des serveurs' : 'Leave Servers'),
      message: isFr 
        ? `Voulez-vous vraiment ${selectionType === 'friends' ? `supprimer ${ids.length} amis` : selectionType === 'groups' ? `quitter ${ids.length} groupes` : `quitter ${ids.length} serveurs`} ${silent ? 'en toute discrétion ' : ''}? Cette action est irréversible.`
        : `Do you really want to ${selectionType === 'friends' ? `remove ${ids.length} friends` : selectionType === 'groups' ? `leave ${ids.length} groups` : `leave ${ids.length} servers`} ${silent ? 'silently ' : ''}? This action is irreversible.`,
      onConfirm: async () => {
        try {
          audioService.play('sanitizer_clean_start');
          if (selectionType === 'friends') setIsProcessingFriends(true);
          else if (selectionType === 'groups') setIsProcessingGroups(true);
          else setIsProcessingServers(true);

          if (selectionType === 'friends') {
            const res = await window.electronAPI.deleteAllFriends(ids);
            if (res.success && res.data) {
              audioService.play('sanitizer_clean_stop');
              showToast(isFr ? `Succès : ${res.data.count} amis supprimés` : `Success: ${res.data.count} friends removed`);
            }
          } else if (selectionType === 'groups') {
            const res = await window.electronAPI.leaveAllGroups(ids, silent);
            if (res.success && res.data) {
              audioService.play('sanitizer_clean_stop');
              showToast(isFr ? `Succès : ${res.data.count} groupes quittés` : `Success: ${res.data.count} groups left`);
            }
          } else {
            const res = await window.electronAPI.leaveAllServers(ids);
            if (res.success && res.data) {
              audioService.play('sanitizer_clean_stop');
              showToast(isFr ? `Succès : ${res.data.count} serveurs quittés` : `Success: ${res.data.count} servers left`);
            }
          }
        } catch (err: any) {
          audioService.play('module_failed');
          showToast(isFr ? `Erreur : ${err.message || "Opération échouée"}` : `Error: ${err.message || "Operation failed"}`, "danger");
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
    <div className="hub-raid-grid custom-scrollbar">
      
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
      <HubSectionCard icon={Trash2} glowColor="var(--accent)" title={isFr ? 'VIDER LE SALON' : 'CLEAR CHANNEL'} className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? 'Suppression rapide de messages' : 'Fast message deletion'}
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
                <span className="caption">{isFr ? 'Délai entre suppression' : 'Delay between deletions'}</span>
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

      {/* Account Sanitizer Card */}
      <HubSectionCard icon={AlertTriangle} iconColor="var(--danger)" glowColor="var(--danger)" title="NETTOYAGE DE COMPTE" className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? 'Optimisation et rafraîchissement' : 'Optimization and refresh'}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {(isProcessingGroups || isProcessingFriends || isProcessingServers || isClosingDMs) ? (
            <button 
              onClick={handleStopSanitizer}
              className="btn-danger"
              style={{
                width: '100%',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 0 20px var(--danger-glow)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '900',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X className="animate-pulse" size={16} />
              <span>{isFr ? 'ARRÊTER LE NETTOYAGE' : 'STOP SANITIZER'}</span>
            </button>
          ) : (
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
                <span>
                  {isProcessingGroups 
                    ? (isFr ? 'En cours...' : 'Processing...') 
                    : (isFr ? 'Quitter Groupes' : 'Leave Groups')}
                </span>
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
                <span>
                  {isProcessingFriends 
                    ? (isFr ? 'En cours...' : 'Processing...') 
                    : (isFr ? 'Vider les Amis' : 'Remove Friends')}
                </span>
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
                <span>
                  {isProcessingServers 
                    ? (isFr ? 'En cours...' : 'Processing...') 
                    : (isFr ? 'Quitter Serveurs' : 'Leave Servers')}
                </span>
              </button>

              <button 
                onClick={() => {
                  onConfirm({
                    isOpen: true,
                    title: isFr ? 'Fermer tous les DMs' : 'Close All DMs',
                    message: isFr 
                      ? 'Voulez-vous vraiment fermer TOUTES vos conversations privées ? Cette action est irréversible.' 
                      : 'Do you really want to close ALL your private conversations? This action is irreversible.',
                    onConfirm: async () => {
                      setIsClosingDMs(true);
                      const res = await window.electronAPI.closeAllDMs();
                      setIsClosingDMs(false);
                      if (res.success && res.data) {
                        showToast(isFr ? `${res.data.count} conversations fermées.` : `${res.data.count} conversations closed.`);
                      } else {
                        showToast(
                          isFr 
                            ? (res.error || 'Erreur lors de la fermeture des DMs') 
                            : (res.error || 'Error while closing DMs'), 
                          'danger'
                        );
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
                <span>
                  {isClosingDMs 
                    ? (isFr ? 'Nettoyage en cours...' : 'Cleaning up...') 
                    : (isFr ? 'Fermer tous les DMs' : 'Close All DMs')}
                </span>
              </button>
            </div>
          )}
          
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <label className="caption" style={{ display: 'block', color: 'var(--accent)', fontWeight: '900', letterSpacing: '0.5px' }}>DM ALL CONFIGURATION</label>
             
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
                    ? "L'envoi de messages à des utilisateurs avec qui vous n'avez jamais discuté déclenchera un Captcha à 100% de la part de Discord." 
                    : "Sending messages to users you have never chatted with will trigger a 100% Captcha from Discord."}
                </p>
                <button 
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'Network' }))}
                  style={{ 
                    alignSelf: 'flex-start',
                    fontSize: '9px', 
                    padding: '4px 8px', 
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '900',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFr ? 'CONFIGURATION RESEAU' : 'NETWORK CONFIGURATION'}
                </button>
             </div>

             <textarea 
               value={dmAllText} 
               onChange={e => setDmAllText(e.target.value)} 
               placeholder={isFr ? 'Message... {user} pour mention' : 'Message... {user} for mention'} 
               style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '11px', resize: 'none', outline: 'none' }} 
             />
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.5 }}>{isFr ? 'CIBLE DE DIFFUSION' : 'BROADCAST TARGET'}</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {(['all', 'friends', 'groups'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDmAllTarget(t)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '10px',
                        borderRadius: '6px',
                        background: dmAllTarget === t ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${dmAllTarget === t ? 'var(--accent)' : 'var(--border)'}`,
                        color: dmAllTarget === t ? 'var(--accent)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        transition: '0.2s',
                        fontWeight: 'bold'
                      }}
                    >
                      {t === 'all' ? (isFr ? 'TOUS' : 'ALL') : t === 'friends' ? (isFr ? 'AMIS' : 'FRIENDS') : (isFr ? 'GROUPES' : 'GROUPS')}
                    </button>
                  ))}
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '9px', fontWeight: 'bold' }}>
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
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '9px', fontWeight: 'bold' }}>
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

             <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '9px', fontWeight: 'bold' }}>
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
                     await window.electronAPI.dmAllFriends({ 
                       message: dmAllText,
                       target: dmAllTarget,
                       delay: dmAllDelay,
                       pauseInterval: dmAllPauseInterval,
                       pauseDuration: dmAllPauseDuration
                     }); 
                     setSendingDmAll(false); 
                   },
                   type: 'danger'
                 });
               }} 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                marginTop: '5px', 
                background: sendingDmAll ? 'var(--danger)' : 'var(--accent)', 
                boxShadow: sendingDmAll ? '0 0 20px var(--danger-glow)' : '0 0 20px var(--accent-glow)' 
              }}
             >
                {sendingDmAll 
                  ? (isFr ? 'Arrêter le DM ALL' : 'Stop DM ALL') 
                  : (isFr ? 'Démarrer le DM ALL' : 'Start DM ALL')}
              </button>
           </div>
        </div>
      </HubSectionCard>

      {/* Advanced Cyberpunk Spam Module */}
      <div className="hub-raid-grid-full">
        <SpamSystem showToast={showToast} />
      </div>

      {/* NEW: Pomelo Username Sniper Module */}
      <div className="hub-raid-grid-full">
        <PomeloSniper showToast={showToast} />
      </div>

      {/* Spotify Lyrics Card */}
      <HubSectionCard icon={Activity} iconColor="#1DB954" glowColor="#1DB954" title="SPOTIFY SYNC" className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? 'Paroles en temps réel via LRCLIB' : 'Real-time lyrics via LRCLIB'}
        </p>

        <HubToggleRow
          title={isFr ? 'Paroles en Temps Réel' : 'Real-Time Lyrics'}
          description={isFr 
            ? 'Opsec Pro utilise LRCLIB pour afficher les paroles en temps réel.' 
            : 'Opsec Pro uses LRCLIB to display real-time lyrics.'}
          active={!!settings.spotifyLyricsEnabled}
          onToggle={async () => {
            const newState = !settings.spotifyLyricsEnabled;
            updateSetting('spotifyLyricsEnabled', newState);
            await window.electronAPI.toggleSpotifyLyrics({ enabled: newState, cookie: settings.spotifyCookie });
            showToast(
              newState 
                ? (isFr ? "Statut Paroles Actif" : "Lyrics Status Active") 
                : (isFr ? "Statut Paroles Désactivé" : "Lyrics Status Inactive"), 
              newState ? 'success' : 'danger'
            );
          }}
          accent="#1DB954"
        />
      </HubSectionCard>

      {/* HypeSquad House Selector Module */}
      <HubSectionCard icon={ShieldCheck} iconColor="#5865F2" glowColor="#5865F2" title="HYPESQUAD HOUSE" className="animate-fade-in">
        <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
          {isFr ? "Badge d'identité Discord" : 'Discord identity badge'}
        </p>

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
                  const res = await window.electronAPI.setHypeSquadBadge(house.id);
                  if (res.success) {
                    handleHouseUpdate(house.id);
                    showToast(isFr ? `Badge ${house.name} activé !` : `Badge ${house.name} active!`);
                  } else {
                    showToast(isFr ? (res.error || 'Erreur HypeSquad') : (res.error || 'HypeSquad Error'), 'danger');
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
              const res = await window.electronAPI.setHypeSquadBadge(0);
              if (res.success) {
                handleHouseUpdate(0);
                showToast(isFr ? 'Badge HypeSquad supprimé' : 'HypeSquad badge removed');
              }
            }}
            className="btn-primary"
            style={{ 
              width: '100%', marginTop: '5px', padding: '10px', fontSize: '9px', fontWeight: '900',
              background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: 'none'
            }}
          >
            <Trash2 size={12} style={{ marginRight: '8px' }} /> {isFr ? 'SUPPRIMER LE BADGE' : 'REMOVE BADGE'}
          </button>
        </div>
      </HubSectionCard>

      {/* Selection Modal Integration */}
      <SelectionModal 
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onConfirm={handleSelectionConfirm}
        items={selectionItems}
        title={selectionType === 'friends' 
          ? (isFr ? 'Sélectionner les amis' : 'Select Friends') 
          : selectionType === 'servers' 
            ? (isFr ? 'Sélectionner les serveurs' : 'Select Servers') 
            : (isFr ? 'Sélectionner les groupes' : 'Select Groups')}
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
