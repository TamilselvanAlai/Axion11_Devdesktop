import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";
import type { AssetScope } from "@/types";

export function useAssets(scope: AssetScope) {
  const { assets, status, setAssets, setStatus } = useAssetStore();
  const scopeKey = typeof scope === "string" ? scope : scope.projectId;

  useEffect(() => {
    setStatus("loading");
    assetService.listAssets(scope).then(setAssets);
  }, [scopeKey, setAssets, setStatus]);

  return { assets, status };
}
