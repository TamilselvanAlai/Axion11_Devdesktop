import { useCallback } from "react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store";
import { isExpired } from "@/utils/helpers";

export function useAuth() {
  const { user, token, expiresAt, isAuthenticated, clearSession } = useAuthStore();

  const sessionExpired = Boolean(expiresAt && isExpired(expiresAt));

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

  return {
    user,
    token,
    isAuthenticated: isAuthenticated && !sessionExpired,
    sessionExpired,
    logout,
  };
}
