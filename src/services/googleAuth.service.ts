import { apiClient } from "@/services/api.service";
import { authService } from "@/services/auth.service";
import { env } from "@/config/env";
import type { AuthSession } from "@/types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

interface AuthUrlResponse {
  authUrl?: string;
  configured: boolean;
  error?: string;
}

interface AppSignInResponse {
  token: string;
  email: string;
  name: string;
  role: string;
  teamName: string | null;
}

export const googleAuthService = {
  isTauri,

  /** Desktop app: completes the OAuth handshake natively (no browser tab redirect needed). */
  async signInNative(): Promise<AuthSession> {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<AppSignInResponse>("google_app_signin", { apiBaseUrl: env.apiBaseUrl });
    return authService.buildSession(data);
  },

  /** Browser: fetches an auth URL scoped to our own origin and redirects the whole tab to it. */
  async getBrowserAuthUrl(): Promise<AuthUrlResponse> {
    const { data } = await apiClient.post<AuthUrlResponse>("/auth/google/auth-url", {
      origin: window.location.origin,
    });
    return data;
  },

  /** Browser: exchanges the code Google redirected back with for our JWT. */
  async exchangeCode(code: string, redirectUri: string): Promise<AuthSession> {
    const { data } = await apiClient.post<AppSignInResponse>("/auth/google/callback", { code, redirectUri });
    return authService.buildSession(data);
  },
};
