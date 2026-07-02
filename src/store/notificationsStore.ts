import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/utils/constants";

interface NotificationsStoreState {
  readIds: string[];
  markAllRead: (ids: string[]) => void;
}

export const useNotificationsStore = create<NotificationsStoreState>()(
  persist(
    (set) => ({
      readIds: [],
      markAllRead: (ids) => set({ readIds: ids }),
    }),
    { name: STORAGE_KEYS.notificationsRead }
  )
);
