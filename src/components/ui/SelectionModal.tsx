import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Check, Users, MessageSquare, Globe, ChevronDown, RefreshCw } from 'lucide-react';
import { useSettingsStore } from "@/store/useSettingsStore";

interface SelectionItem {
  id: string;
  name: string;
  avatar?: string;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[], silent?: boolean) => void;
  items: SelectionItem[];
  title: string;
  type: 'friends' | 'groups' | 'servers';
}

const ITEMS_PER_PAGE = 50;

export const SelectionModal: React.FC<SelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  items, 
  title,
  type 
}) => {
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [silentLeave, setSilentLeave] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearch('');
      setSilentLeave(false);
      setVisibleLimit(ITEMS_PER_PAGE);
    }
  }, [isOpen, type]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter(item => 
      (item.name || '').toLowerCase().includes(term) || 
      (item.id || '').includes(term)
    );
  }, [items, search]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleLimit);
  }, [filteredItems, visibleLimit]);

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id));

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
      filteredItems.forEach(item => next.delete(item.id));
    } else {
      filteredItems.forEach(item => next.add(item.id));
    }
    setSelectedIds(next);
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottomReached = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    if (bottomReached && visibleLimit < filteredItems.length) {
      setVisibleLimit(prev => prev + ITEMS_PER_PAGE);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card animate-slide-up" 
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '500px', 
          maxHeight: '80vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '25px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {type === 'friends' ? <Users size={20} color="var(--accent)" /> : type === 'servers' ? <Globe size={20} color="var(--accent)" /> : <MessageSquare size={20} color="var(--accent)" />}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{title}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {isFr ? `${items.length} éléments trouvés` : `${items.length} items found`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input 
              type="text" 
              placeholder={isFr ? "Rechercher par nom ou ID..." : "Search by name or ID..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 15px 12px 45px', 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border)', 
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={toggleAll}
                className="btn-secondary"
                style={{ 
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '800',
                  gap: '8px'
                }}
              >
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '4px', 
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: allSelected ? 'var(--accent)' : 'transparent',
                  borderColor: allSelected ? 'var(--accent)' : 'var(--border)'
                }}>
                  {allSelected && <Check size={12} color="white" />}
                </div>
                {allSelected 
                  ? (isFr ? 'Tout désélectionner' : 'Deselect All') 
                  : (isFr ? 'Tout sélectionner' : 'Select All')}
              </button>
              
              {selectedIds.size > 0 && (
                <span className="caption" style={{ color: 'var(--accent)', fontSize: '9px' }}>
                  {isFr ? `${selectedIds.size} SÉLECTIONNÉS` : `${selectedIds.size} SELECTED`}
                </span>
              )}
          </div>
        </div>

        {/* List with Virtual Scroll Logic */}
        <div 
           className="custom-scrollbar" 
           onScroll={handleScroll}
           style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedItems.map(item => (
              <div 
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="selection-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '12px',
                  background: selectedIds.has(item.id) ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent',
                  border: '1px solid',
                  borderColor: selectedIds.has(item.id) ? 'rgba(var(--accent-rgb), 0.2)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {item.avatar ? (
                      <img src={item.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        {type === 'friends' ? <Users size={16} /> : type === 'servers' ? <Globe size={16} /> : <MessageSquare size={16} />}
                      </div>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: selectedIds.has(item.id) ? 'var(--accent)' : 'white' }}>{item.name}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{item.id}</p>
                  </div>
                </div>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '6px', 
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: selectedIds.has(item.id) ? 'var(--accent)' : 'transparent',
                  borderColor: selectedIds.has(item.id) ? 'var(--accent)' : 'var(--border)',
                  boxShadow: selectedIds.has(item.id) ? '0 0 10px var(--accent-glow)' : 'none'
                }}>
                  {selectedIds.has(item.id) && <Check size={14} color="white" />}
                </div>
              </div>
            ))}
            
            {visibleLimit < filteredItems.length && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                 <RefreshCw size={12} className="animate-spin" />
                 {isFr ? 'Chargement de la suite...' : 'Loading more...'}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.3 }}>
                 <Search size={40} style={{ margin: '0 auto 15px' }} />
                 <p style={{ fontSize: '14px', fontWeight: '700' }}>
                   {isFr ? `Aucun résultat pour "${search}"` : `No results for "${search}"`}
                 </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '25px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.2)' }}>
          {type === 'groups' && (
            <div 
              onClick={() => setSilentLeave(!silentLeave)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '12px 15px',
                borderRadius: '12px',
                background: 'rgba(var(--accent-rgb), 0.03)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '6px', 
                border: '2px solid',
                borderColor: silentLeave ? 'var(--accent)' : 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: silentLeave ? 'var(--accent)' : 'transparent',
                transition: 'all 0.2s',
                boxShadow: silentLeave ? '0 0 10px var(--accent-glow)' : 'none'
              }}>
                {silentLeave && <Check size={12} color="white" />}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: silentLeave ? 'white' : 'var(--text-dim)' }}>
                {isFr ? 'Quitter sans en informer les autres membres' : 'Leave without notifying other members'}
              </span>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, height: '50px', borderRadius: '14px' }}
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>
            <button 
              onClick={() => onConfirm(Array.from(selectedIds), silentLeave)}
              disabled={selectedIds.size === 0}
              className="btn-primary"
              style={{ 
                flex: 2, 
                height: '50px', 
                borderRadius: '14px',
                justifyContent: 'center',
                fontSize: '13px'
              }}
            >
              {isFr ? `Confirmer l'action (${selectedIds.size})` : `Confirm action (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
