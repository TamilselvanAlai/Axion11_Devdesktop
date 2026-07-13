import { useCallback } from "react";
import { authService } from "@/services/auth.service";
import { workSessionService } from "@/services/workSession.service";
import { useAuthStore } from "@/store";
import { isExpired } from "@/utils/helpers";

export function useAuth() {
  const { user, token, expiresAt, isAuthenticated, clearSession } = useAuthStore();

  const sessionExpired = Boolean(expiresAt && isExpired(expiresAt));

  const logout = useCallback(async () => {
    // Close out the working-hours session while the token is still valid — clearSession()
    // below wipes it, and an unauthenticated call would just be dropped.
    await workSessionService.end().catch(() => undefined);
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
