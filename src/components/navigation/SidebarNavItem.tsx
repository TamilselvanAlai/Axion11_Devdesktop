import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export function SidebarNavItem({ to, icon: Icon, label, badge }: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )
      }
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">
          {badge}
        </span>
      ) : null}
    </NavLink>
  );
}
