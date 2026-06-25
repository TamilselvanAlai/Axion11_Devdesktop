import { useState, useCallback } from "react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store";
import type { LoginCredentials } from "@/types";
import { STORAGE_KEYS } from "@/utils/constants";
import { writeJson, removeItem } from "@/utils/storage";

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const session = await authService.login(credentials);
        setSession(session);

        if (credentials.rememberMe) {
          writeJson(STORAGE_KEYS.rememberedEmail, credentials.email);
        } else {
          removeItem(STORAGE_KEYS.rememberedEmail);
        }
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sign in. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [setSession]
  );

  return { login, isSubmitting, error, clearError: () => setError(null) };
}
