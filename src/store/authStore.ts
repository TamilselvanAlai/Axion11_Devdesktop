import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, User } from "@/types";
import { STORAGE_KEYS } from "@/utils/constants";

interface AuthStoreState {
  user: User | null;
  token: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      setSession: (session) =>
        set({
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt,
          isAuthenticated: true,
        }),
      clearSession: () =>
        set({ user: null, token: null, expiresAt: null, isAuthenticated: false }),
    }),
    { name: STORAGE_KEYS.authSession }
  )
);
