import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser } from "@/hooks/useUser";
import { useAssetStore } from "@/store";
import { assetService } from "@/services/asset.service";
import { canBulkManageAssets } from "@/utils/permissions";
import { flattenBatchOptions } from "@/utils/assetPath";

export function BulkActionBar() {
  const user = useUser();
  const { multiSelectedIds, clearMultiSelect, projectTree, refetchAssets } = useAssetStore();
  const [targetBatchId, setTargetBatchId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (multiSelectedIds.size === 0 || !canBulkManageAssets(user)) return null;

  const batchOptions = flattenBatchOptions(projectTree);
  const selectedIds = Array.from(multiSelectedIds);

  async function handleMove() {
    if (!targetBatchId) return;
    setBusy(true);
    try {
      await assetService.moveAssetsBulk(selectedIds, targetBatchId);
      toast.success(`Moved ${selectedIds.length} asset${selectedIds.length === 1 ? "" : "s"}.`);
      clearMultiSelect();
      setTargetBatchId("");
      await Promise.all([refetchAssets(), useAssetStore.getState().refetchProjectTree()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move assets.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await assetService.deleteAssetsBulk(selectedIds);
      toast.success(`Deleted ${selectedIds.length} asset${selectedIds.length === 1 ? "" : "s"}.`);
      clearMultiSelect();
      await Promise.all([refetchAssets(), useAssetStore.getState().refetchProjectTree()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete assets.");
    } finally {
      setBusy(false);
      setConfirmDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <span className="whitespace-nowrap text-xs font-medium">
            {selectedIds.length} selected
          </span>

          <div className="h-4 w-px bg-border" />

          <Select value={targetBatchId} onValueChange={setTargetBatchId}>
            <SelectTrigger size="sm" className="w-40 text-xs">
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent className="overflow-y-auto" style={{ maxHeight: 220, width: 256 }}>
              {batchOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} title={opt.label} className="min-w-0 py-1 text-xs">
                  <span className="min-w-0 truncate">{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="xs" disabled={!targetBatchId || busy} onClick={handleMove}>
            Move
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            size="icon-xs"
            variant="destructive"
            disabled={busy}
            aria-label="Delete selected assets"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 />
          </Button>

          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Clear selection"
            onClick={() => clearMultiSelect()}
          >
            <X />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} asset{selectedIds.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the selected assets to Trash. This action can be undone from Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
