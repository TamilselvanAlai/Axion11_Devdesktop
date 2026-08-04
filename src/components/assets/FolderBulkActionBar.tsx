import { useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssetStore } from "@/store";
import { FolderDownloadDialog } from "@/components/assets/FolderDownloadDialog";
import type { ProjectSummary } from "@/types";

/** Floating action bar for the folder list (see ProjectFolderTable) — mirrors BulkActionBar's
 *  layout/placement for the asset list, but folders only support Download (move/delete apply to
 *  individual assets, not whole batches, from this view). */
export function FolderBulkActionBar({ folders }: { folders: ProjectSummary[] }) {
  const { multiSelectedIds, clearMultiSelect } = useAssetStore();
  const [downloadOpen, setDownloadOpen] = useState(false);

  if (multiSelectedIds.size === 0) return null;

  const selectedIds = Array.from(multiSelectedIds);
  const selectedNames = folders.filter((f) => multiSelectedIds.has(f.id)).map((f) => f.name);
  const label = selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length} folders`;

  return (
    <>
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <span className="whitespace-nowrap text-sm font-medium text-primary">
            {selectedIds.length} selected
          </span>

          <div className="h-4 w-px bg-border" />

          <Button size="xs" onClick={() => setDownloadOpen(true)}>
            <Download /> Download
          </Button>

          <Button
            size="xs"
            variant="ghost"
            aria-label="Clear selection"
            onClick={() => clearMultiSelect()}
          >
            <X /> Clear
          </Button>
        </div>
      </div>

      <FolderDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        folderIds={selectedIds}
        folderLabel={label}
      />
    </>
  );
}
