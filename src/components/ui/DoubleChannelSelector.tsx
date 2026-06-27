import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Disc, UserCircle, Volume2, MessageSquare, RotateCw, Target } from 'lucide-react';

interface DoubleChannelSelectorProps {
  onSelect: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  currentId?: string;
  selectedIds?: string[];
  allowMultiple?: boolean;
  selectServerOnly?: boolean;
  serverFilter?: (server: any) => boolean;
  selectedAccountIds?: string[];
}

const ITEMS_PER_PAGE = 40;

export const DoubleChannelSelector = ({ 
  onSelect, 
  onRemove, 
  currentId, 
  selectedIds = [], 
  allowMultiple = false, 
  selectServerOnly = false, 
  serverFilter,
  selectedAccountIds
}: DoubleChannelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ servers: any[], dms: any[] }>({ servers: [], dms: [] });
  const [activeTab, setActiveTab] = useState<'dm' | 'server'>('server');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('Choisir une cible...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualId, setManualId] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);
  const [showAllFiltered, setShowAllFiltered] = useState(false);

  useEffect(() => {
    if (!currentId) {
      setSelectedName('Choisir une cible...');
    }
  }, [currentId]);

  useEffect(() => {
    if (isOpen) {
      setVisibleLimit(ITEMS_PER_PAGE);
    }
  }, [isOpen, activeTab, selectedServerId]);

  const fetchChannels = async () => {
    setIsRefreshing(true);
    try {
      const res = await window.electronAPI.getChannels(selectedAccountIds);
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

  const accountIdsKey = selectedAccountIds?.join(',') || '';

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
    }
  }, [isOpen, accountIdsKey]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
      setVisibleLimit(prev => prev + ITEMS_PER_PAGE);
    }
  };

  const renderContent = () => {
    const servers = data?.servers || [];
    const dms = data?.dms || [];
    const term = search.toLowerCase();

    if (activeTab === 'dm') {
      const filteredDms = dms.filter(dm => 
        dm && dm.name && dm.name.toLowerCase().includes(term)
      );
      const displayedDms = filteredDms.slice(0, visibleLimit);

      return (
        <div onScroll={handleScroll} style={{ overflowY: 'auto', maxHeight: '300px' }}>
          <div style={{ padding: '10px', display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Target size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                placeholder="Target ID Manuel (Sniper)..." 
                value={manualId} 
                onChange={(e) => setManualId(e.target.value.replace(/\D/g, ''))} 
                style={{ width: '100%', padding: '8px 12px 8px 30px', fontSize: '11px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }} 
              />
            </div>
            <button 
              onClick={() => {
                if (manualId.length >= 17) {
                  onSelect(manualId, `Target ID: ${manualId}`);
                  setSelectedName(`Target ID: ${manualId}`);
                  setIsOpen(false);
                  setManualId('');
                }
              }}
              disabled={manualId.length < 17}
              style={{ padding: '0 15px', fontSize: '10px', fontWeight: '900', background: 'var(--accent)', color: 'black', borderRadius: '8px', cursor: 'pointer', opacity: manualId.length >= 17 ? 1 : 0.4 }}
            >
              USE
            </button>
          </div>
          
          {filteredDms.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.3, fontSize: '12px' }}>Aucun DM trouvé</div>
          ) : (
            displayedDms.map(dm => {
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
                      padding: '12px', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '4px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      background: isSelected ? 'rgba(var(--accent-rgb), 0.08)' : 'transparent',
                      transition: '0.2s'
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {dm.icon ? <img src={dm.icon} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <UserCircle size={16} opacity={0.5} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{fontSize: '13px', fontWeight: 'bold', color: isSelected ? 'var(--accent)' : 'white'}}>{dm.name}</span>
                    <span style={{fontSize: '9px', opacity: 0.4}}>{dm.id}</span>
                  </div>
                  {isSelected && <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>}
                </div>
              );
            })
          )}
          {visibleLimit < filteredDms.length && <div style={{ padding: '10px', textAlign: 'center', fontSize: '10px', opacity: 0.4 }}>Scrollez pour voir plus...</div>}
        </div>
      );
    }

    if (activeTab === 'server') {
       if (selectedServerId) {
          const server = servers.find(s => s.id === selectedServerId);
          if (!server || !Array.isArray(server.channels)) {
              setSelectedServerId(null);
              return null;
          }

          const filteredChannels = server.channels.filter((c: any) => 
            c && c.name && c.name.toLowerCase().includes(term)
          );
          const displayedChannels = filteredChannels.slice(0, visibleLimit);

          return (
             <div onScroll={handleScroll} style={{ overflowY: 'auto', maxHeight: '300px' }}>
               <div onClick={() => setSelectedServerId(null)} style={{ cursor: 'pointer', padding: '10px', fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', background: 'rgba(var(--accent-rgb), 0.03)', borderRadius: '8px', marginBottom: '10px' }}>
                  <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /> RETOUR À LA LISTE DES SERVEURS
               </div>
               {filteredChannels.length === 0 && <div style={{ padding: '40px 10px', textAlign: 'center', opacity: 0.3, fontSize: '12px' }}>Aucun salon trouvé dans ce secteur</div>}
                {displayedChannels.map((c: any) => {
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
                             padding: '10px 12px', 
                             borderRadius: '10px', 
                             cursor: 'pointer', 
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: '12px',
                             marginBottom: '4px',
                             border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                             background: isSelected ? 'rgba(var(--accent-rgb), 0.08)' : 'transparent',
                             transition: '0.2s'
                         }}
                     >
                         <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            {isVoice ? <Volume2 size={14} style={{ color: 'var(--accent)' }} /> : <MessageSquare size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                         </div>
                         <span style={{fontSize: '12px', fontWeight: '700', color: isSelected ? 'var(--accent)' : 'white'}}>{c.name}</span>
                         {isSelected && <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>}
                     </div>
                   );
                })}
             </div>
          );
       }

        let filteredServers = servers.filter(s => 
          s && (
            s.name?.toLowerCase().includes(term) || 
            s.guildTag?.toLowerCase().includes(term)
          ) && (showAllFiltered ? true : (serverFilter ? serverFilter(s) : true))
        );
        const displayedServers = filteredServers.slice(0, visibleLimit);

        if (filteredServers.length === 0) return (
            <div style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.3, fontSize: '12px' }}>
                Aucun serveur détecté dans la zone
            </div>
        );

        return (
          <div onScroll={handleScroll} style={{ overflowY: 'auto', maxHeight: '300px' }}>
            {serverFilter && (
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>Afficher tout les serveurs</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllFiltered(!showAllFiltered);
                  }}
                  style={{ 
                    padding: '4px 10px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer',
                    background: showAllFiltered ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                    color: 'white', border: 'none', transition: '0.2s',
                    boxShadow: showAllFiltered ? '0 0 10px var(--accent)' : 'none'
                  }}
                >
                  {showAllFiltered ? 'TOUT' : 'FILTRÉ'}
                </button>
              </div>
            )}
            {displayedServers.map(s => {
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
                      padding: '12px', 
                      borderRadius: '12px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '6px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255,255,255,0.01)',
                      transition: '0.2s'
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon ? <img src={s.icon} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Disc size={18} opacity={0.5} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{fontSize: '13px', fontWeight: '900', color: isSelected ? 'var(--accent)' : 'white'}}>{s.name}</span>
                    <span style={{fontSize: '9px', opacity: 0.3, letterSpacing: '1px'}}>{s.id}</span>
                  </div>
                  {s.guildTag && !isSelected && (
                      <div style={{
                          marginLeft: 'auto',
                          padding: '3px 8px',
                          background: 'rgba(var(--accent-rgb), 0.08)',
                          border: '1px solid rgba(var(--accent-rgb), 0.2)',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: 'var(--accent)',
                          fontWeight: '900'
                      }}>
                          {s.guildTag}
                      </div>
                  )}
                  {isSelected && <div style={{ marginLeft: 'auto', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)' }}></div>}
                </div>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          padding: '18px 20px', 
          background: 'rgba(0,0,0,0.4)', 
          border: '1px solid var(--border)', 
          borderRadius: '14px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          boxShadow: isOpen ? '0 0 20px rgba(0,0,0,0.4)' : 'none',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search size={16} color={currentId || selectedIds.length > 0 ? 'var(--accent)' : 'var(--text-dim)'} />
          <span style={{fontSize: '13px', fontWeight: '700', color: currentId || selectedIds.length > 0 ? 'white' : 'var(--text-dim)'}}>{selectedName}</span>
        </div>
        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.4s cubic-bezier(0.23, 1, 0.32, 1)', opacity: 0.5 }} />
      </div>

      {isOpen && (
        <div 
          className="glass-card animate-slide-up" 
          style={{ 
            position: 'absolute', 
            top: 'calc(100% + 10px)', 
            left: 0, 
            right: 0, 
            zIndex: 1000, 
            maxHeight: '450px', 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            background: 'rgba(10, 10, 15, 0.98)', 
            border: '1px solid var(--accent-glow)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 210, 255, 0.1)',
            borderRadius: '20px'
          }}
        >
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '5px' }}>
             <div 
                onClick={() => { setActiveTab('server'); setSelectedServerId(null); }} 
                style={{ flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: '900', letterSpacing: '1.5px', borderRadius: '8px', background: activeTab === 'server' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent', color: activeTab === 'server' ? 'var(--accent)' : 'var(--text-dim)', transition: '0.2s' }}
              >SERVEURS</div>
             {!selectServerOnly && (
                <div 
                  onClick={() => { setActiveTab('dm'); }} 
                  style={{ flex: 1, padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: '900', letterSpacing: '1.5px', borderRadius: '8px', background: activeTab === 'dm' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent', color: activeTab === 'dm' ? 'var(--accent)' : 'var(--text-dim)', transition: '0.2s' }}
                >MESSAGES PRIVÉS</div>
             )}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input 
                autoFocus 
                placeholder={selectServerOnly ? "Rechercher un serveur..." : "Filtrer les résultats..."} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ width: '100%', padding: '14px 15px 14px 45px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '13px' }} 
              />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); fetchChannels(); }} 
              disabled={isRefreshing}
              style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: isRefreshing ? 'var(--accent)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
            >
              <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
};
