import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CloudAccount, CloudSyncStatus } from "@/types";
import { STORAGE_KEYS } from "@/utils/constants";

interface CloudSyncStoreState {
  status: CloudSyncStatus;
  account: CloudAccount | null;
  lastSyncedAt: string | null;
  fileCount: number;
  error: string | null;
  setStatus: (status: CloudSyncStatus) => void;
  setConnected: (account: CloudAccount) => void;
  setSynced: (fileCount: number) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useCloudSyncStore = create<CloudSyncStoreState>()(
  persist(
    (set) => ({
      status: "disconnected",
      account: null,
      lastSyncedAt: null,
      fileCount: 0,
      error: null,
      setStatus: (status) => set({ status, error: null }),
      setConnected: (account) => set({ account, status: "connected", error: null }),
      setSynced: (fileCount) =>
        set({ status: "synced", fileCount, lastSyncedAt: new Date().toISOString(), error: null }),
      setError: (error) => set({ status: "error", error }),
      reset: () => set({ status: "disconnected", account: null, lastSyncedAt: null, fileCount: 0, error: null }),
    }),
    { name: STORAGE_KEYS.cloudSyncSession }
  )
);
