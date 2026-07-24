export type UserRole = "admin" | "editor" | "qc" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Raw backend role string (e.g. "PROJECT_MANAGER") — the coarse `role` bucket collapses
   *  several distinct backend roles into "editor", so permissions that need to single out one
   *  of them (e.g. PROJECT_MANAGER for bulk asset actions) check this instead. */
  rawRole: string;
  avatarUrl?: string;
  initials: string;
}
