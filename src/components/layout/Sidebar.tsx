import React from 'react';
import { LayoutDashboard, Zap, Terminal, Settings, LogOut, Crosshair, Globe, Wrench } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { AccountSwitcher } from '../ui/AccountSwitcher';
import { LanyardDevCard } from '../ui/LanyardDevCard';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, onLogout }: SidebarProps) => {
  return (
    <aside className="sidebar">
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px', gap: '4px' }}>
        <Tooltip text="Overview (Tableau de bord)">
          <button 
            className={`nav-button ${activeTab === 'Overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Overview')}
          >
            <LayoutDashboard size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Raid & Combat Hub">
          <button 
            className={`nav-button ${activeTab === 'Raid' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Raid')}
          >
            <Crosshair size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Engine & Automation Hub">
          <button 
            className={`nav-button ${activeTab === 'Engine' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Engine')}
          >
            <Zap size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Tools & Utilities Hub">
          <button 
            className={`nav-button ${activeTab === 'Tools' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Tools')}
          >
            <Wrench size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Network & Proxy Hub">
          <button 
            className={`nav-button ${activeTab === 'Network' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Network')}
          >
            <Globe size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Logs (Console en direct)">
          <button 
            className={`nav-button ${activeTab === 'Logs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Logs')}
          >
            <Terminal size={22} strokeWidth={2} />
          </button>
        </Tooltip>

        <Tooltip text="Settings (Paramètres)">
          <button 
            className={`nav-button ${activeTab === 'Settings' ? 'active' : ''}`} 
            onClick={() => setActiveTab('Settings')}
          >
            <Settings size={22} strokeWidth={2} />
          </button>
        </Tooltip>
      </nav>

      <div style={{ paddingBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
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
