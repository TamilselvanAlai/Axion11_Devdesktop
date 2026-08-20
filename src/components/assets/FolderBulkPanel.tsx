import { useState } from "react";
import { Download, Folder, X } from "lucide-react";
import { FolderDownloadDialog } from "@/components/assets/FolderDownloadDialog";
import type { ProjectSummary } from "@/types";

/** Right-panel counterpart to AssetBulkPanel, shown when the multi-selection is folders/batches
 *  (checked in ProjectFolderTable) rather than individual assets — the two share the same
 *  multiSelectedIds store, so RightPanel needs a distinct summary for each kind of selection
 *  instead of always assuming the ids are asset ids (see AssetBulkPanel, which silently shows
 *  "0 images selected" for a folder selection since none of those ids are in the asset list).
 *  Only Download is offered here, matching FolderBulkActionBar — move/delete/approve/reject act
 *  on individual assets, not whole batches, from this view. */
export function FolderBulkPanel({ folders, onClear }: { folders: ProjectSummary[]; onClear: () => void }) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const totalAssets = folders.reduce((sum, f) => sum + f.assetCount, 0);
  const label = folders.length === 1 ? folders[0].name : `${folders.length} folders`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-foreground">{folders.length} folders selected</p>
              <p className="text-xs text-muted-foreground">
                {totalAssets} asset{totalAssets === 1 ? "" : "s"} total. Download them all, or clear the selection.
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {folders.slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-md border border-border bg-white/5 px-2.5 py-1.5 text-xs">
                <Folder className="size-3.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="shrink-0 text-muted-foreground">{f.assetCount}</span>
              </div>
            ))}
            {folders.length > 8 && (
              <p className="text-[10px] text-muted-foreground">+{folders.length - 8} more</p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <button
          type="button"
          onClick={() => setDownloadOpen(true)}
          disabled={folders.length === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-3" /> Download ({folders.length})
        </button>
      </div>

      <FolderDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        folderIds={folders.map((f) => f.id)}
        folderLabel={label}
      />
    </div>
  );
}
