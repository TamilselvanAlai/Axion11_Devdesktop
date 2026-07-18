import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { useAssetStore } from "@/store";
import type { AssetDetail, LoadingState } from "@/types";

export function useAssetDetail(assetId: string | null) {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");

  const refetch = useCallback(() => {
    if (!assetId) return;
    assetService.getAssetDetail(assetId).then((data) => setDetail(data));
  }, [assetId]);

  useEffect(() => {
    if (!assetId) {
      setDetail(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    assetService.getAssetDetail(assetId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setStatus("success");
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // A locally-edited file that was opened via "Open File" just got auto-uploaded as a new
  // version — switch the panel over to that new version's row instead of refetching the old
  // one (a save always creates a separate row, so refetching the same id would keep showing
  // the pre-edit image/status forever).
  useEffect(() => {
    if (!assetId) return;
    let unlistenComplete: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    localSyncService.onSyncComplete((payload) => {
      if (payload.assetId !== assetId) return;
      toast.success("Synced new version from your local edit");
      if (payload.newAssetId) {
        useAssetStore.getState().selectAsset(payload.newAssetId);
      } else {
        refetch();
      }
    }).then((fn) => { unlistenComplete = fn; });

    localSyncService.onSyncError((payload) => {
      if (payload.assetId !== assetId) return;
      toast.error(`Sync failed: ${payload.error}`);
    }).then((fn) => { unlistenError = fn; });

    return () => {
      unlistenComplete?.();
      unlistenError?.();
    };
  }, [assetId, refetch]);

  return { detail, status, refetch };
}
