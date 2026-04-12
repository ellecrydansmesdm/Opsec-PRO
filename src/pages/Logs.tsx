import React from 'react';
import { Terminal, ExternalLink, Inbox } from 'lucide-react';
import { useLogsStore } from "@/store/useLogsStore";

export const Logs = () => {
  const { logs } = useLogsStore();

  const exportLogs = () => {
    const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opsec-logs-${new Date().getTime()}.txt`;
    a.click();
  };

  return (
    <div className="glass-card animate-fade-in" style={{ height: 'calc(100% - 10px)', display: 'flex', flexDirection: 'column', padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ background: 'var(--accent-soft)', padding: '12px', borderRadius: '12px', color: 'var(--accent)' }}><Terminal size={24} /></div>
           <div>
              <h1 style={{ fontSize: '24px' }}>Console Système</h1>
              <p className="caption" style={{ opacity: 0.3 }}>HISTORIQUE_DES_PROCESSUS v1.1.0</p>
           </div>
        </div>
        <button 
          onClick={exportLogs} 
          disabled={logs.length === 0} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ExternalLink size={14} /> EXPORTER (.txt)
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
        {logs.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
            <Inbox size={80} strokeWidth={1} style={{ marginBottom: '25px' }} />
            <h2 style={{ fontSize: '18px' }}>AUCUNE_ACTIVITÉ_RÉCENTE</h2>
            <p style={{ fontSize: '12px', marginTop: '10px', fontWeight: '600' }}>Le système est en attente d'incidents ou de commandes.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {logs.map((l, i) => (
                <div key={i} className="animate-fade-in" style={{ 
                   borderLeft: `3px solid ${l.type === 'error' ? 'var(--danger)' : l.type === 'success' ? 'var(--success)' : 'var(--accent)'}`,
                   padding: '16px 20px',
                   background: 'rgba(255,255,255,0.02)',
                   borderRadius: '0 12px 12px 0',
                   marginBottom: '4px',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '20px'
                }}>
                   <span className="caption" style={{ opacity: 0.2, minWidth: '85px' }}>[{l.time}]</span>
                   <span style={{ fontSize: '13px', fontWeight: '600', flex: 1, color: 'rgba(255,255,255,0.9)' }}>{l.msg}</span>
                   <span className="caption" style={{ color: l.type === 'error' ? 'var(--danger)' : l.type === 'success' ? 'var(--success)' : 'var(--accent)', fontSize: '9px' }}>
                     {l.type.toUpperCase()}
                   </span>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
