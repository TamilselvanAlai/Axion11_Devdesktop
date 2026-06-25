import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  collapsed?: boolean;
}

export function SidebarNavItem({ to, icon: Icon, label, badge, collapsed }: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg text-sm font-semibold transition-colors",
          collapsed ? "mx-auto size-9 justify-center" : "gap-2.5 px-2.5 py-2",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("size-4 shrink-0", !isActive && "text-sidebar-foreground/50")} />
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">{badge}</span>
              ) : null}
              {isActive && <span className="h-3 w-1 shrink-0 rounded-full bg-primary" />}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}
