import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Lock, Unlock, Eye, Loader2, RefreshCw, Check, X, Pencil, Layers, Undo2 } from "lucide-react";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { AssetVersionCompareModal } from "@/components/assets/AssetVersionCompareModal";
import { EstablishedBadge } from "@/components/assets/EstablishedBadge";
import { formatHhMmSs, parseBackendTimestamp } from "@/utils/formatters";
import { localSyncService, type OpenAssetResult } from "@/services/localSync.service";
import { assetService } from "@/services/asset.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { buildAssetRelativePath } from "@/utils/assetPath";
import { isUrl } from "@/utils/helpers";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { useUser } from "@/hooks/useUser";
import { getStatusMeta } from "@/utils/assetStatus";
import type { Asset, AssetDetail, AssetStatus } from "@/types";

// No explicit locale (undefined) — uses the viewer's own system/browser locale rather than
// hardcoding "en-US", so date/time formatting actually matches "locale base" as requested.
// parseBackendTimestamp corrects for the backend sending naive (no-timezone) timestamps that
// are actually UTC — see its doc comment in utils/formatters.ts.
function formatDateTime(iso: string) {
  return parseBackendTimestamp(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetInfoPanel({ detail, onStatusChange }: { detail: AssetDetail; onStatusChange?: () => void }) {
  // Set immediately on approve/reject/revoke so the badge and buttons flip without waiting on
  // the refetch that follows the write — cleared once `detail` catches up to it (see effect below).
  const [statusOverride, setStatusOverride] = useState<AssetStatus | null>(null);
  const effectiveStatus = statusOverride ?? detail.status;
  const status = getStatusMeta(effectiveStatus, detail.established);
  const projectTree = useAssetStore((s) => s.projectTree);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const assetsRefreshTick = useAssetStore((s) => s.assetsRefreshTick);
  const bumpLocalSyncTick = useAssetStore((s) => s.bumpLocalSyncTick);
  const markAssetSyncing = useAssetStore((s) => s.markAssetSyncing);
  const markAssetSynced = useAssetStore((s) => s.markAssetSynced);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const user = useUser();
  const isQc = user?.role === "qc" || user?.role === "admin";
  const [opening, setOpening] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | "revoke" | null>(null);
  const [localInfo, setLocalInfo] = useState<OpenAssetResult | null>(null);
  const [versions, setVersions] = useState<Asset[] | null>(null);
  const [productionSeconds, setProductionSeconds] = useState<number | null>(null);
  const isTauri = localSyncService.isTauri();
  const previewableUrl = isUrl(detail.thumbnailColor) ? detail.thumbnailColor : null;

  useEffect(() => {
    if (statusOverride !== null && detail.status === statusOverride) setStatusOverride(null);
  }, [detail.status, statusOverride]);

  // Once a local copy exists, opening it again just reopens the same file in the OS default
  // app (no re-download) — surfaced as "Retouch" so it's clear no fresh download is happening.
  const isRetouch = isTauri && localInfo !== null;

  // Tracks the previously-loaded id so the effect below can tell "switched to a different
  // asset" (clear immediately, avoid flashing the old asset's versions) apart from "same asset,
  // background refresh tick" (leave the strip showing its current data until the new data
  // arrives, rather than blanking out on every tick).
  const previousDetailIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (previousDetailIdRef.current !== detail.id) {
      setVersions(null);
    }
    previousDetailIdRef.current = detail.id;
    assetService.getVersions(detail.id).then((data) => {
      if (!cancelled) setVersions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [detail.id, assetsRefreshTick]);

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
    const relativePath = buildAssetRelativePath(projectTree, detail.batchId, detail.filename);
    if (relativePath === null) {
      // Tree hasn't loaded this batch yet — leave localInfo as-is rather than reporting "not
      // synced" against a path that doesn't match what's actually on disk.
      return;
    }
    let cancelled = false;
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

    const relativePath = buildAssetRelativePath(projectTree, detail.batchId, detail.filename);
    if (relativePath === null) {
      toast.error("Project data is still loading — try again in a moment.");
      return;
    }

    setOpening(true);
    try {
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
      bumpLocalSyncTick();
      toast.success("Opened — saving the file will sync a new version automatically.");
      // Silently warms the rest of this batch in the background so opening the next image from
      // it feels instant — only this one asset actually opens/launches an app.
      prefetchBatchSiblings(detail.batchId, detail.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file.");
    } finally {
      setOpening(false);
    }
  }

  // Best-effort: downloads (never opens) every other asset in the same batch, skipping ones
  // already cached locally (download_asset_to_mount reuses an existing file rather than
  // re-fetching it). Silent — a sibling failing to prefetch shouldn't surface as an error for
  // an action the user didn't directly ask for; opening it later just falls back to downloading
  // on demand like today. Each sibling is marked syncing/synced individually (rather than one
  // bump at the very end) so its row's cloud icon animates while its own download is actually
  // in flight, not just at the moment the whole batch finishes.
  async function prefetchBatchSiblings(batchId: string, openedAssetId: string) {
    if (!isTauri) return;
    const siblings = await assetService.listAssets({ projectId: batchId }).catch(() => []);
    const toPrefetch = siblings.filter((a) => a.id !== openedAssetId && a.downloadUrl && a.batchId);
    if (toPrefetch.length === 0) return;
    await Promise.allSettled(
      toPrefetch.map(async (a) => {
        const relativePath = buildAssetRelativePath(projectTree, a.batchId!, a.name);
        if (relativePath === null) return;
        markAssetSyncing(a.id);
        try {
          await localSyncService.downloadToMount(a.downloadUrl!, relativePath, mountPoint);
        } finally {
          markAssetSynced(a.id);
        }
      })
    );
  }

  function handlePreview() {
    if (!previewableUrl) {
      toast.error("No previewable image available for this file.");
      return;
    }
    setPreviewOpen(true);
  }

  async function handleDecision(decision: "approve" | "reject" | "revoke") {
    setDeciding(decision);
    // Flip the badge/buttons right away — the API call and refetches below still run, but the
    // UI doesn't wait on that extra round trip to show the new status.
    const newStatus: AssetStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "draft";
    setStatusOverride(newStatus);
    setVersions((vs) => vs?.map((v) => (v.id === detail.id ? { ...v, status: newStatus } : v)) ?? vs);
    try {
      if (decision === "approve") await assetService.approveAsset(detail.id);
      else if (decision === "reject") await assetService.rejectAsset(detail.id);
      else await assetService.revokeApproval(detail.id);
      toast.success(decision === "approve" ? "Asset approved." : decision === "reject" ? "Asset rejected." : "Approval revoked.");
      assetService.getVersions(detail.id).then(setVersions);
      onStatusChange?.();
    } catch {
      setStatusOverride(null);
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
    { label: "Uploaded", value: formatDateTime(detail.modifiedAt) },
    { label: "Production Time", value: productionSeconds !== null ? formatHhMmSs(productionSeconds) : "—" },
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
            {effectiveStatus !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                <CheckCircle className="size-2.5 text-success" /> Checksum OK
              </span>
            )}
            {effectiveStatus !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                {detail.locked ? <Lock className="size-2.5" /> : <Unlock className="size-2.5" />} {detail.locked ? "Locked" : "Unlocked"}
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
            {effectiveStatus === "approved" ? (
              <button
                onClick={() => handleDecision("revoke")}
                disabled={deciding !== null}
                title="Move this back out of approved, without rejecting it — it re-enters the normal approve/reject flow."
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deciding === "revoke" ? <Loader2 className="size-3 animate-spin" /> : <Undo2 className="size-3" />}
                Revoke
              </button>
            ) : (
              <button
                onClick={() => handleDecision("approve")}
                disabled={deciding !== null || effectiveStatus === "live"}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white shadow-md shadow-success/20 transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deciding === "approve" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Approve
              </button>
            )}
            <button
              onClick={() => handleDecision("reject")}
              disabled={deciding !== null || effectiveStatus === "rejected" || effectiveStatus === "live"}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white shadow-md shadow-danger/20 transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              Reject
            </button>
          </div>
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
