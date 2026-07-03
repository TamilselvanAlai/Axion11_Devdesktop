import { useRef, useState } from "react";
import { Home, Clock, RefreshCw, FolderKanban, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { SidebarNavItem } from "@/components/navigation/SidebarNavItem";
import { ProjectTree } from "@/components/navigation/ProjectTree";
import { useProjectTree } from "@/hooks/useProjectTree";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useLocalDrives } from "@/hooks/useLocalDrives";
import { ROUTES } from "@/constants/routes";

function formatGb(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
}

const SYNC_LABEL: Record<string, string> = {
  disconnected: "Not Connected",
  connecting: "Connecting…",
  connected: "Connected",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync Failed",
};

const SYNC_DOT_CLASS: Record<string, string> = {
  disconnected: "bg-muted-foreground",
  connecting: "bg-info animate-pulse",
  connected: "bg-success",
  syncing: "bg-info animate-pulse",
  synced: "bg-success",
  error: "bg-danger",
};

const SYNC_TEXT_CLASS: Record<string, string> = {
  disconnected: "text-muted-foreground",
  connecting: "text-info",
  connected: "text-success",
  syncing: "text-info",
  synced: "text-success",
  error: "text-danger",
};

export function AppSidebar() {
  const projectTree = useProjectTree();
  const { status: syncStatus } = useCloudSync();
  const { drives: localDrives, isTauri } = useLocalDrives();
  const primaryDrive = localDrives
    ? [...localDrives].sort((a, b) => b.totalBytes - a.totalBytes)[0]
    : null;
  const [collapsed, setCollapsed] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const projectsRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);

  function openFlyout() {
    if (!collapsed) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    const rect = projectsRef.current?.getBoundingClientRect();
    if (rect) setFlyoutTop(rect.top);
    setFlyoutOpen(true);
  }

  function scheduleCloseFlyout() {
    closeTimerRef.current = window.setTimeout(() => setFlyoutOpen(false), 200);
  }

  return (
    <aside
      className="relative hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex"
      style={{ width: collapsed ? 56 : 216 }}
    >
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-2.5 top-3 z-10 flex size-5 items-center justify-center rounded-full border border-sidebar-border bg-popover text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="size-2.5" /> : <ChevronLeft className="size-2.5" />}
      </button>

      <div className={`flex h-11 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 ${collapsed ? "justify-center px-0" : ""}`}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
          <Zap className="size-3.5" fill="currentColor" />
        </span>
        {!collapsed && (
          <>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Axion</span>
            <span className="rounded-md border border-sidebar-border bg-white/5 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              VisualOps
            </span>
          </>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-1">
          <SidebarNavItem to={ROUTES.dashboard} icon={Home} label="Dashboard" collapsed={collapsed} />
          <div ref={projectsRef} onMouseEnter={openFlyout} onMouseLeave={scheduleCloseFlyout}>
            <SidebarNavItem to={ROUTES.projects} icon={FolderKanban} label="Projects" collapsed={collapsed} />
            {!collapsed && (
              <div className="mt-0.5">
                <ProjectTree nodes={projectTree} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {!collapsed && (
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">
              My Work
            </p>
          )}
          <SidebarNavItem to={ROUTES.recent} icon={Clock} label="Recent" collapsed={collapsed} />
        </div>

        <div className="flex flex-col gap-1">
          {!collapsed && (
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">
              Operations
            </p>
          )}
          <SidebarNavItem to={ROUTES.transfers} icon={RefreshCw} label="Transfers" collapsed={collapsed} />
        </div>
      </nav>

      {collapsed && flyoutOpen && (
        <div
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleCloseFlyout}
          style={{ top: flyoutTop, left: 56 }}
          className="fixed z-30 w-56 rounded-lg border border-sidebar-border bg-popover p-2 shadow-xl"
        >
          <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">Projects</p>
          <ProjectTree nodes={projectTree} />
        </div>
      )}

      <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span className={`size-1.5 rounded-full ${SYNC_DOT_CLASS[syncStatus]}`} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span>Cloud Sync</span>
              <span className={`flex items-center gap-1 ${SYNC_TEXT_CLASS[syncStatus]}`}>
                <span className={`size-1.5 rounded-full ${SYNC_DOT_CLASS[syncStatus]}`} /> {SYNC_LABEL[syncStatus]}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Cache Usage</span>
                <span className="font-mono">18.4 GB</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[34%] rounded-full bg-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Free Storage</span>
              <span className="font-mono">
                {primaryDrive ? formatGb(primaryDrive.availableBytes) : isTauri ? "—" : "35.6 GB"}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
