import React, { useState, useEffect } from 'react';
import logo from '@/assets/icon.png';

export const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState('INITIALIZING SECURE KERNEL...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const texts = [
      'INITIALIZING SECURE KERNEL...',
      'CONNECTING TO ENCRYPTED NODES...',
      'DECRYPTING SESSION HANDSHAKE...',
      'VERIFYING IDENTITY TOKEN...',
      'READYING OPSEC PERSISTENCE...',
      'SYNCHRONIZING MODULES...',
      'ESTABLISHING SECURE TUNNEL...'
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 1500);

    const progInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 100;
        const inc = Math.random() * 5;
        return p + inc > 100 ? 100 : p + inc;
      });
    }, 200);

    return () => {
      clearInterval(interval);
      clearInterval(progInterval);
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: '#050508', color: 'white',
      position: 'fixed', top: 0, left: 0, zIndex: 99999, overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Background Ambience */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, rgba(0, 210, 255, 0.08) 0%, transparent 70%)',
        opacity: 0.5,
      }}></div>
      
      {/* Animated Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
        pointerEvents: 'none'
      }}></div>

      {/* Main Logo Container */}
      <div style={{ 
        position: 'relative', 
        marginBottom: '40px', 
        zIndex: 10,
        height: '230px', // Tall enough for the rotated diamond
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Pulsing Outer Rings */}
        <div style={{
          position: 'absolute', width: '220px', height: '220px', border: '1px solid rgba(0, 210, 255, 0.1)',
          borderRadius: '50%', animation: 'ping-slow 3s infinite'
        }}></div>
        <div style={{
          position: 'absolute', width: '280px', height: '280px', border: '1px solid rgba(0, 210, 255, 0.05)',
          borderRadius: '50%', animation: 'ping-slow 3s infinite reverse'
        }}></div>

        <div style={{
          width: '160px', height: '160px',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '2px solid var(--accent)',
          borderRadius: '40px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 50px var(--accent-glow), inset 0 0 20px var(--accent-glow)',
          transform: 'rotate(45deg)', 
          animation: 'float 3s ease-in-out infinite'
        }}>
          <img 
            src={logo} 
            alt="Opsec" 
            style={{ 
              width: '80px', height: '80px', 
              objectFit: 'contain', 
              transform: 'rotate(-45deg)', 
              filter: 'drop-shadow(0 0 15px var(--accent))'
            }} 
          />
        </div>

        {/* Scanning Line - Centered and scanning correctly */}
        <div style={{
          position: 'absolute', width: '240px', height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          boxShadow: '0 0 15px var(--accent)',
          animation: 'scan 2s linear infinite',
          zIndex: 11
        }}></div>
      </div>

      {/* Text Content */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '32px', fontWeight: '900',
          letterSpacing: '10px', marginBottom: '8px',
          background: 'linear-gradient(to bottom, #fff, #fff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px var(--accent-glow))'
        }}>
          OPSEC <span style={{ color: 'var(--accent)', WebkitTextFillColor: 'var(--accent)', fontWeight: '950', textShadow: '0 0 15px var(--accent-glow)' }}>PRO</span> <span style={{ opacity: 0.4, fontSize: '14px', letterSpacing: '2px', WebkitTextFillColor: '#fff' }}>RELEASE</span>
        </h1>
        <p style={{
          fontSize: '10px', color: 'var(--accent)', 
          fontWeight: '900', letterSpacing: '4px',
          textTransform: 'uppercase', opacity: 0.8,
          marginBottom: '40px'
        }}>
          ADVANCED PROTECTION SUITE
        </p>

        {/* Technical Progress Bar */}
        <div style={{
          width: '300px', height: '4px', background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '2px', overflow: 'hidden', position: 'relative',
          margin: '0 auto 20px', border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, transparent, var(--accent))',
            boxShadow: '0 0 10px var(--accent)',
            transition: 'width 0.3s ease'
          }}></div>
          {/* Animated Glow on Bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '30px',
            background: 'linear-gradient(90deg, transparent, #fff, transparent)',
            opacity: 0.3, animation: 'bar-swipe 2s linear infinite'
          }}></div>
        </div>

        {/* Status Line */}
        <div style={{
          fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{Math.round(progress)}%</span>
          <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'blink 0.5s infinite' }}></span>
             {loadingText}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ping-slow { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.2); opacity: 0; } }
        @keyframes float { 0%, 100% { transform: rotate(45deg) translateY(0); } 50% { transform: rotate(45deg) translateY(-10px); } }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes bar-swipe { 0% { left: -100%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
};
