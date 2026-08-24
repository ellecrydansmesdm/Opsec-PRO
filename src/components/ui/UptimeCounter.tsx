import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface UptimeCounterProps {
  startTime: number;
}

export const UptimeCounter = ({ startTime }: UptimeCounterProps) => {
  const [uptime, setUptime] = useState({ d: '00', h: '00', m: '00', s: '00' });
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      const d = Math.floor(seconds / (3600 * 24));
      const h = Math.floor((seconds % (3600 * 24)) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      setUptime({
        d: d.toString().padStart(2, '0'),
        h: h.toString().padStart(2, '0'),
        m: m.toString().padStart(2, '0'),
        s: s.toString().padStart(2, '0')
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div style={{ marginTop: 'auto' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <Clock size={12} /> {isFr ? "Temps d'activité" : "Account Uptime"}
       </div>
       <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', fontFamily: 'monospace' }}>{uptime.d}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 'bold' }}>{isFr ? 'j' : 'd'}</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', fontFamily: 'monospace' }}>{uptime.h}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 'bold' }}>h</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', fontFamily: 'monospace' }}>{uptime.m}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 'bold' }}>m</span>
       </div>
    </div>
  );
};
