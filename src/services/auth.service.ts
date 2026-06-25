import type { AuthSession, LoginCredentials } from "@/types";
import { env } from "@/config/env";
import { delay } from "@/utils/helpers";
import { getInitials } from "@/utils/formatters";

/**
 * Mock implementation behind a stable interface so a real API
 * (axios via apiClient) can be swapped in without touching
 * stores, hooks, or components.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await delay(200);

    if (credentials.password === "wrong") {
      throw new Error("Incorrect email or password. Please try again.");
    }

    const name = credentials.email.split("@")[0].replace(/[._]/g, " ");
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    return {
      user: {
        id: "usr_001",
        name: displayName || "Jordan K.",
        email: credentials.email,
        role: "admin",
        initials: getInitials(displayName || "Jordan K."),
      },
      token: `mock_${Date.now()}`,
      expiresAt: Date.now() + env.sessionTtlMs,
    };
  },

  async logout(): Promise<void> {
    await delay(40);
  },

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    await delay(40);
    return { ...session, expiresAt: Date.now() + env.sessionTtlMs };
  },
};
