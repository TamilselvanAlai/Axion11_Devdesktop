import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";

export function useAssets() {
  const { assets, status, setAssets, setStatus } = useAssetStore();

  useEffect(() => {
    setStatus("loading");
    assetService.listRecent().then(setAssets);
  }, [setAssets, setStatus]);

  return { assets, status };
}
