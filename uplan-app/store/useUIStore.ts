import { create } from 'zustand';

interface UIState {
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  showManualAdd: boolean;
  setShowManualAdd: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showScanner: false,
  setShowScanner: (v) => set({ showScanner: v }),
  showManualAdd: false,
  setShowManualAdd: (v) => set({ showManualAdd: v }),
}));
