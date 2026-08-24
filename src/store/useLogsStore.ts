import { create } from 'zustand';
import { LogEntry } from '../../shared/types';
import { audioService } from '@/services/AudioService';

interface LogsState {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
}

let logQueue: LogEntry[] = [];
let batchScheduled = false;

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  addLog: (log) => {
    const msg = log.msg || '';
    const isSentinel = msg.includes('[Sentinel]') || msg.includes('[SENTINEL]');
    
    if (isSentinel) {
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
      if (log.type === 'error') {
        if (msg.toLowerCase().includes('critical') || msg.toLowerCase().includes('erreur critique') || msg.toLowerCase().includes('fatal') || msg.toLowerCase().includes('💀')) {
          audioService.play('log_error_critical');
        } else {
          audioService.play('log_warn');
        }
      } else if (log.type === 'success') {
        audioService.play('log_success');
      } else {
        if (msg.includes('▶️') || msg.includes('⏹️') || msg.includes('🚀') || msg.includes('🔌') || msg.includes('🎯')) {
          audioService.play('log_info');
        }
      }
    }

    logQueue.push(log);

    if (!batchScheduled) {
      batchScheduled = true;
      setTimeout(() => {
        const batch = [...logQueue];
        logQueue = [];
        batchScheduled = false;

        set((state) => ({
          logs: [...state.logs, ...batch].slice(-150)
        }));
      }, 100);
    }
  },
  setLogs: (logs) => set({ logs }),
  clearLogs: () => {
    logQueue = [];
    set({ logs: [] });
  },
}));
