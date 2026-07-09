export type UserRole = "admin" | "editor" | "qc" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  initials: string;
}
