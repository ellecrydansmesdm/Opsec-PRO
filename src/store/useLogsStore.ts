import { create } from 'zustand';
import { LogEntry } from '../../shared/types';

interface LogsState {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  addLog: (log) => set((state) => ({ 
    logs: [log, ...state.logs].slice(0, 100) 
  })),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: [] }),
}));
