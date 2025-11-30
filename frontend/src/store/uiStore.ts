import { create } from 'zustand';

type Role = 'hq' | 'distributor' | 'dealer' | 'field';

interface UiState {
  role: Role;
  sidebarOpen: boolean;
  setRole: (role: Role) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  role: 'hq',
  sidebarOpen: true,
  setRole: (role) => set({ role }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));
