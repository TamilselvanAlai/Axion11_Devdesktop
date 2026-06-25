export const env = {
  appName: "Axion VisualOps",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://api.axion.local",
  sessionTtlMs: 1000 * 60 * 60 * 8,
} as const;
