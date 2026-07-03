import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Lock, Eye, Loader2, RefreshCw } from "lucide-react";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { formatRelativeTime } from "@/utils/formatters";
import { localSyncService } from "@/services/localSync.service";
import { buildAssetRelativePath } from "@/utils/assetPath";
import { useAssetStore } from "@/store";
import type { AssetDetail } from "@/types";

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

const STATUS_META: Record<AssetDetail["status"], { label: string; dotClass: string; textClass: string }> = {
  approved: { label: "Approved", dotClass: "bg-success", textClass: "text-success" },
  pending: { label: "Pending", dotClass: "bg-warning", textClass: "text-warning" },
  "in-review": { label: "In Review", dotClass: "bg-info", textClass: "text-info" },
  rejected: { label: "Rejected", dotClass: "bg-danger", textClass: "text-danger" },
  processing: { label: "Processing", dotClass: "bg-muted-foreground", textClass: "text-muted-foreground" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetInfoPanel({ detail }: { detail: AssetDetail }) {
  const status = STATUS_META[detail.status];
  const projectTree = useAssetStore((s) => s.projectTree);
  const [opening, setOpening] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isTauri = localSyncService.isTauri();
  const previewableUrl = isUrl(detail.thumbnailColor) ? detail.thumbnailColor : null;

  async function handleOpenFile() {
    if (!detail.downloadUrl) {
      toast.error("No file available to open.");
      return;
    }
    if (!isTauri) {
      window.open(detail.downloadUrl, "_blank");
      return;
    }
    if (!detail.batchId) {
      toast.error("This asset isn't linked to a batch, so changes can't be synced back.");
      return;
    }

    setOpening(true);
    try {
      const relativePath = buildAssetRelativePath(projectTree, detail.batchId, detail.filename);
      await localSyncService.openAndSync({
        downloadUrl: detail.downloadUrl,
        relativePath,
        assetId: detail.id,
        batchId: detail.batch,
      });
      toast.success("Opened — saving the file will sync a new version automatically.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file.");
    } finally {
      setOpening(false);
    }
  }

  function handlePreview() {
    if (!previewableUrl) {
      toast.error("No previewable image available for this file.");
      return;
    }
    setPreviewOpen(true);
  }

  const rows = [
    { label: "Filename", value: detail.filename },
    { label: "Format", value: detail.fileType },
    { label: "Size", value: detail.sizeMb >= 1000 ? `${(detail.sizeMb / 1000).toFixed(1)} GB` : `${detail.sizeMb} MB` },
    { label: "SKU", value: detail.sku },
    { label: "Batch", value: detail.batch },
    { label: "ETA", value: formatDateTime(detail.etaAt) },
    { label: "Assigned", value: detail.assignee.name },
    { label: "Modified", value: formatRelativeTime(detail.modifiedAt) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="h-36 w-full overflow-hidden rounded-lg border border-border bg-background">
            <AssetThumbnail color={detail.thumbnailColor} className="size-full" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={`flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs ${status.textClass}`}>
              <span className={`size-1.5 rounded-full ${status.dotClass}`} /> {status.label}
            </span>
            <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-foreground/70">{detail.version}</span>
            {detail.status !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                <CheckCircle className="size-2.5 text-success" /> Checksum OK
              </span>
            )}
            {detail.status !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                <Lock className="size-2.5" /> {detail.locked ? "Locked" : "Unlocked"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenFile}
            disabled={opening || !detail.downloadUrl}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {opening ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {opening ? "Opening…" : "Open File"}
          </button>
          <button
            onClick={handlePreview}
            disabled={!previewableUrl}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye className="size-3" /> Preview
          </button>
        </div>
      </div>

      {previewOpen && previewableUrl && (
        <AssetPreviewModal imageUrl={previewableUrl} filename={detail.filename} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
