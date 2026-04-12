import { create } from 'zustand';
import { UserProfile } from '../../shared/types';

interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean | null;
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (status: boolean | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: null,
  setUser: (user) => set({ user }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
