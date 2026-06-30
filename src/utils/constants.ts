export const STORAGE_KEYS = {
  authSession: "axion.auth.session",
  rememberedEmail: "axion.auth.rememberedEmail",
  cloudSyncSession: "axion.cloudSync.session",
} as const;

export const VALIDATION = {
  minPasswordLength: 6,
} as const;
