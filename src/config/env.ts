export const env = {
  appName: "Axion VisualOps",
  // Defaults to the production backend so a build can never silently fall back to
  // localhost — local dev overrides this via .env.development.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://axion11-backend-rrv7iez2za-uc.a.run.app/api",
  sessionTtlMs: 1000 * 60 * 60 * 24,
} as const;
