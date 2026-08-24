import React from 'react';
import { Terminal, ChevronUp, Trash2 } from 'lucide-react';
import { useLogsStore } from '@/store/useLogsStore';

export const LogsDock = () => {
    const { logs, clearLogs } = useLogsStore();
    const lastLog = logs[logs.length - 1];

    if (!lastLog) return null;

    return (
        <div className="log-dock animate-fade-in" onClick={() => window.dispatchEvent(new CustomEvent('switch-to-logs'))}>
            <div className="log-dock-pulse"></div>
            <Terminal size={14} style={{ marginRight: '10px', opacity: 0.5 }} />
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '10px', fontWeight: '800' }}>[{lastLog.time}]</span>
                <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: lastLog.type === 'error' ? 'var(--danger)' : lastLog.type === 'success' ? 'var(--success)' : 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {lastLog.msg}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '20px', opacity: 0.4 }}>
                <span style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '1px' }}>SYSTEM_ACTIVE</span>
                <ChevronUp size={14} />
            </div>
        </div>
    );
};
