import React, { useState } from 'react';
import { AlertTriangle, Users, Trash2, X, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SelectionModal } from '@/components/ui/SelectionModal';
import { HubSectionCard } from '@/components/layout/HubPageLayout';
import { audioService } from '@/services/AudioService';

interface AccountSanitizerSystemProps {
  showToast: (message: string, type?: 'success' | 'danger') => void;
  onConfirm: (data: any) => void;
}

export const AccountSanitizerSystem: React.FC<AccountSanitizerSystemProps> = ({ showToast, onConfirm }) => {
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';

  // Selection States
  const [selectionItems, setSelectionItems] = useState<any[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<'friends' | 'groups' | 'servers'>('friends');
  const [isProcessingFriends, setIsProcessingFriends] = useState(false);
  const [isProcessingGroups, setIsProcessingGroups] = useState(false);
  const [isProcessingServers, setIsProcessingServers] = useState(false);
  const [isClosingDMs, setIsClosingDMs] = useState(false);
  const [isSyncingSelection, setIsSyncingSelection] = useState(false);

  const handleStopSanitizer = async () => {
    audioService.play('sanitizer_user_interrupt');
    await window.electronAPI.stopSanitizer();
    setIsProcessingFriends(false);
    setIsProcessingGroups(false);
    setIsProcessingServers(false);
    setIsClosingDMs(false);
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

  const handleSelectionConfirm = (ids: string[]) => {
    setIsSelectionModalOpen(false);
    
    if (ids.length === 0) {
      showToast(isFr ? 'Veuillez sélectionner au moins une cible !' : 'Please select at least one target!', 'danger');
      return;
    }

    onConfirm({
      isOpen: true,
      title: selectionType === 'friends' 
        ? (isFr ? "Suppression d'amis" : 'Friends Removal') 
        : selectionType === 'servers' 
          ? (isFr ? 'Quitter les serveurs' : 'Leave Servers') 
          : (isFr ? 'Quitter les groupes' : 'Leave Groups'),
      message: isFr 
        ? `Voulez-vous vraiment traiter ${ids.length} élément(s) ? Cette action est irréversible.` 
        : `Do you really want to process ${ids.length} item(s)? This action is irreversible.`,
      onConfirm: async () => {
        try {
          if (selectionType === 'friends') {
            setIsProcessingFriends(true);
            audioService.play('module_launch');
            const res = await window.electronAPI.deleteAllFriends(ids);
            if (res.success && res.data) {
              audioService.play('module_complete');
              showToast(isFr ? `Succès : ${res.data.count} amis supprimés` : `Success: ${res.data.count} friends removed`);
            }
          } else if (selectionType === 'groups') {
            setIsProcessingGroups(true);
            audioService.play('module_launch');
            const res = await window.electronAPI.leaveAllGroups(ids);
            if (res.success && res.data) {
              audioService.play('module_complete');
              showToast(isFr ? `Succès : ${res.data.count} groupes quittés` : `Success: ${res.data.count} groups left`);
            }
          } else if (selectionType === 'servers') {
            setIsProcessingServers(true);
            audioService.play('module_launch');
            const res = await window.electronAPI.leaveAllServers(ids);
            if (res.success && res.data) {
              audioService.play('module_complete');
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

  return (
    <HubSectionCard icon={AlertTriangle} iconColor="var(--danger)" glowColor="var(--danger)" title={isFr ? "NETTOYAGE DE COMPTE (SANITIZER)" : "ACCOUNT SANITIZER"} className="animate-fade-in">
      <p className="hub-field-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
        {isFr ? 'Purge et rafraîchissement rapide de votre liste d\'amis, serveurs et messages privés' : 'Rapid purge and refresh for your friends list, joined servers, and private DMs'}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <button 
              onClick={openGroupsSelection} 
              disabled={isProcessingGroups || isProcessingFriends || isProcessingServers}
              className="btn-primary" 
              style={{ 
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.05)', 
                color: 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isProcessingGroups ? <RefreshCw className="animate-spin" size={14} /> : <Users size={14} />}
              <span>{isProcessingGroups ? (isFr ? 'En cours...' : 'Processing...') : (isFr ? 'Quitter Groupes' : 'Leave Groups')}</span>
            </button>

            <button 
              onClick={openFriendsSelection} 
              disabled={isProcessingGroups || isProcessingFriends || isProcessingServers}
              className="btn-primary" 
              style={{ 
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.05)', 
                color: 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.2)`, 
                fontSize: '11px', 
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isProcessingFriends ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
              <span>{isProcessingFriends ? (isFr ? 'En cours...' : 'Processing...') : (isFr ? 'Supprimer Amis' : 'Remove Friends')}</span>
            </button>

            <button 
              onClick={openServersSelection} 
              disabled={isProcessingGroups || isProcessingFriends || isProcessingServers}
              className="btn-primary" 
              style={{ 
                padding: '16px',
                background: 'rgba(255,184,0,0.05)', 
                color: 'var(--warning)', 
                border: '1px solid rgba(255,184,0,0.2)', 
                fontSize: '11px', 
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isProcessingServers ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
              <span>{isProcessingServers ? (isFr ? 'En cours...' : 'Processing...') : (isFr ? 'Quitter Serveurs' : 'Leave Servers')}</span>
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
                    audioService.play('module_launch');
                    const res = await window.electronAPI.closeAllDMs();
                    setIsClosingDMs(false);
                    if (res.success && res.data) {
                      audioService.play('module_complete');
                      showToast(isFr ? `${res.data.count} conversations fermées.` : `${res.data.count} conversations closed.`);
                    } else {
                      audioService.play('module_failed');
                      showToast(isFr ? (res.error || 'Erreur lors de la fermeture des DMs') : (res.error || 'Error while closing DMs'), 'danger');
                    }
                  },
                  type: 'danger'
                });
              }} 
              disabled={isClosingDMs}
              className="btn-primary" 
              style={{ 
                padding: '16px',
                background: isClosingDMs ? 'var(--accent-soft)' : 'rgba(239, 68, 68, 0.08)', 
                color: isClosingDMs ? 'var(--accent)' : 'var(--danger)', 
                border: `1px solid rgba(239, 68, 68, 0.3)`, 
                fontSize: '11px', 
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isClosingDMs ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
              <span>{isClosingDMs ? (isFr ? 'Nettoyage en cours...' : 'Cleaning up...') : (isFr ? 'Fermer tous les DMs' : 'Close All DMs')}</span>
            </button>
          </div>
        )}
      </div>

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
    </HubSectionCard>
  );
};
