import { useEffect, useState } from "react";
import { FileText, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { AssetInfoPanel } from "@/components/assets/AssetInfoPanel";
import { AssetBulkPanel } from "@/components/assets/AssetBulkPanel";
import { FolderBulkPanel } from "@/components/assets/FolderBulkPanel";
import { AssetCommentsPanel } from "@/components/assets/AssetCommentsPanel";
import { BatchInfoPanel } from "@/components/assets/BatchInfoPanel";
import { ProjectInfoPanel } from "@/components/assets/ProjectInfoPanel";
import { AssetHistoryList } from "@/components/assets/AssetHistoryList";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetDetail } from "@/hooks/useAssetDetail";
import { useHistory, type HistoryScope } from "@/hooks/useHistory";
import { useAssetStore } from "@/store";

const TABS = [
  { id: "info", label: "Info", icon: FileText },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "history", label: "History", icon: Clock },
] as const;

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("info");
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const selectedFolderId = useAssetStore((state) => state.selectedFolderId);
  const refetchAssets = useAssetStore((state) => state.refetchAssets);
  const multiSelectedIds = useAssetStore((state) => state.multiSelectedIds);
  const assets = useAssetStore((state) => state.assets);
  const folderSummary = useAssetStore((state) => state.folderSummary);
  const clearMultiSelect = useAssetStore((state) => state.clearMultiSelect);
  const multiSelectedAssets = assets.filter((a) => multiSelectedIds.has(a.id));
  // The folder list (ProjectFolderTable) and the asset list share the same multiSelectedIds set,
  // but the ids mean different things depending on which view is active — a folder-list
  // selection's ids won't match anything in `assets`, so multiSelectedAssets alone can't tell
  // "0 images selected" (correct) apart from "these are folder ids, not asset ids" (the actual
  // situation, previously shown as the same wrong 0-count summary).
  const multiSelectedFolders = folderSummary.filter((f) => multiSelectedIds.has(f.id));
  // Checking exactly one checkbox is still "viewing a single item" — it should drive the info
  // panel the same as clicking its row, not fall through to the empty state. Only 2+ checked
  // switches to the bulk summary below. Checkbox selection wins over a stale row click since
  // it's the more recent/explicit signal of what the user means to look at.
  //
  // The checkbox is the same multiSelectedIds set for both the asset list and the folder list
  // (ProjectFolderTable/ProjectsPage), so a single checked id could be either an asset or a
  // folder — cross-reference folderSummary to tell which, instead of assuming "asset" (that
  // assumption left a checked folder's checkbox showing a blank/stuck-loading info panel, since
  // useAssetDetail would look up a folder id as if it were an asset id and find nothing).
  const singleSelectedId = multiSelectedIds.size === 1 ? [...multiSelectedIds][0] : null;
  const singleSelectedIsFolder = singleSelectedId !== null && folderSummary.some((f) => f.id === singleSelectedId);
  const effectiveAssetId = singleSelectedIsFolder ? selectedAssetId : (singleSelectedId ?? selectedAssetId);
  // A single-clicked (not entered) folder row (see ProjectFolderTable/selectFolder) OR a single
  // checked folder checkbox — both should drive the same batch/project info panel.
  const effectiveFolderId = singleSelectedIsFolder
    ? singleSelectedId
    : multiSelectedIds.size === 0
      ? selectedFolderId
      : null;
  const { detail, refetch } = useAssetDetail(effectiveAssetId);
  // History should reflect whatever's actually selected (the requested "update on the selected
  // asset/batch") rather than always showing the unscoped global feed — falls back to that
  // global feed (below) only when nothing at all is selected.
  const historyScope: HistoryScope = effectiveAssetId
    ? { type: "asset", id: effectiveAssetId }
    : effectiveFolderId
      ? { type: effectiveFolderId.startsWith("p-") ? "project" : "batch", id: effectiveFolderId }
      : null;
  const { entries: historyEntries, status: historyStatus } = useHistory(historyScope);

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
    if (effectiveFolderId) setTab("info");
  }, [effectiveFolderId]);

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
            {multiSelectedIds.size > 1 && tab === "info" && multiSelectedFolders.length > 0 ? (
              <FolderBulkPanel folders={multiSelectedFolders} onClear={clearMultiSelect} />
            ) : multiSelectedIds.size > 1 && tab === "info" ? (
              <AssetBulkPanel assets={multiSelectedAssets} onClear={clearMultiSelect} />
            ) : effectiveFolderId && tab === "info" && effectiveFolderId.startsWith("p-") ? (
              <ProjectInfoPanel key={effectiveFolderId} projectId={effectiveFolderId} />
            ) : effectiveFolderId && tab === "info" ? (
              <BatchInfoPanel key={effectiveFolderId} batchId={effectiveFolderId} />
            ) : tab === "history" ? (
              // No unscoped global fallback here on purpose — History is specifically "update on
              // the selected asset/batch"; showing everyone's activity across the whole app when
              // nothing is selected (the previous behavior) is exactly the noise that was
              // reported (other people's unrelated view/download events).
              historyScope ? (
                <AssetHistoryList entries={historyEntries} loading={historyStatus === "loading"} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-white/5">
                    <Clock className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Select an asset or folder to view its history</p>
                </div>
              )
            ) : !effectiveAssetId ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-white/5">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Select an asset or folder to view details</p>
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
            ) : (
              <AssetCommentsPanel assetId={effectiveAssetId!} />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
