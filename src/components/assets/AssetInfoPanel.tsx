import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Lock, Eye, Loader2, RefreshCw, Check, X, Rocket, Pencil, Layers } from "lucide-react";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { AssetVersionCompareModal } from "@/components/assets/AssetVersionCompareModal";
import { EstablishedBadge } from "@/components/assets/EstablishedBadge";
import { formatDuration, formatHhMmSs, formatRelativeTime } from "@/utils/formatters";
import { localSyncService, type OpenAssetResult } from "@/services/localSync.service";
import { assetService } from "@/services/asset.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { buildAssetRelativePath } from "@/utils/assetPath";
import { isUrl } from "@/utils/helpers";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { useUser } from "@/hooks/useUser";
import { getStatusMeta } from "@/utils/assetStatus";
import type { Asset, AssetDetail } from "@/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetInfoPanel({ detail, onStatusChange }: { detail: AssetDetail; onStatusChange?: () => void }) {
  const status = getStatusMeta(detail.status, detail.established);
  const projectTree = useAssetStore((s) => s.projectTree);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const user = useUser();
  const isQc = user?.role === "qc" || user?.role === "admin";
  const [opening, setOpening] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | "publish" | null>(null);
  const [localInfo, setLocalInfo] = useState<OpenAssetResult | null>(null);
  const [versions, setVersions] = useState<Asset[] | null>(null);
  const [productionSeconds, setProductionSeconds] = useState<number | null>(null);
  const isTauri = localSyncService.isTauri();
  const previewableUrl = isUrl(detail.thumbnailColor) ? detail.thumbnailColor : null;
  // Once a local copy exists, opening it again just reopens the same file in the OS default
  // app (no re-download) — surfaced as "Retouch" so it's clear no fresh download is happening.
  const isRetouch = isTauri && localInfo !== null;

  useEffect(() => {
    let cancelled = false;
    setVersions(null);
    assetService.getVersions(detail.id).then((data) => {
      if (!cancelled) setVersions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  // Server-tracked total editing time for this asset, across every user — shown to all users,
  // unlike "Time Spent" below which is a local-only, current-machine timestamp.
  useEffect(() => {
    let cancelled = false;
    setProductionSeconds(null);
    assetEditSessionService.getAssetTotalSeconds(detail.id).then((seconds) => {
      if (!cancelled) setProductionSeconds(seconds);
    }).catch(() => {
      if (!cancelled) setProductionSeconds(0);
    });
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  // Picks up an already-downloaded local copy (and its first-opened timestamp) even when this
  // session isn't what triggered the download, so "Time Spent" shows up on revisit.
  useEffect(() => {
    if (!isTauri || !detail.batchId) {
      setLocalInfo(null);
      return;
    }
    let cancelled = false;
    const relativePath = buildAssetRelativePath(projectTree, detail.batchId, detail.filename, detail.id);
    localSyncService.getLocalAssetInfo({ relativePath, mountRoot: mountPoint }).then((info) => {
      if (!cancelled) setLocalInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [isTauri, detail.batchId, detail.filename, detail.id, projectTree, mountPoint]);

  async function handleOpenFile() {
    if (!detail.downloadUrl) {
      toast.error("No file available to open.");
      return;
    }
    if (!isTauri) {
      window.open(detail.downloadUrl, "_blank");
      assetService.recordDownload(detail.id);
      return;
    }
    if (!detail.batchId) {
      toast.error("This asset isn't linked to a batch, so changes can't be synced back.");
      return;
    }

    setOpening(true);
    try {
      const relativePath = buildAssetRelativePath(projectTree, detail.batchId, detail.filename, detail.id);
      const result = await localSyncService.openAndSync({
        downloadUrl: detail.downloadUrl,
        relativePath,
        assetId: detail.id,
        batchId: detail.batch,
        mountRoot: mountPoint,
      });
      setLocalInfo(result);
      assetService.recordDownload(detail.id);
      assetEditSessionService.start(detail.id).catch(() => undefined);
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

  async function handleDecision(decision: "approve" | "reject" | "publish") {
    setDeciding(decision);
    try {
      if (decision === "approve") await assetService.approveAsset(detail.id);
      else if (decision === "reject") await assetService.rejectAsset(detail.id);
      else await assetService.publishAsset(detail.id);
      toast.success(
        decision === "approve" ? "Asset approved." : decision === "reject" ? "Asset rejected." : "Asset published live."
      );
      assetService.getVersions(detail.id).then(setVersions);
      onStatusChange?.();
    } catch {
      toast.error(`Failed to ${decision} asset.`);
    } finally {
      setDeciding(null);
    }
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
    { label: "Production Time", value: productionSeconds !== null ? formatHhMmSs(productionSeconds) : "—" },
    ...(localInfo ? [{ label: "Time Spent", value: formatDuration(Date.now() - localInfo.openedAt) }] : []),
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
            {detail.established && detail.version !== "VE" && <EstablishedBadge />}
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

          {versions && versions.length > 1 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Versions ({versions.length})
                </span>
                <button
                  type="button"
                  onClick={() => setCompareOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                >
                  <Layers className="size-2.5" /> Review
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectAsset(v.id)}
                    title={v.established && v.version !== "VE" ? `${v.version} · VE` : v.version}
                    className={`relative size-10 shrink-0 overflow-hidden rounded-md ring-2 transition-colors ${
                      v.id === detail.id ? "ring-primary" : "ring-transparent hover:ring-white/20"
                    }`}
                  >
                    <AssetThumbnail color={v.thumbnailColor} className="size-full" rounded={false} />
                    {v.established && (
                      <span className="absolute right-0.5 top-0.5 flex size-2.5 items-center justify-center rounded-full bg-amber-500 text-[7px] font-bold text-black">
                        E
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span
                  title={String(row.value)}
                  className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70"
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenFile}
              disabled={opening || !detail.downloadUrl}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {opening ? (
                <Loader2 className="size-3 animate-spin" />
              ) : isRetouch ? (
                <Pencil className="size-3" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              {opening ? "Opening…" : isRetouch ? "Retouch" : "Open File"}
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
      </div>

      {isQc && (
        <div className="shrink-0 border-t border-border p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDecision("approve")}
              disabled={deciding !== null || detail.status === "approved" || detail.status === "live"}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white shadow-md shadow-success/20 transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === "approve" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Approve
            </button>
            <button
              onClick={() => handleDecision("reject")}
              disabled={deciding !== null || detail.status === "rejected" || detail.status === "live"}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white shadow-md shadow-danger/20 transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              Reject
            </button>
          </div>
          {detail.status === "approved" && (
            <button
              onClick={() => handleDecision("publish")}
              disabled={deciding !== null}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-info px-3 py-2 text-xs font-medium text-white shadow-md shadow-info/20 transition-colors hover:bg-info/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === "publish" ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
              Publish to Live
            </button>
          )}
        </div>
      )}

      {previewOpen && previewableUrl && !compareOpen && (
        <AssetPreviewModal
          imageUrl={previewableUrl}
          filename={detail.filename}
          onClose={() => setPreviewOpen(false)}
          onReview={() => setCompareOpen(true)}
        />
      )}

      {compareOpen && (
        <AssetVersionCompareModal
          assetId={detail.id}
          onClose={() => setCompareOpen(false)}
          onStatusChange={() => {
            onStatusChange?.();
            assetService.getVersions(detail.id).then(setVersions);
          }}
        />
      )}
    </div>
  );
}
