import { useEffect, useState } from "react";
import { FileText, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { AssetInfoPanel } from "@/components/assets/AssetInfoPanel";
import { AssetCommentsPanel } from "@/components/assets/AssetCommentsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { useAssetStore } from "@/store";

const TABS = [
  { id: "info", label: "Info", icon: FileText },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "history", label: "History", icon: Clock },
] as const;

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("info");
  const { snapshot } = useDashboard();
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const { detail, status } = useAssetDetail(selectedAssetId);

  // Selecting a new asset should surface its own details, not whatever tab was
  // left open (e.g. History/Comments) from a previously selected asset.
  useEffect(() => {
    if (selectedAssetId) setTab("info");
  }, [selectedAssetId]);

  return (
    <aside
      className="hidden shrink-0 flex-col border-l border-border bg-muted transition-all duration-200 lg:relative lg:flex"
      style={{ width: collapsed ? 0 : 280, minWidth: collapsed ? 0 : 280 }}
    >
      <button
        type="button"
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        onClick={() => setCollapsed((c) => !c)}
        className={`absolute -left-3 top-1/2 z-20 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-colors lg:flex ${
          collapsed
            ? "border-primary/40 bg-primary text-primary-foreground shadow-primary/30 hover:bg-accent"
            : "border-border bg-popover text-muted-foreground hover:bg-card hover:text-foreground"
        }`}
      >
        {collapsed ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
      </button>

      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-0 border-b border-border px-2 pt-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="size-3" />
                {t.label}
              </button>
            ))}
          </div>

          <div className={`min-h-0 flex-1 ${tab === "history" ? "overflow-y-auto" : "overflow-hidden"}`}>
            {!selectedAssetId && tab !== "history" ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-white/5">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Select an asset to view details</p>
              </div>
            ) : tab === "info" ? (
              status === "loading" || !detail ? (
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-36 rounded-lg" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              ) : (
                <AssetInfoPanel detail={detail} />
              )
            ) : tab === "comments" ? (
              <AssetCommentsPanel assetId={selectedAssetId!} />
            ) : (
              <ActivityList items={snapshot?.activity ?? null} />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
