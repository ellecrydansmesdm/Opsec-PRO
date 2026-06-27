import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../shared/types';
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
import { LogsDock } from '@/components/layout/LogsDock';
import { AccountSwitcher } from '@/components/ui/AccountSwitcher';
import { Notification } from '@/components/ui/Notification';

import { Overview } from '@/pages/Overview';
import { Logs } from '@/pages/Logs';
import { Settings } from '@/pages/Settings';
import { EngineHub } from '@/pages/EngineHub';
import { RaidHub } from '@/pages/RaidHub';
import { NetworkHub } from '@/pages/NetworkHub';
import { audioService } from '@/services/AudioService';
import { motion } from 'framer-motion';

const KeepAlivePage = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
  <motion.div
    initial={false}
    animate={{ 
        opacity: active ? 1 : 0, 
        y: active ? 0 : -10,
        pointerEvents: active ? 'auto' : 'none'
    }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    style={{ 
        height: '100%', 
        width: '100%',
        display: active ? 'block' : 'none',
        position: 'absolute',
        top: 0,
        left: 0
    }}
  >
    {children}
  </motion.div>
);

function App() {
  const { user, isAuthenticated, setUser, setAuthenticated, logout } = useUserStore();
  const { addLog } = useLogsStore();
  const { settings, setSettings } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmData, setConfirmData] = useState<any>({ isOpen: false });
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'danger') => {
    setToast({ message, type });
    audioService.play(type === 'danger' ? 'notif_important' : 'notif_normal');
    setTimeout(() => setToast(null), 3000);
  };
  
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
    
    // 3. Cyber Cursor Toggle
    if (settings.cyberCursorEnabled) {
      body.classList.add('cyber-cursor-active');
      if (settings.customCursorUrl) {
        const formattedPath = settings.customCursorUrl.replace(/\\/g, '/');
        const urlPrefix = formattedPath.startsWith('http') || formattedPath.startsWith('data:') || formattedPath.startsWith('local-resource://') || formattedPath.startsWith('opsec://') ? '' : 'local-resource://';
        // HTML/CSS specification states that base64 data URIs should not be surrounded by quotes inside url() in some older/strict WebKit engines
        const finalUrl = `${urlPrefix}${formattedPath}`;
        root.style.setProperty('--custom-cursor', `url(${finalUrl}), auto`);
      } else {
        root.style.setProperty('--custom-cursor', 'pointer');
      }
    } else {
      body.classList.remove('cyber-cursor-active');
    }

    // 4. Boot Sound
    if (isReady && !isInitializing) {
      const timer = setTimeout(() => {
        audioService.play('boot', { volume: 0.4 });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [settings.themeOpacity, settings.themeBackground, settings.cyberCursorEnabled, settings.customCursorUrl, isReady, isInitializing]);

  useEffect(() => {
    // 4. Global Security : Block Copy & Context Menu
    const disableCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Allow copy in inputs, textareas, or elements with specific classes
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
                      
      const allowCopyClass = target.closest('.allow-copy') || target.closest('.console-output');
      
      if (isInput || allowCopyClass) return;
      
      e.preventDefault();
      showToast(settings.language === 'fr' ? '🔒 PROTECTION OPSEC : Copie non autorisée' : '🔒 OPSEC PROTECTION: Copy not allowed', 'danger');
      audioService.play('denied', { volume: 0.3 });
    };

    const disableContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (!isInput) {
        e.preventDefault();
        audioService.play('denied', { volume: 0.2 });
      }
    };

    document.addEventListener('copy', disableCopy);
    document.addEventListener('contextmenu', disableContextMenu);

    const handleSwitchTab = (e: any) => setActiveTab(e.detail);
    window.addEventListener('switch-tab', handleSwitchTab);

    return () => {
      document.removeEventListener('copy', disableCopy);
      document.removeEventListener('contextmenu', disableContextMenu);
      window.removeEventListener('switch-tab', handleSwitchTab);
    };
  }, [settings.themeOpacity, settings.themeBackground]);

  // 5. Global UI Audio Event Delegation
  useEffect(() => {
    let lastHoveredElement: HTMLElement | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('button, .nav-button, .nighty-toggle, input[type="checkbox"], input[type="radio"], select, [data-sound-hover]');
      if (!target) {
        lastHoveredElement = null;
        return;
      }
      if (target === lastHoveredElement) return;
      lastHoveredElement = target as HTMLElement;

      const customHover = target.getAttribute('data-sound-hover');
      if (customHover === 'none') return;

      const isImportant = target.classList.contains('btn-primary') || 
                          target.classList.contains('btn-danger') || 
                          target.classList.contains('btn-force-cycle') ||
                          customHover === 'important';

      audioService.play(isImportant ? 'nav_hover_important' : 'nav_hover_light');
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (target.getAttribute('data-sound-focus') === 'none') return;
        audioService.play('nav_focus_input');
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('button, .nav-button, .nighty-toggle, input[type="checkbox"], input[type="radio"], select, [data-sound-click]');
      if (!target) return;

      const customClick = target.getAttribute('data-sound-click');
      if (customClick === 'none') return;
      if (customClick) {
        audioService.play(customClick as any);
        return;
      }

      if (target.classList.contains('nav-button') || target.closest('.sidebar nav')) {
        audioService.play('nav_select_tab');
        return;
      }

      if (target.classList.contains('nighty-toggle') || target.getAttribute('type') === 'checkbox' || target.getAttribute('type') === 'radio') {
        const isActive = target.classList.contains('active') || (target as HTMLInputElement).checked;
        audioService.play(isActive ? 'action_toggle_on' : 'action_toggle_off');
        return;
      }

      if (target.classList.contains('btn-primary') || target.classList.contains('btn-danger') || target.classList.contains('btn-force-cycle')) {
        audioService.play('action_btn_primary');
        return;
      }

      if (target.classList.contains('btn-secondary') || target.classList.contains('btn-glass')) {
        audioService.play('action_btn_secondary');
        return;
      }

      audioService.play('action_btn_secondary');
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Modal Audio Triggers
  const showAddModalFirst = useRef(true);
  useEffect(() => {
    if (showAddModalFirst.current) {
      showAddModalFirst.current = false;
      return;
    }
    audioService.play(showAddModal ? 'nav_modal_open' : 'nav_modal_close');
  }, [showAddModal]);

  const isAccountSelectorOpenFirst = useRef(true);
  useEffect(() => {
    if (isAccountSelectorOpenFirst.current) {
      isAccountSelectorOpenFirst.current = false;
      return;
    }
    audioService.play(isAccountSelectorOpen ? 'nav_modal_open' : 'nav_modal_close');
  }, [isAccountSelectorOpen]);

  // Tab navigation page change trigger
  const isFirstTabRender = useRef(true);
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }
    audioService.play('nav_change_page');
  }, [activeTab]);

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
          
          const lastId = storedSettings.lastActiveAccountId;
          let selectedAccount = storedSettings.accounts?.find((a: any) => a.id === lastId);
          if (!selectedAccount) {
              selectedAccount = storedSettings.accounts?.find((a: any) => a.selected);
          }
          if (!selectedAccount && storedSettings.accounts?.length > 0) {
              selectedAccount = storedSettings.accounts[0];
          }
          
          console.log("[OPSEC] Target Account ID for Boot:", selectedAccount?.id || "NONE");

          // ONLY attempt auto-login if the toggle is ON AND we have a valid account
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
        // Small delay to ensure loading screen fade-out is smoother
        setTimeout(() => setIsReady(true), 500);
      }
    };

    initApp();

    const unsubscribeLog = window.electronAPI.onLog((newLog) => addLog(newLog));
    
    const unsubscribeAutoLogin = window.electronAPI.onAutoLogin((userData) => {
      console.log("[OPSEC] Global Auto-login success listener triggered");
      setUser(userData);
      setAuthenticated(true);
      setIsAccountSelectorOpen(false);
    });

    const unsubscribeSettings = window.electronAPI.onSettingsUpdated((newSettings: AppSettings) => {
      console.log("[OPSEC] Settings updated from backend", newSettings);
      setSettings(newSettings);
    });
    
    const handleOpenAdd = () => setShowAddModal(true);
    window.addEventListener('open-add-account' as any, handleOpenAdd);

    const handleOpenSelector = () => setIsAccountSelectorOpen(true);
    window.addEventListener('open-account-selector' as any, handleOpenSelector);

    const handleSwitchToLogs = () => setActiveTab('Logs');
    window.addEventListener('switch-to-logs' as any, handleSwitchToLogs);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('open-add-account' as any, handleOpenAdd);
      window.removeEventListener('open-account-selector' as any, handleOpenSelector);
      window.removeEventListener('switch-to-logs' as any, handleSwitchToLogs);
      unsubscribeLog();
      unsubscribeAutoLogin();
      unsubscribeSettings();
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
      overflow: 'hidden'
    }}>
      <FullScreenBackground />
      <TitleBar />
      
      {!isAuthenticated ? (
        <LoginScreen onLogin={(userData) => { setUser(userData); setAuthenticated(true); }} />
      ) : (
        <div className="app-container" style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingTop: 0 }}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
          
          <main className="main-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            <KeepAlivePage active={activeTab === 'Overview'}>
              {user && (
                <Overview 
                  onSwitch={() => setIsAccountSelectorOpen(true)} 
                  onAdd={() => setShowAddModal(true)} 
                />
              )}
            </KeepAlivePage>
            
            <KeepAlivePage active={activeTab === 'Engine'}>
              {user && <EngineHub showToast={showToast} />}
            </KeepAlivePage>

            <KeepAlivePage active={activeTab === 'Raid'}>
              {user && <RaidHub showToast={showToast} onConfirm={(data) => setConfirmData(data)} />}
            </KeepAlivePage>

            <KeepAlivePage active={activeTab === 'Logs'}>
              <Logs />
            </KeepAlivePage>

            <KeepAlivePage active={activeTab === 'Network'}>
              <NetworkHub />
            </KeepAlivePage>
            
            <KeepAlivePage active={activeTab === 'Settings'}>
              <Settings />
            </KeepAlivePage>
          </main>
          <LogsDock />
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

      {isAccountSelectorOpen && (
        <div className="modal-overlay" onClick={() => setIsAccountSelectorOpen(false)}>
          <div 
            className="modal-content glass-card animate-slide-up" 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '0', width: '350px', overflow: 'hidden' }}
          >
            <div style={{ display: 'none' }}>{/* Placeholder for future modal header if needed */}</div>
            <div style={{ padding: '5px' }}>
                {/* The component itself handles internal styling, we just pass the modal prop */}
                <AccountSwitcher isModal onClose={() => setIsAccountSelectorOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Notification 
          message={toast.message} 
          type={toast.type === 'danger' ? 'error' : 'success'} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default App;
