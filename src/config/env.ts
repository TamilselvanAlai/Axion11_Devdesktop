export const env = {
  appName: "Axion VisualOps",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
  sessionTtlMs: 1000 * 60 * 60 * 8,
} as const;
