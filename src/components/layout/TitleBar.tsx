import React from 'react';
import { Shield, Minus, CornerDownRight, X } from 'lucide-react';
import logo from '@/assets/icon.png';

export const TitleBar = () => {
  const handleMinimize = () => (window as any).electronAPI.minimize();
  const handleMaximize = () => (window as any).electronAPI.maximize();
  const handleClose = () => (window as any).electronAPI.close();

  return (
    <div className="title-bar" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      height: '32px', 
      padding: '0 8px 0 16px',
      background: 'transparent',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
      zIndex: 9999
    } as any}>
      <div className="title-bar-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img 
          src={logo} 
          alt="" 
          style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.4))' }} 
        />
        <span style={{ 
          fontSize: '16px', 
          fontWeight: '900', 
          color: '#fff', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          OPSEC <span style={{ color: 'var(--accent)' }}>PRO</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0px', WebkitAppRegion: 'no-drag' } as any}>
        {/* LAST SYNC Refresh Button - Now on the right */}
        <div 
          onClick={async () => {
            const target = document.getElementById('sync-icon');
            if (target) target.classList.add('animate-spin');
            await (window as any).electronAPI.checkAuth();
            setTimeout(() => {
              if (target) target.classList.remove('animate-spin');
            }, 1500);
          }}
          className="sync-refresh-btn"
          title="Force refresh statistics"
          style={{ 
            marginRight: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'pointer', 
            padding: '2px 8px', 
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.03)',
          } as any}
        >
          <CornerDownRight id="sync-icon" size={10} color="var(--success)" style={{ opacity: 0.6 }} />
          <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--success)', opacity: 0.6 }}>LAST SYNC</span>
        </div>

        <div className="window-controls" style={{ display: 'flex' } as any}>
        <button 
          onClick={handleMinimize}
          className="control-btn"
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>

        <button 
          onClick={handleMaximize}
          className="control-btn"
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <CornerDownRight size={14} strokeWidth={2.5} />
        </button>

        <button 
          onClick={handleClose}
          className="control-btn close"
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  </div>
  );
};
