export const env = {
  appName: "Axion VisualOps",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9090/api",
  sessionTtlMs: 1000 * 60 * 60 * 24,
} as const;
