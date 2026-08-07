import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { ROUTES } from "@/constants/routes";

/** Roles with billing responsibility — matches the backend's TimeReportController
 *  (`hasAnyRole('ADMIN', 'SUPER_ADMIN', 'BILLING_MANAGER')`). Kept here as the single frontend
 *  source of truth so the sidebar nav item and the route guard can't drift apart. */
export const BILLING_ROLES = ["ADMIN", "SUPER_ADMIN", "BILLING_MANAGER"];

/** Client-side route gate for pages the backend also restricts by role (e.g. payroll reports) —
 *  redirects rather than rendering a page that would just 403 on every request. This is a UX
 *  convenience, not the actual security boundary: the backend enforces the real restriction. */
export function RequireRole({ allowedRawRoles }: { allowedRawRoles: string[] }) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRawRoles.includes(user.rawRole)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
