import React from 'react';
import { LayoutDashboard, Zap, Terminal, Settings, LogOut, Crosshair, Globe } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { AccountSwitcher } from '../ui/AccountSwitcher';
import { LanyardDevCard } from '../ui/LanyardDevCard';

import { useUserStore } from '@/store/useUserStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, onLogout }: SidebarProps) => {
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

        <Tooltip text="Raid Hub">
          <button 
            className={`nav-button ${activeTab === 'Raid' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Raid')}
          >
            <Crosshair size={24} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Engine Hub">
          <button 
            className={`nav-button ${activeTab === 'Engine' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Engine')}
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

        <Tooltip text="Network Hub">
          <button 
            className={`nav-button ${activeTab === 'Network' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Network')}
          >
            <Globe size={24} strokeWidth={2} />
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
        <LanyardDevCard />

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
