import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { useAssetStore } from "@/store";
import type { AssetScope } from "@/types";

export function useAssets(scope: AssetScope) {
  const { assets, status, setAssets, setStatus } = useAssetStore();
  const scopeKey = typeof scope === "string" ? scope : scope.projectId;

  useEffect(() => {
    setStatus("loading");
    assetService.listAssets(scope).then(setAssets);
  }, [scopeKey, setAssets, setStatus]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    localSyncService.onSyncComplete(() => {
      assetService.listAssets(scope).then(setAssets);
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setAssets]);

  return { assets, status };
}
