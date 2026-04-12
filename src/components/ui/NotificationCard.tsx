import React from 'react';
import { AlertTriangle, Check, Zap, Globe } from 'lucide-react';
import { LogEntry } from '../../../shared/types';

interface NotificationCardProps {
  log: LogEntry;
}

export const NotificationCard = ({ log }: NotificationCardProps) => (
  <div className="notification-card animate-slide-up" style={{ 
    padding: '20px', 
    borderLeft: `3px solid ${log.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, 
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    marginBottom: '10px',
    boxShadow: log.type === 'error' ? '0 4px 15px rgba(239, 68, 68, 0.05)' : '0 4px 15px rgba(16, 185, 129, 0.05)'
  }}>
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div className="icon-box" style={{ 
        background: log.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
        border: `1px solid ${log.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
        borderRadius: '10px', width: '38px', height: '38px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: log.type === 'error' ? '0 0 15px var(--danger-glow)' : '0 0 15px var(--success-glow)'
      }}>
        {log.type === 'error' ? <AlertTriangle size={18} color="var(--danger)" /> : <Check size={18} color="var(--success)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
           <p style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '0.5px' }}>
              {log.type === 'error' ? 'CRITICAL_FAILURE' : 'MODULE_SUCCESS'}
           </p>
           <button 
             onClick={() => (window as any).electronAPI.jumpToMessage(log.messageId || log.msg)}
             style={{ 
               background: 'rgba(62,99,221,0.08)', 
               border: '1px solid rgba(62,99,221,0.15)', 
               color: 'var(--accent)', 
               fontSize: '9px', 
               fontWeight: '900', 
               cursor: 'pointer', 
               padding: '3px 10px', 
               borderRadius: '5px',
               textTransform: 'uppercase'
             }}>
             Jump
           </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: '500' }}>{log.msg}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.2)' }}>{log.time}</span>
            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase', opacity: 0.6 }}>#OPSEC-CORE</span>
          </div>
          <Zap size={10} opacity={0.3} color="var(--accent)" />
        </div>
      </div>
    </div>
  </div>
);
