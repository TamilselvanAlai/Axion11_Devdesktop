import { create } from "zustand";
import type { DashboardSnapshot, LoadingState } from "@/types";

interface DashboardStoreState {
  snapshot: DashboardSnapshot | null;
  status: LoadingState;
  error: string | null;
  setSnapshot: (snapshot: DashboardSnapshot) => void;
  setStatus: (status: LoadingState) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  snapshot: null,
  status: "idle",
  error: null,
  setSnapshot: (snapshot) => set({ snapshot, status: "success", error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
}));
