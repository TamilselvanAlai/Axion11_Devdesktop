import { create } from "zustand";
import type { User } from "@/types";

interface UserStoreState {
  profile: User | null;
  setProfile: (profile: User | null) => void;
}

export const useUserStore = create<UserStoreState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
