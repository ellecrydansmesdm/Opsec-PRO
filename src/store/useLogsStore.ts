import { create } from 'zustand';
import { LogEntry } from '../../shared/types';
import { audioService } from '@/services/AudioService';

interface LogsState {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  addLog: (log) => set((state) => {
    const msg = log.msg || '';
    const isSentinel = msg.includes('[Sentinel]') || msg.includes('[SENTINEL]');
    
    if (isSentinel) {
      // 1. Sentinel Duo Protection Audios
      if (msg.includes('détect') || msg.includes('detect') || msg.includes('Detection')) {
        audioService.play('sentinel_event_detect');
      } else if (msg.includes('restaur') || msg.includes('re-invit') || msg.includes('re-join') || msg.includes('reuss') || msg.includes('force') || msg.includes('rajout')) {
        audioService.play('sentinel_protection_triggered');
      } else if (msg.includes('Demarrage') || msg.includes('active') || msg.includes('activé')) {
        audioService.play('sentinel_active');
      } else if (msg.includes('désactiv') || msg.includes('disabled') || msg.includes('stop')) {
        audioService.play('sentinel_disabled');
      }
    } else {
      // 2. Standard Logs Audios (Filtered/Rate Limited)
      if (log.type === 'error') {
        if (msg.toLowerCase().includes('critical') || msg.toLowerCase().includes('erreur critique') || msg.toLowerCase().includes('fatal') || msg.toLowerCase().includes('💀')) {
          audioService.play('log_error_critical');
        } else {
          audioService.play('log_warn');
        }
      } else if (log.type === 'success') {
        audioService.play('log_success');
      } else {
        // Only play info chimes for principal status events to avoid click fatigue
        if (msg.includes('▶️') || msg.includes('⏹️') || msg.includes('🚀') || msg.includes('🔌') || msg.includes('🎯')) {
          audioService.play('log_info');
        }
      }
    }

    return { 
      logs: [...state.logs, log].slice(-150) 
    };
  }),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: [] }),
}));
