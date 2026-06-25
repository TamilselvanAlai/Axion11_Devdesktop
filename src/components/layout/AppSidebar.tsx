import { Home, FolderKanban, Clock, RefreshCw, Zap } from "lucide-react";
import { SidebarNavItem } from "@/components/navigation/SidebarNavItem";
import { ROUTES } from "@/constants/routes";

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </span>
        <span className="text-sm font-semibold text-sidebar-foreground">Axion</span>
        <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[11px] font-medium text-sidebar-foreground/70">
          VisualOps
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/40">
            Workspace
          </p>
          <SidebarNavItem to={ROUTES.dashboard} icon={Home} label="Dashboard" />
          <SidebarNavItem to={ROUTES.assets} icon={FolderKanban} label="Projects" />
        </div>

        <div className="flex flex-col gap-1">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/40">
            My Work
          </p>
          <SidebarNavItem to={ROUTES.settings} icon={Clock} label="Recent" />
        </div>

        <div className="flex flex-col gap-1">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/40">
            Operations
          </p>
          <SidebarNavItem to={ROUTES.settings} icon={RefreshCw} label="Transfers" />
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        <div className="flex items-center justify-between">
          <span>Cloud Sync</span>
          <span className="flex items-center gap-1 text-emerald-500">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Running
          </span>
        </div>
      </div>
    </aside>
  );
}
