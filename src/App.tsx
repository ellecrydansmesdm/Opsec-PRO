import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useLogsStore } from '@/store/useLogsStore';
import { useSettingsStore } from '@/store/useSettingsStore';

// Layout & UI
import { TitleBar } from '@/components/layout/TitleBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { LoadingScreen } from '@/components/auth/LoadingScreen';
import { FullScreenBackground } from '@/components/ui/FullScreenBackground';

// Pages
import { Overview } from '@/pages/Overview';
import { Modules } from '@/pages/Modules';
import { Logs } from '@/pages/Logs';
import { Settings } from '@/pages/Settings';
import { Animations } from '@/pages/Animations';

function App() {
  const { user, isAuthenticated, setUser, setAuthenticated, logout } = useUserStore();
  const { addLog } = useLogsStore();
  const { settings, setSettings } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmData, setConfirmData] = useState<any>({ isOpen: false });
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Apply dynamic theme variables to root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // 1. Opacity Variable
    root.style.setProperty('--ui-opacity', settings.themeOpacity?.toString() || '0.8');
    
    // 2. Wallpaper Class Toggle
    if (settings.themeBackground) {
      body.classList.add('has-wallpaper');
      root.style.setProperty('--has-wallpaper', '1');
    } else {
      body.classList.remove('has-wallpaper');
      root.style.setProperty('--has-wallpaper', '0');
    }
  }, [settings.themeOpacity, settings.themeBackground]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddModal(false);
        setConfirmData((prev: any) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleEsc);

    // Bootstrap function
    const initApp = async () => {
      console.log("[OPSEC] Initializing Application...");
      try {
        const settingsRes = await window.electronAPI.getSettings();
        console.log("[OPSEC] Settings Load Result:", settingsRes.success ? "SUCCESS" : "FAILED");
        
        if (settingsRes.success && settingsRes.data) {
          const storedSettings = settingsRes.data;
          setSettings(storedSettings);
          console.log("[OPSEC] AutoLogin Flag:", storedSettings.autoLogin);
          
          const selectedAccount = storedSettings.accounts?.find((a: any) => a.selected);
          console.log("[OPSEC] Selected Account ID:", selectedAccount?.id || "NONE");

          // ONLY attempt auto-login if the toggle is ON AND we have a selected account
          if (storedSettings.autoLogin && selectedAccount) {
            console.log("[OPSEC] Auto-login attempt for:", selectedAccount.username);
            const loginRes = await window.electronAPI.selectAccount(selectedAccount.id);
            
            if (loginRes.success && loginRes.data?.user) {
              console.log("[OPSEC] Auto-login SUCCESS");
              setUser(loginRes.data.user);
              setAuthenticated(true);
              setIsInitializing(false);
              return;
            } else {
              console.warn("[OPSEC] Auto-login FAILED:", loginRes?.error);
            }
          }
        }

        // Fallback: Check if already authenticated at session level
        const authRes = await window.electronAPI.checkAuth();
        if (authRes.success && authRes.data?.authenticated && authRes.data.user) {
          console.log("[OPSEC] Session authenticated from previous state");
          setUser(authRes.data.user);
          setAuthenticated(true);
        } else {
          console.log("[OPSEC] No active session, redirecting to login");
          setAuthenticated(false);
        }
      } catch (err) {
        console.error("[OPSEC] Init error:", err);
        setAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();

    window.electronAPI.onLog((newLog) => addLog(newLog));
    
    const handleOpenAdd = () => setShowAddModal(true);
    window.addEventListener('open-add-account' as any, handleOpenAdd);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('open-add-account' as any, handleOpenAdd);
    };
  }, []);

  const handleLogout = () => { 
    window.electronAPI.logout(); 
    logout(); 
  };

  if (isInitializing) return <LoadingScreen />;

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: settings.themeBackground ? 'transparent' : 'var(--bg-main)', 
      overflow: 'hidden' 
    }}>
      <FullScreenBackground />
      <TitleBar />
      
      {!isAuthenticated ? (
        <LoginScreen onLogin={(userData) => { setUser(userData); setAuthenticated(true); }} />
      ) : (
        <div className="app-container" style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: 0 }}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
          
          <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'Overview' && user && (
              <Overview 
                onSwitch={() => setShowAddModal(true)} 
                onAdd={() => setShowAddModal(true)} 
              />
            )}
            
            {activeTab === 'Modules' && (
              <Modules onConfirm={(data) => setConfirmData(data)} />
            )}
            
            {activeTab === 'Logs' && <Logs />}
            
            {activeTab === 'Animations' && <Animations />}
            
            {activeTab === 'Settings' && <Settings />}
          </main>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={() => confirmData.onConfirm?.()}
        onCancel={() => setConfirmData({ ...confirmData, isOpen: false })}
        type={confirmData.type}
      />

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-card animate-slide-up" onClick={e => e.stopPropagation()} style={{ padding: '40px', position: 'relative' }}>
            <LoginScreen isModal onLogin={(u) => { setUser(u); setShowAddModal(false); }} onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
