import { useEffect, useState } from "react";
import { FileText, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { AssetInfoPanel } from "@/components/assets/AssetInfoPanel";
import { AssetBulkPanel } from "@/components/assets/AssetBulkPanel";
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
  const refetchAssets = useAssetStore((state) => state.refetchAssets);
  const multiSelectedIds = useAssetStore((state) => state.multiSelectedIds);
  const assets = useAssetStore((state) => state.assets);
  const clearMultiSelect = useAssetStore((state) => state.clearMultiSelect);
  const multiSelectedAssets = assets.filter((a) => multiSelectedIds.has(a.id));
  // Checking exactly one checkbox is still "viewing a single asset" — it should drive the info
  // panel the same as clicking its row, not fall through to the empty state. Only 2+ checked
  // switches to the bulk summary below. Checkbox selection wins over a stale row click since
  // it's the more recent/explicit signal of what the user means to look at.
  const effectiveAssetId = multiSelectedIds.size === 1 ? [...multiSelectedIds][0] : selectedAssetId;
  const { detail, refetch } = useAssetDetail(effectiveAssetId);

  function handleStatusChange() {
    refetch();
    refetchAssets();
  }

  // Selecting a new asset should surface its own details, not whatever tab was
  // left open (e.g. History/Comments) from a previously selected asset. Starting a multi-select
  // does the same, so the bulk view (only rendered under the Info tab) actually shows up.
  useEffect(() => {
    if (effectiveAssetId) setTab("info");
  }, [effectiveAssetId]);

  useEffect(() => {
    if (multiSelectedIds.size > 1) setTab("info");
  }, [multiSelectedIds.size > 1]);

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
            {multiSelectedIds.size > 1 && tab === "info" ? (
              <AssetBulkPanel assets={multiSelectedAssets} onClear={clearMultiSelect} />
            ) : !effectiveAssetId && tab !== "history" ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-white/5">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Select an asset to view details</p>
              </div>
            ) : tab === "info" ? (
              // Keyed only on `!detail` (not `status`) — while switching between an asset's own
              // versions, the previous version's detail stays on screen until the new one
              // resolves, then the keyed remount below swaps straight to it. Gating on
              // `status === "loading"` too would flash the skeleton on every version switch.
              !detail ? (
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-36 rounded-lg" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              ) : (
                <AssetInfoPanel key={detail.id} detail={detail} onStatusChange={handleStatusChange} />
              )
            ) : tab === "comments" ? (
              <AssetCommentsPanel assetId={effectiveAssetId!} />
            ) : (
              <ActivityList items={snapshot?.activity ?? null} />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
