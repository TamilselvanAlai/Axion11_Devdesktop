import type { LoginCredentials, AuthSession } from "@/types";
import type { UserRole } from "@/types/user.types";
import { apiClient } from "@/services/api.service";
import { getInitials } from "@/utils/formatters";
import { env } from "@/config/env";

interface AuthApiResponse {
  token: string;
  email: string;
  name: string;
  role: string;
  teamName: string | null;
}

function mapRole(role: string): UserRole {
  const r = (role ?? "").toUpperCase();
  if (r.includes("SUPER_ADMIN") || r.includes("ADMIN")) return "admin";
  if (
    r.includes("CREATIVE_LEAD") ||
    r.includes("PROJECT_MANAGER") ||
    r.includes("CONTENT_MANAGER") ||
    r.includes("DESIGNER") ||
    r.includes("BILLING")
  )
    return "editor";
  return "viewer";
}

function buildSession(data: AuthApiResponse): AuthSession {
  return {
    user: {
      id: data.email,
      name: data.name,
      email: data.email,
      role: mapRole(data.role),
      initials: getInitials(data.name),
    },
    token: data.token,
    expiresAt: Date.now() + env.sessionTtlMs,
  };
}

export const authService = {
  buildSession,

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data } = await apiClient.post<AuthApiResponse>("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    return buildSession(data);
  },

  async logout(): Promise<void> {
    // JWT is stateless — nothing to invalidate on the server
  },
};
