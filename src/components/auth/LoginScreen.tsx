import React, { useState } from 'react';
import { Shield, RefreshCw, Globe, X, ChevronRight } from 'lucide-react';
import { UserProfile } from '../../../shared/types';
import logo from '@/assets/icon.png';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginScreen = ({ onLogin, isModal, onClose }: LoginScreenProps) => {
  const [token, setToken] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return setError('Auth Token Required.');
    setLoading(true); setError(null);
    const response = await window.electronAPI.loginAttempt({ token, rememberMe }) as any;
    setLoading(false);
    if (response.success && response.user) onLogin(response.user);
    else setError(response.error || response.message || 'Invalid Matrix Token.');
  };

  const handleDiscordBrowserLogin = async () => {
    setLoading(true); setError(null);
    const res = await window.electronAPI.loginViaDiscord() as any;
    if (res.success && res.data?.token) {
       const response = await window.electronAPI.loginAttempt({ token: res.data.token, rememberMe: true }) as any;
       if (response.success && response.user) onLogin(response.user);
       else setError(response.error || response.message || 'Node Error');
    } else {
       setError(res.error || res.message || 'Handshake Cancelled');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: isModal ? 'auto' : '100vh', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: isModal ? 'transparent' : '#04040a', 
      position: 'relative',
      overflow: 'hidden',
      color: 'white'
    }}>
      {/* Background Ambience */}
      {!isModal && (
        <>
          <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.03) 0%, transparent 70%)' }}></div>
          <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
        </>
      )}

      <div style={{ 
        width: '450px', 
        padding: '50px', 
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        borderRadius: '4px', // Sharp technical look
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 50px rgba(0, 210, 255, 0.05)',
        position: 'relative'
      }}>
        {/* Decorative Corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }}></div>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }}></div>

        {isModal && onClose && (
           <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
             <X size={20} />
           </button>
        )}
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', padding: '15px', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.1)', marginBottom: '20px' }}>
            <img 
              src={logo} 
              alt="Opsec" 
              style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px var(--accent))' }} 
            />
          </div>
          <h1 style={{ 
            fontFamily: "'Orbitron', sans-serif", 
            fontSize: '24px', 
            letterSpacing: '5px', 
            fontWeight: '900',
            textShadow: '0 0 20px var(--accent-glow)'
          }}>
            OPSEC <span style={{ color: 'var(--accent)' }}>LOGIN</span>
          </h1>
          <div style={{ height: '2px', width: '40px', background: 'var(--accent)', margin: '15px auto' }}></div>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {isModal ? "Authentication Node Required" : "Authorized Personnel Only"}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              value={token} 
              onChange={(e) => setToken(e.target.value)} 
              placeholder="MATRIX TOKEN" 
              style={{ 
                width: '100%', 
                padding: '16px 20px', 
                background: 'rgba(0, 0, 0, 0.4)', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                color: 'white', 
                fontSize: '13px', 
                letterSpacing: '1px',
                outline: 'none',
                fontFamily: 'monospace'
              }} 
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              onClick={() => setRememberMe(!rememberMe)}
              style={{ 
                width: '18px', height: '18px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: rememberMe ? 'var(--accent)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {rememberMe && <ChevronRight size={12} color="black" />}
            </div>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
              Persist session (Auto-Login)
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              padding: '18px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
              borderRadius: '2px', // Sharp
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '13px',
              fontWeight: '900',
              letterSpacing: '2px',
              cursor: 'pointer',
              pointerEvents: 'auto' // Force interactions even when disabled if needed
            }}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Shield size={18} />}
            {loading ? 'CONNECTING...' : 'INITIATE AUTH'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0', gap: '15px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
        </div>

        <button 
          onClick={handleDiscordBrowserLogin} 
          disabled={loading} 
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'transparent', 
            border: '1px solid rgba(88, 101, 242, 0.2)', 
            color: 'white', 
            cursor: 'pointer', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '11px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(88, 101, 242, 0.05)'; e.currentTarget.style.borderColor = '#5865F2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.2)'; }}
        >
           <Globe size={16} color="#5865F2" />
           Discord Handshake
        </button>
        
        {error && (
          <div style={{ marginTop: '20px', color: '#ff4444', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center', background: 'rgba(255, 68, 68, 0.05)', padding: '10px', border: '1px solid rgba(255, 68, 68, 0.1)' }}>
            [ERROR] {error.toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Scanline Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', opacity: 0.1 }}></div>
    </div>
  );
};
