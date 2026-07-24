import type { User, UserRole } from "@/types";

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  qc: 1,
  admin: 2,
};

export function hasMinimumRole(role: UserRole | undefined, minimum: UserRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Bulk asset move/delete is restricted to Super Admin, Admin, and Project Manager —
 *  narrower than the "admin"/"editor" role buckets used elsewhere, since PROJECT_MANAGER
 *  shares the "editor" bucket with roles (Designer, Content Manager, Creative Lead, Billing)
 *  that should NOT get this capability. */
export function canBulkManageAssets(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.rawRole.toUpperCase().includes("PROJECT_MANAGER");
}
