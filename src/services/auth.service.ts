import type { AuthSession, LoginCredentials, User } from "@/types";
import { apiClient } from "@/services/api.service";

interface LoginResponse {
  token: string;
  user: User;
  expiresAt: number;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });

    return { user: data.user, token: data.token, expiresAt: data.expiresAt };
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout").catch(() => undefined);
  },
};
