import { useState } from "react";
import { toast } from "sonner";
import { Check, FolderOpen, Loader2, Undo2, X } from "lucide-react";
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
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { SyncStatusIcon } from "@/components/assets/SyncStatusIcon";
import { assetService } from "@/services/asset.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { localSyncService } from "@/services/localSync.service";
import { buildAssetRelativePath } from "@/utils/assetPath";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { useUser } from "@/hooks/useUser";
import type { Asset, AssetStatus } from "@/types";

// Above this many, opening means that many native "open with" windows landing on screen at
// once — worth a confirmation instead of firing blind.
const CONFIRM_THRESHOLD = 5;

export function AssetBulkPanel({ assets, onClear }: { assets: Asset[]; onClear: () => void }) {
  const projectTree = useAssetStore((s) => s.projectTree);
  const storeAssets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);
  const refetchAssets = useAssetStore((s) => s.refetchAssets);
  const bumpLocalSyncTick = useAssetStore((s) => s.bumpLocalSyncTick);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const user = useUser();
  const isQc = user?.role === "qc" || user?.role === "admin";
  const [opening, setOpening] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | "revoke" | null>(null);
  const isTauri = localSyncService.isTauri();
  const allApproved = assets.length > 0 && assets.every((a) => a.status === "approved");
  const allRejected = assets.length > 0 && assets.every((a) => a.status === "rejected");

  // No single bulk-approve endpoint exists on the backend — this mirrors the web app's approach
  // of looping the same per-asset endpoint used by the single-asset flow, tallying successes so
  // partial failures (e.g. one asset already "live") don't block the rest.
  async function handleBulkDecision(decision: "approve" | "reject" | "revoke") {
    setDeciding(decision);
    const newStatus: AssetStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "draft";
    const succeeded: string[] = [];
    for (const asset of assets) {
      try {
        if (decision === "approve") await assetService.approveAsset(asset.id);
        else if (decision === "reject") await assetService.rejectAsset(asset.id);
        else await assetService.revokeApproval(asset.id);
        succeeded.push(asset.id);
      } catch (err) {
        toast.error(err instanceof Error ? `${asset.name}: ${err.message}` : `Failed to ${decision} ${asset.name}.`);
      }
    }
    if (succeeded.length > 0) {
      const succeededSet = new Set(succeeded);
      setAssets(storeAssets.map((a) => (succeededSet.has(a.id) ? { ...a, status: newStatus } : a)));
      const verb = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Revoked approval for";
      toast.success(`${verb} ${succeeded.length} of ${assets.length} file${assets.length === 1 ? "" : "s"}.`);
    }
    setDeciding(null);
    onClear();
    refetchAssets();
  }

  async function openAll() {
    setConfirmOpen(false);
    setOpening(true);
    let failed = 0;
    // Sequential, not parallel — mirrors AssetDownloadDialog: each one is a real file write (or
    // window.open on the web build), and doing them one at a time keeps per-file toasts sane
    // instead of racing, and avoids every OS "open with" window landing at the same instant.
    for (const asset of assets) {
      try {
        if (!asset.downloadUrl) throw new Error("No file available to download.");
        if (!isTauri) {
          window.open(asset.downloadUrl, "_blank");
          assetService.recordDownload(asset.id);
          continue;
        }
        if (!asset.batchId) throw new Error("Not linked to a batch, so it can't be synced back.");
        const relativePath = buildAssetRelativePath(projectTree, asset.batchId, asset.name);
        if (relativePath === null) throw new Error("Project data is still loading — try again in a moment.");
        await localSyncService.openAndSync({
          downloadUrl: asset.downloadUrl,
          relativePath,
          assetId: asset.id,
          batchId: asset.batchId.replace(/^b-/, ""),
          mountRoot: mountPoint,
        });
        assetService.recordDownload(asset.id);
        assetEditSessionService.start(asset.id).catch(() => undefined);
      } catch (err) {
        failed++;
        toast.error(err instanceof Error ? `${asset.name}: ${err.message}` : `Failed to open ${asset.name}.`);
      }
    }
    setOpening(false);
    // Lets every row's SyncStatusIcon re-check the disk once, now that these downloads landed —
    // it only re-checks on this tick (or on asset/mount changes), so without this it'd keep
    // showing "not synced" until something unrelated happened to bump it.
    if (failed < assets.length) bumpLocalSyncTick();
    if (failed === 0) toast.success(`Opened ${assets.length} file${assets.length === 1 ? "" : "s"}.`);
    else if (failed < assets.length) toast.success(`Opened ${assets.length - failed} of ${assets.length} files.`);
  }

  function handleOpenClick() {
    if (assets.length > CONFIRM_THRESHOLD) setConfirmOpen(true);
    else openAll();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-foreground">{assets.length} images selected</p>
              <p className="text-xs text-muted-foreground">Open them all locally, or clear the selection.</p>
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

          <div className="grid grid-cols-4 gap-1.5">
            {assets.slice(0, 16).map((a) => (
              <div key={a.id} className="relative aspect-square overflow-hidden rounded-md border border-border" title={a.name}>
                <AssetThumbnail color={a.thumbnailColor} className="size-full" rounded={false} />
                {isTauri && (
                  <span className="absolute bottom-0.5 right-0.5 flex items-center justify-center rounded-full bg-black/70 p-0.5">
                    <SyncStatusIcon asset={a} className="size-2.5" />
                  </span>
                )}
              </div>
            ))}
          </div>
          {assets.length > 16 && (
            <p className="-mt-2 text-[10px] text-muted-foreground">+{assets.length - 16} more</p>
          )}
        </div>
      </div>

      {isQc && (
        <div className="shrink-0 border-t border-border p-4">
          <div className="grid grid-cols-2 gap-2">
            {allApproved ? (
              <button
                type="button"
                onClick={() => handleBulkDecision("revoke")}
                disabled={deciding !== null}
                title="Move these back out of approved, without rejecting them — they re-enter the normal approve/reject flow."
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deciding === "revoke" ? <Loader2 className="size-3 animate-spin" /> : <Undo2 className="size-3" />}
                Revoke
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleBulkDecision("approve")}
                disabled={deciding !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deciding === "approve" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBulkDecision("reject")}
              disabled={deciding !== null || allRejected}
              title={allRejected ? "Already rejected" : undefined}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              Reject
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border p-4">
        <button
          type="button"
          onClick={handleOpenClick}
          disabled={opening || assets.length === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {opening ? <Loader2 className="size-3 animate-spin" /> : <FolderOpen className="size-3" />}
          {opening ? "Opening…" : `Open Files (${assets.length})`}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open {assets.length} files?</AlertDialogTitle>
            <AlertDialogDescription>
              Each file downloads locally and opens in its default app — that's {assets.length} app windows opening
              at once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={opening}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={opening} onClick={openAll}>
              Open All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
