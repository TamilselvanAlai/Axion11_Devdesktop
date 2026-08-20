import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { isUrl } from "@/utils/helpers";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { findAncestorPath, versionFolderName } from "@/utils/assetPath";
import type { Asset } from "@/types";

type Category = "Source" | "Draft" | "Final";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "Source", label: "Source (v1)" },
  { key: "Draft", label: "Draft (VE)" },
  { key: "Final", label: "Final (latest version)" },
];

/** Picks, per asset chain (batch + filename), the single row matching `category` — v1 for
 *  Source, the established row for Draft, and the *highest-numbered* non-established row for
 *  Final, not every historical final version, since a bulk export wants each asset's current
 *  state, not its whole history. */
function pickPerChain(assets: Asset[], category: Category): Asset[] {
  const best = new Map<string, Asset>();
  for (const a of assets) {
    if (!isUrl(a.downloadUrl ?? "")) continue;
    if (versionFolderName(a) !== category) continue;
    const key = `${a.batchId ?? ""}::${a.name}`;
    if (category !== "Final") {
      best.set(key, a);
      continue;
    }
    const current = best.get(key);
    const versionNum = (v: string) => parseInt(v.slice(1), 10) || 0;
    if (!current || versionNum(a.version) > versionNum(current.version)) best.set(key, a);
  }
  return Array.from(best.values());
}

interface FolderDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderIds: string[];
  folderLabel: string;
}

export function FolderDownloadDialog({ open, onOpenChange, folderIds, folderLabel }: FolderDownloadDialogProps) {
  const projectTree = useAssetStore((s) => s.projectTree);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  // Which categories this specific folder actually has assets for — null while still loading.
  // A folder that's still all-v1 (nothing sent to draft/final yet) shouldn't offer Draft/Final
  // as choices at all, since checking them would just silently download nothing for that tier.
  const [availableCategories, setAvailableCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    if (!open) {
      setAvailableCategories(null);
      return;
    }
    let cancelled = false;
    assetService.getAllAssetsInFolders(folderIds, projectTree).then((assets) => {
      if (cancelled) return;
      const available = CATEGORIES.map((c) => c.key).filter((key) => pickPerChain(assets, key).length > 0);
      setAvailableCategories(available);
      setSelected(new Set(available));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folderIds.join(",")]);

  function toggle(cat: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Closes the dialog immediately rather than keeping it open (and the rest of the app blocked
  // behind its overlay) for what can be a long, many-file bulk download — the toast this starts
  // carries all further progress instead, and keeps updating in place regardless of this dialog
  // having since closed/unmounted, since it isn't tied to this component's lifecycle at all.
  async function handleDownload() {
    // A batch download must ask where to save, unlike a single-file download (which silently
    // goes to the Mount Settings folder) — see localSyncService.pickFolder. On the web build
    // (no filesystem access) this stays null and the existing per-file window.open behavior
    // inside downloadToMount takes over instead.
    let destination: string | null = mountPoint;
    if (localSyncService.isTauri()) {
      destination = await localSyncService.pickFolder(`Choose a folder to save ${folderLabel} to`);
      if (!destination) return; // user cancelled the picker — leave the dialog open
    }
    const toastId = toast.loading("Preparing download…");
    onOpenChange(false);
    runDownload(toastId, folderIds, selected, projectTree, destination);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download {folderLabel}</DialogTitle>
          <DialogDescription>
            Select which version(s) to download for every asset in the selected folder{folderIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {availableCategories === null &&
            [0, 1].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          {availableCategories?.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">No downloadable files found in this folder.</p>
          )}
          {availableCategories?.length ? (
            <>
              {CATEGORIES.filter((c) => availableCategories.includes(c.key)).map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-white/5"
                >
                  <Checkbox checked={selected.has(c.key)} onCheckedChange={() => toggle(c.key)} />
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                </label>
              ))}
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={handleDownload} disabled={selected.size === 0}>
            <Download className="size-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Runs independently of FolderDownloadDialog's lifecycle — the dialog closes as soon as this
 *  starts (see handleDownload above), so this can't rely on component state for progress; the
 *  toast (looked up by id, not a closure over component state) is the only UI it drives. */
async function runDownload(
  toastId: string | number,
  folderIds: string[],
  selected: Set<Category>,
  projectTree: Parameters<typeof assetService.getAllAssetsInFolders>[1],
  /** Either the folder the user just picked via pickFolder (desktop), or the Mount Settings
   *  default when the picker was skipped (web build). */
  destination: string | null
) {
  try {
    const allAssets = await assetService.getAllAssetsInFolders(folderIds, projectTree);
    const toDownload: Asset[] = [];
    for (const cat of selected) toDownload.push(...pickPerChain(allAssets, cat));

    if (toDownload.length === 0) {
      toast.error("No downloadable files found for the selected version(s).", { id: toastId });
      return;
    }

    let completed = 0;
    let failed = 0;
    toast.loading(`Downloading 0 of ${toDownload.length}…`, { id: toastId });
    localSyncService.notifyDownload("Download started", `Downloading ${toDownload.length} files…`);
    // Sequential, not parallel — each one is a real file write, and this can be hundreds of
    // files across a whole folder; racing them would also make the progress count meaningless.
    for (const a of toDownload) {
      try {
        const ancestors = (a.batchId && findAncestorPath(projectTree, a.batchId)) || [];
        const relativePath = [...ancestors, versionFolderName(a), a.name].join("/");
        await localSyncService.downloadToMount(a.downloadUrl!, relativePath, destination);
        completed++;
      } catch {
        failed++;
      }
      toast.loading(`Downloading ${completed + failed} of ${toDownload.length}…`, { id: toastId });
    }

    if (failed === 0) {
      toast.success(`Downloaded ${completed} file${completed === 1 ? "" : "s"}.`, { id: toastId });
      localSyncService.notifyDownload(
        "Download complete",
        `Downloaded ${completed} file${completed === 1 ? "" : "s"}.`,
        destination ?? undefined
      );
    } else if (completed === 0) {
      toast.error(`Failed to download ${failed} file${failed === 1 ? "" : "s"}.`, { id: toastId });
      localSyncService.notifyDownload("Download failed", `Failed to download ${failed} file${failed === 1 ? "" : "s"}.`);
    } else {
      toast.warning(`Downloaded ${completed} of ${toDownload.length} files · ${failed} failed`, { id: toastId });
      localSyncService.notifyDownload(
        "Download finished with errors",
        `Downloaded ${completed} of ${toDownload.length} files · ${failed} failed`,
        destination ?? undefined
      );
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to gather assets to download.", { id: toastId });
  }
}
