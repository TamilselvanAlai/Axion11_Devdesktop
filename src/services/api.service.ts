import axios from "axios";
import { env } from "@/config/env";
import { useAuthStore } from "@/store";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 here means the stored JWT is invalid against whichever backend we're
    // pointed at right now (expired, or issued by a different backend/JWT secret —
    // e.g. switching between local and prod). Bounce to a clean login instead of
    // leaving every page silently empty.
    if (error?.response?.status === 401 && useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const message =
      error?.response?.data?.message ?? error?.message ?? "Something went wrong talking to the server.";
    return Promise.reject(new Error(message));
  }
);
