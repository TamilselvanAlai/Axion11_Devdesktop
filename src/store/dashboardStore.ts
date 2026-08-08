import { create } from "zustand";
import type { DashboardSnapshot, LoadingState } from "@/types";

interface DashboardStoreState {
  snapshot: DashboardSnapshot | null;
  status: LoadingState;
  error: string | null;
  /** Seconds accumulated locally by useWorkSessionTracking's tick loop since the last snapshot
   *  fetch — added on top of snapshot.stats.timeManagement.activeSecondsToday so the dashboard's
   *  Active Editing Time ticks up in real time (every ~30s, as ticks actually happen) instead of
   *  only updating whenever the next full snapshot happens to be refetched. Reset to 0 whenever a
   *  fresh snapshot lands, since that snapshot's own number already accounts for everything up to
   *  that point — otherwise this would keep compounding on top of an already-current total. */
  liveActiveSecondsBonus: number;
  bumpLiveActiveSeconds: (deltaSeconds: number) => void;
  setSnapshot: (snapshot: DashboardSnapshot) => void;
  setStatus: (status: LoadingState) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  snapshot: null,
  status: "idle",
  error: null,
  liveActiveSecondsBonus: 0,
  bumpLiveActiveSeconds: (deltaSeconds) =>
    set((state) => ({ liveActiveSecondsBonus: state.liveActiveSecondsBonus + deltaSeconds })),
  setSnapshot: (snapshot) => set({ snapshot, status: "success", error: null, liveActiveSecondsBonus: 0 }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
}));
