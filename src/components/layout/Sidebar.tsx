import React from 'react';
import { Shield, LayoutDashboard, Zap, Terminal, Settings, LogOut, Sparkles, UserCircle2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { AccountSwitcher } from '../ui/AccountSwitcher';

import { useUserStore } from '@/store/useUserStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, onLogout }: SidebarProps) => {
  const { user } = useUserStore();
  
  return (
    <aside className="sidebar">
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '50px' }}>
        <Tooltip text="Overview">
          <button 
            className={`nav-button ${activeTab === 'Overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Overview')}
          >
            <LayoutDashboard size={24} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Modules">
          <button 
            className={`nav-button ${activeTab === 'Modules' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Modules')}
          >
            <Zap size={24} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Logs">
          <button 
            className={`nav-button ${activeTab === 'Logs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Logs')}
          >
            <Terminal size={24} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Animations">
          <button 
            className={`nav-button ${activeTab === 'Animations' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Animations')}
          >
            <Sparkles size={24} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Settings">
          <button 
            className={`nav-button ${activeTab === 'Settings' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Settings')}
          >
            <Settings size={24} strokeWidth={2} />
          </button>
        </Tooltip>
      </nav>

      <div style={{ paddingBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {/* Developer Credit - Discreet & Dynamic */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '6px',
          opacity: 0.4,
          transition: 'all 0.3s ease',
          cursor: 'default'
        }} className="dev-credit-hover">
          <div style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            border: '1px solid var(--accent)',
            padding: '1.5px',
            background: 'var(--bg-main)'
          }}>
            <img 
              src={user?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
              alt="dev" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
            />
          </div>
          <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }}>
            Dev by Fahd
          </span>
        </div>

        <AccountSwitcher />
        
        <Tooltip text="Déconnexion">
          <button 
            className="nav-button" 
            onClick={onLogout} 
            style={{ color: 'var(--danger)', marginBottom: 0, opacity: 0.6 }}
          >
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};
