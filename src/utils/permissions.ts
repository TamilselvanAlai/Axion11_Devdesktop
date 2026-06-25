import type { UserRole } from "@/types";

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function hasMinimumRole(role: UserRole | undefined, minimum: UserRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
