import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { useAssetStore } from "@/store";
import type { AssetScope } from "@/types";

export function useAssets(scope: AssetScope) {
  const { assets, status, setAssets, resetForNavigation, setCurrentScope } = useAssetStore();
  const scopeKey = typeof scope === "string" ? scope : scope.projectId;

  useEffect(() => {
    resetForNavigation();
    setCurrentScope(scope);
    assetService.listAssets(scope).then(setAssets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setAssets, resetForNavigation, setCurrentScope]);

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
