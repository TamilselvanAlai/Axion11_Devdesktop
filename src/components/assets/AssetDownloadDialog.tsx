import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, File as FileIcon } from "lucide-react";
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
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { isUrl } from "@/utils/helpers";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { findAncestorPath, versionFolderName, versionLabel } from "@/utils/assetPath";
import type { Asset } from "@/types";

interface AssetDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: Asset[];
  /** Pre-checked when the dialog opens — typically whichever version was being viewed. */
  defaultSelectedId?: string;
}

export function AssetDownloadDialog({ open, onOpenChange, versions, defaultSelectedId }: AssetDownloadDialogProps) {
  const projectTree = useAssetStore((s) => s.projectTree);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const downloadable = versions.filter((v): v is Asset & { downloadUrl: string } => isUrl(v.downloadUrl ?? ""));
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedId && downloadable.some((v) => v.id === defaultSelectedId) ? [defaultSelectedId] : [])
  );
  const [downloading, setDownloading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDownload() {
    const toDownload = downloadable.filter((v) => selected.has(v.id));
    setDownloading(true);
    let failed = 0;
    // Sequential, not parallel — each one is a real file write (or, on the web build, a
    // window.open), and doing them one at a time keeps per-file success/failure toasts in a
    // sane order instead of racing each other.
    for (const v of toDownload) {
      try {
        // Mirrors the project tree the same way opening a file does (see AssetInfoPanel), plus
        // a Source/Draft/Final subfolder so different versions of the same filename never
        // collide — falls back to just the version folder if the tree hasn't resolved this
        // batch yet, rather than blocking the download entirely.
        const ancestors = (v.batchId && findAncestorPath(projectTree, v.batchId)) || [];
        const relativePath = [...ancestors, versionFolderName(v), v.name].join("/");
        const savedPath = await localSyncService.downloadToMount(v.downloadUrl, relativePath, mountPoint);
        assetService.recordDownload(v.id);
        toast.success(savedPath ? `Saved ${v.name} to ${savedPath}` : `Downloaded ${v.name}`, {
          closeButton: true,
          action: savedPath
            ? { label: <FileIcon className="size-4" />, onClick: () => localSyncService.revealInFileManager(savedPath) }
            : undefined,
        });
      } catch (err) {
        failed++;
        toast.error(err instanceof Error ? err.message : `Failed to download ${versionLabel(v)}.`);
      }
    }
    setDownloading(false);
    if (failed < toDownload.length) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download versions</DialogTitle>
          <DialogDescription>Select which version(s) of this asset to download.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {downloadable.map((v) => (
            <label
              key={v.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-white/5"
            >
              <Checkbox checked={selected.has(v.id)} onCheckedChange={() => toggle(v.id)} />
              <span className="min-w-0 flex-1 truncate">{versionLabel(v)}</span>
              {v.sizeMb > 0 && (
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {v.sizeMb >= 1000 ? `${(v.sizeMb / 1000).toFixed(1)} GB` : `${Math.round(v.sizeMb)} MB`}
                </span>
              )}
            </label>
          ))}
          {downloadable.length === 0 && (
            <p className="text-xs text-muted-foreground">No downloadable versions available.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleDownload} disabled={selected.size === 0 || downloading}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {downloading ? "Downloading…" : `Download${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
