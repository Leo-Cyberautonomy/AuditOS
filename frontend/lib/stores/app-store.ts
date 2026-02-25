"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activeCaseId: string | null;
  setActiveCaseId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCaseId: null,
      setActiveCaseId: (id) => set({ activeCaseId: id }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "auditOS_v2_app" }
  )
);
