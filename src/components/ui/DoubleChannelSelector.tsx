import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Disc, UserCircle, Volume2, MessageSquare, RotateCw } from 'lucide-react';

interface DoubleChannelSelectorProps {
  onSelect: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  currentId?: string;
  selectedIds?: string[];
  allowMultiple?: boolean;
  selectServerOnly?: boolean;
}

export const DoubleChannelSelector = ({ onSelect, onRemove, currentId, selectedIds = [], allowMultiple = false, selectServerOnly = false }: DoubleChannelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ servers: any[], dms: any[] }>({ servers: [], dms: [] });
  const [activeTab, setActiveTab] = useState<'dm' | 'server'>('server');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('Choisir une cible...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!currentId) {
      setSelectedName('Choisir une cible...');
    }
  }, [currentId]);

  const fetchChannels = async () => {
    setIsRefreshing(true);
    try {
      const res = await window.electronAPI.getChannels();
      if (res.success && res.data) {
          setData({
              servers: Array.isArray(res.data.servers) ? res.data.servers : [],
              dms: Array.isArray(res.data.dms) ? res.data.dms : []
          });
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
      setData({ servers: [], dms: [] });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
    }
  }, [isOpen]);

  const renderContent = () => {
    const servers = data?.servers || [];
    const dms = data?.dms || [];

    if (activeTab === 'dm') {
      const filteredDms = dms.filter(dm => 
        dm && dm.name && dm.name.toLowerCase().includes(search.toLowerCase())
      );

      if (filteredDms.length === 0) return <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>Aucun DM trouvé</div>;

      return filteredDms.map(dm => {
        const isSelected = allowMultiple && selectedIds.includes(dm.id);
        return (
          <div 
            key={dm.id} 
            onClick={() => { 
                if (isSelected) {
                    onRemove?.(dm.id);
                } else {
                    onSelect(dm.id, dm.name); 
                    if (!allowMultiple) {
                        setSelectedName(`MP > ${dm.name}`); 
                        setIsOpen(false);
                    }
                }
            }} 
            className="nav-item" 
            style={{ 
                padding: '10px', 
                borderRadius: '10px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : ''
            }}
          >
            {dm.icon ? <img src={dm.icon} style={{width: 24, height: 24, borderRadius: '50%'}} /> : <UserCircle size={18} />}
            <span style={{fontSize: '13px', fontWeight: 'bold'}}>{dm.name}</span>
            {isSelected && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--accent)' }}>SÉLECTIONNÉ</span>}
          </div>
        );
      });
    }

    if (activeTab === 'server') {
       if (selectedServerId) {
          const server = servers.find(s => s.id === selectedServerId);
          if (!server || !Array.isArray(server.channels)) {
              setSelectedServerId(null);
              return null;
          }

          const filteredChannels = server.channels.filter((c: any) => 
            c && c.name && c.name.toLowerCase().includes(search.toLowerCase())
          );

          return (
             <>
               <div onClick={() => setSelectedServerId(null)} style={{ cursor: 'pointer', padding: '10px', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                  <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /> Retour aux serveurs
               </div>
               {filteredChannels.length === 0 && <div style={{ padding: '10px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>Aucun salon trouvé</div>}
                {filteredChannels.map((c: any) => {
                   const isSelected = allowMultiple && selectedIds.includes(c.id);
                   const isVoice = c.type === 'voice';
                   return (
                     <div 
                         key={c.id} 
                         onClick={() => { 
                             if (isSelected) {
                                 onRemove?.(c.id);
                             } else {
                                 onSelect(c.id, `${server.name} > ${isVoice ? '🔊' : '#'}${c.name}`); 
                                 if (!allowMultiple) {
                                     setSelectedName(`${server.name} > ${isVoice ? '🔊' : '#'}${c.name}`); 
                                     setIsOpen(false);
                                 }
                             }
                         }} 
                         className="nav-item" 
                         style={{ 
                             padding: '10px', 
                             borderRadius: '10px', 
                             cursor: 'pointer', 
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: '10px',
                             border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                             background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : ''
                         }}
                     >
                         {isVoice ? <Volume2 size={16} style={{ color: 'var(--accent)' }} /> : <MessageSquare size={16} style={{ color: 'var(--text-dim)' }} />}
                         <span style={{fontSize: '13px', fontWeight: 'bold'}}>{c.name}</span>
                         {isSelected && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--accent)' }}>SÉLECTIONNÉ</span>}
                     </div>
                   );
                })}
             </>
          );
       }

        let filteredServers = servers.filter(s => 
          s && (
            s.name?.toLowerCase().includes(search.toLowerCase()) || 
            s.guildTag?.toLowerCase().includes(search.toLowerCase())
          )
        );

        if (filteredServers.length === 0) return (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                Aucun serveur trouvé
            </div>
        );

        return filteredServers.map(s => {
           const isSelected = allowMultiple && selectedIds.includes(s.id);
           return (
            <div 
              key={s.id} 
              onClick={() => { 
                if (selectServerOnly) {
                   if (isSelected) {
                       onRemove?.(s.id);
                   } else {
                       onSelect(s.id, s.name);
                       if (!allowMultiple) {
                           setSelectedName(s.name);
                           setIsOpen(false);
                       }
                   }
                } else {
                   setSelectedServerId(s.id); 
                   setSearch(''); 
                }
              }} 
              className="nav-item" 
              style={{ 
                  padding: '10px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : ''
              }}
            >
               {s.icon ? <img src={s.icon} style={{width: 24, height: 24, borderRadius: '50%'}} /> : <Disc size={18} />}
               <span style={{fontSize: '13px', fontWeight: 'bold'}}>{s.name}</span>
               {isSelected && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>SÉLECTIONNÉ</span>}
               {s.guildTag && !isSelected && (
                   <div style={{
                       marginLeft: 'auto',
                       padding: '2px 8px',
                       background: 'rgba(255,255,255,0.1)',
                       borderRadius: '4px',
                       fontSize: '10px',
                       color: 'rgba(255,255,255,0.7)',
                       letterSpacing: '0.5px'
                   }}>
                      {s.guildTag}
                   </div>
               )}
            </div>
           );
        });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{fontSize: '14px', color: currentId ? 'white' : 'var(--text-dim)'}}>{selectedName}</span>
        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
      </div>
      {isOpen && (
        <div className="glass-card animate-slide-up" style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 100, maxHeight: '400px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#0a0a0f', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
             <div onClick={() => { setActiveTab('server'); setSelectedServerId(null); }} style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: '900', borderBottom: activeTab === 'server' ? '2px solid var(--accent)' : 'none', color: activeTab === 'server' ? 'white' : 'var(--text-dim)' }}>SERVEURS</div>
             {!selectServerOnly && (
                <div onClick={() => { setActiveTab('dm'); }} style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: '900', borderBottom: activeTab === 'dm' ? '2px solid var(--accent)' : 'none', color: activeTab === 'dm' ? 'white' : 'var(--text-dim)' }}>
                  MESSAGES PRIVÉS ({data.dms.length})
                </div>
             )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
              <input autoFocus placeholder={selectServerOnly ? "Sélectionner un serveur pour le tag..." : "Rechercher un salon ou utilisateur..."} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 35px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'white' }} />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); fetchChannels(); }} 
              disabled={isRefreshing}
              style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: isRefreshing ? 'var(--accent)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>{renderContent()}</div>
        </div>
      )}
    </div>
  );
};
