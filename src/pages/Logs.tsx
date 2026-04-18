import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, Trash2, Shield, Filter, ChevronDown, Activity } from 'lucide-react';
import { useLogsStore } from "@/store/useLogsStore";

export const Logs = () => {
  const { logs, clearLogs } = useLogsStore();
  const [filter, setFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(l => {
    const matchesText = l.msg.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === 'all' || l.type === typeFilter;
    return matchesText && matchesType;
  });

  const exportLogs = () => {
    const text = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opsec-logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100% - 10px)', display: 'flex', flexDirection: 'column', padding: '20px 30px' }}>
      {/* Header CLI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '12px', color: 'var(--accent)' }}><Terminal size={24} /></div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--bg-main)' }}></div>
           </div>
           <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em' }}>Console <span style={{ color: 'var(--accent)' }}>Système</span></h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                 <Activity size={10} />
                 <p className="caption" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Quantum_Kernel_v1.2.0 active</p>
              </div>
           </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportLogs} disabled={logs.length === 0} className="btn-secondary" style={{ fontSize: '10px' }}>EXPORTER</button>
          <button onClick={clearLogs} className="btn-danger" style={{ fontSize: '10px', height: '35px' }}><Trash2 size={14} /> EFFACER</button>
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
          <input 
            type="text" 
            placeholder="Filtrer les logs..." 
            className="input-field" 
            style={{ width: '100%', paddingLeft: '40px', height: '38px', fontSize: '12px' }}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '2px' }}>
          {(['all', 'success', 'error', 'info'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '10px 18px',
                fontSize: '11px',
                fontWeight: '900',
                border: 'none',
                background: typeFilter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: typeFilter === t ? 'var(--accent)' : 'var(--text-dim)',
                borderRadius: '8px',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '10px', borderLeft: '1px solid var(--border)' }}>
           <div onClick={() => setAutoScroll(!autoScroll)} className={`nighty-toggle ${autoScroll ? 'active' : ''}`} style={{ width: '32px', height: '16px' }}>
             <div className="nighty-toggle-handle" style={{ width: '12px', height: '12px' }}></div>
           </div>
           <span style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>AUTO_SCROLL</span>
        </div>
      </div>

      {/* Main Console */}
      <div 
        ref={scrollRef}
        className="custom-scrollbar"
        style={{ 
          flex: 1, 
          background: 'rgba(5, 7, 15, 0.4)', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}
        onScroll={(e) => {
          const target = e.currentTarget;
          if (target.scrollHeight - target.scrollTop - target.clientHeight > 100) {
            if (autoScroll) setAutoScroll(false);
          }
        }}
      >
        {filteredLogs.map((l, i) => (
          <div key={i} className={`log-line ${l.type}`} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ opacity: 0.2, minWidth: '85px', userSelect: 'none' }}>[{l.time}]</span>
            <span className="log-tag" style={{ 
              background: l.type === 'error' ? 'rgba(255, 71, 87, 0.1)' : l.type === 'success' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(52, 123, 255, 0.1)',
              color: l.type === 'error' ? 'var(--danger)' : l.type === 'success' ? '#80ffab' : '#80e1ff'
            }}>
              {l.type.toUpperCase()}
            </span>
            <span style={{ flex: 1 }}>{l.msg}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.05 }}>
            <Shield size={100} strokeWidth={1} />
            <h2 style={{ fontSize: '18px', marginTop: '20px' }}>EN_ATTENTE_DE_SIGNAUX</h2>
          </div>
        )}
      </div>
    </div>
  );
};
